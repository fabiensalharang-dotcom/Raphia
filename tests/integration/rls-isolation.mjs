// Test d'isolation RLS entre deux foyers (§1.3 demarrage-developpement.md,
// §8.3 conception). Crée deux comptes/foyers de test sur le projet Supabase
// distant, vérifie qu'aucun ne peut lire ni écrire les données de l'autre,
// puis nettoie tout — y compris en cas d'échec (bloc finally).
//
// Nécessite SUPABASE_SERVICE_ROLE_KEY en variable d'environnement locale
// (jamais préfixée EXPO_PUBLIC_ : elle ne doit jamais finir dans le bundle
// de l'application). Exécution : npm run test:rls

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  console.error(
    'Variables manquantes : EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY'
  );
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey);

const suffix = Date.now();
const testUsers = [
  { label: 'A', email: `rls-test-a-${suffix}@example.com`, password: 'Test-RLS-Isolation-1!' },
  { label: 'B', email: `rls-test-b-${suffix}@example.com`, password: 'Test-RLS-Isolation-2!' },
];

const created = { userIds: [], householdIds: [] };

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Échec : ${message}`);
  }
}

async function signInAsClient(email, password) {
  const anonymousClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await anonymousClient.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const accessToken = data.session.access_token;

  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  return { client, userId: data.user.id };
}

async function setupHousehold(client, label) {
  // create_household (0006) crée household + caregiver owner ensemble :
  // impossible de créer les deux séparément depuis le client, la policy
  // household_select ne peut pas être satisfaite avant que le caregiver existe.
  const { data: household, error: householdError } = await client.rpc('create_household', {
    p_name: `Foyer test ${label}`,
    p_timezone: 'Europe/Paris',
    p_display_name: `Parent test ${label}`,
  });
  if (householdError) throw householdError;
  created.householdIds.push(household.id);

  const { data: child, error: childError } = await client
    .from('child')
    .insert({ household_id: household.id, first_name: `Enfant ${label}`, birth_date: '2018-01-01' })
    .select()
    .single();
  if (childError) throw childError;

  return { householdId: household.id, childId: child.id };
}

async function run() {
  for (const user of testUsers) {
    const { data, error } = await admin.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
    });
    if (error) throw error;
    created.userIds.push(data.user.id);
    user.id = data.user.id;
  }

  const [sessionA, sessionB] = await Promise.all(
    testUsers.map((u) => signInAsClient(u.email, u.password))
  );

  const foyerA = await setupHousehold(sessionA.client, 'A');
  const foyerB = await setupHousehold(sessionB.client, 'B');

  // Cas positif : chacun voit bien son propre foyer.
  const { data: ownHousehold } = await sessionA.client
    .from('household')
    .select()
    .eq('id', foyerA.householdId);
  assert(ownHousehold?.length === 1, "le compte A ne voit pas son propre foyer");

  // Cas négatif : A ne doit rien voir du foyer B, sur aucune table.
  const { data: crossHousehold } = await sessionA.client
    .from('household')
    .select()
    .eq('id', foyerB.householdId);
  assert(crossHousehold?.length === 0, 'le compte A voit le household du foyer B');

  const { data: crossCaregiver } = await sessionA.client
    .from('caregiver')
    .select()
    .eq('household_id', foyerB.householdId);
  assert(crossCaregiver?.length === 0, 'le compte A voit le caregiver du foyer B');

  const { data: crossChild } = await sessionA.client
    .from('child')
    .select()
    .eq('household_id', foyerB.householdId);
  assert(crossChild?.length === 0, 'le compte A voit le child du foyer B');

  // Cas négatif actif : A ne doit pas pouvoir écrire dans le foyer B.
  const { error: crossInsertError } = await sessionA.client
    .from('child')
    .insert({ household_id: foyerB.householdId, first_name: 'Intrus', birth_date: '2020-01-01' });
  assert(crossInsertError !== null, "l'insertion croisée dans le foyer B aurait dû être refusée");

  console.log('Isolation RLS vérifiée : le foyer A ne voit et ne peut écrire aucune donnée du foyer B.');
}

async function cleanup() {
  for (const householdId of created.householdIds) {
    await admin.from('household').delete().eq('id', householdId);
  }
  for (const userId of created.userIds) {
    await admin.auth.admin.deleteUser(userId);
  }
}

run()
  .then(() => cleanup())
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error(error);
    await cleanup();
    process.exit(1);
  });
