import { calculerAge, classerParAnnee, type RuleTemplate } from '../../core/referential';
import { selectionnerAvecPriorite, type RewardTier } from '../../core/rewards';
import { calculerSerieEnCours, calculerSeuilPropose, type EtatRegle, type JourDeSerie } from '../../core/scoring';
import {
  detecterChangementAge,
  detecterRegleEnEchec,
  detecterSeuilMalCalibre,
  detecterUsureRecompense,
  evaluerDeclencheurs,
  SERIE_ACQUISE,
  type Declencheur,
  type DonneesDeclencheurs,
  type SuggestionType,
} from '../../core/pilotage';
import { fetchRuleTemplates } from './ruleTemplateRepository';
import { fetchRewardTemplates } from './rewardTemplateRepository';
import { supabase } from '../supabaseClient';

const FENETRE_SERIE = 30; // assez large pour couvrir les 14 jours de §6.2 avec marge
const FENETRE_ECHEC = 14;
const CADENCE_SUGGESTION_JOURS = 7;

function dateDuJourDansFuseau(timezone: string, decalageJours = 0): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const instant = new Date();
  instant.setUTCDate(instant.getUTCDate() + decalageJours);
  return formatter.format(instant);
}

export type SuggestionView = {
  id: string;
  type: SuggestionType;
  payload: Record<string, unknown>;
  createdAt: string;
};

async function marquerSuggestionResolue(suggestionId: string, status: 'accepted' | 'dismissed'): Promise<void> {
  const { error } = await supabase
    .from('pilotage_suggestion')
    .update({ status, resolved_at: new Date().toISOString() })
    .eq('id', suggestionId);
  if (error) throw error;
}

// §6.4, §6.5, §6.6, §7.4 (même convention) : une règle non tenue par
// défaut, ou une case jamais ouverte, n'est jamais comptée en échec par ce
// moteur — on préfère sous-déclencher que fabriquer un signal trompeur à
// partir d'une absence de données.
export async function fetchHistoriqueRegles(
  childId: string,
  timezone: string,
  aujourdHui: string,
  ruleIds: string[],
  nombreJours: number
): Promise<{ dates: string[]; etatsParRegle: Map<string, Map<string, EtatRegle>> }> {
  const dates = Array.from({ length: nombreJours }, (_, i) => dateDuJourDansFuseau(timezone, -i));
  if (ruleIds.length === 0) return { dates, etatsParRegle: new Map() };
  const premierJour = dates[dates.length - 1];

  const { data: dayEntries, error: dayEntriesError } = await supabase
    .from('day_entry')
    .select('id, date')
    .eq('child_id', childId)
    .gte('date', premierJour)
    .lte('date', aujourdHui);
  if (dayEntriesError) throw dayEntriesError;
  if (!dayEntries || dayEntries.length === 0) return { dates, etatsParRegle: new Map() };

  const { data: cochages, error: cochagesError } = await supabase
    .from('rule_check')
    .select('rule_instance_id, state, day_entry_id')
    .in('day_entry_id', dayEntries.map((d) => d.id))
    .in('rule_instance_id', ruleIds);
  if (cochagesError) throw cochagesError;

  const dateParDayEntryId = new Map(dayEntries.map((d) => [d.id, d.date]));
  const etatsParRegle = new Map<string, Map<string, EtatRegle>>();
  for (const cochage of cochages ?? []) {
    const date = dateParDayEntryId.get(cochage.day_entry_id);
    if (!date) continue;
    if (!etatsParRegle.has(cochage.rule_instance_id)) etatsParRegle.set(cochage.rule_instance_id, new Map());
    etatsParRegle.get(cochage.rule_instance_id)!.set(date, cochage.state);
  }
  return { dates, etatsParRegle };
}

async function detecterCandidatRegleAcquise(childId: string, timezone: string, aujourdHui: string) {
  const { data: reglesActives, error } = await supabase
    .from('rule_instance')
    .select('id, label, display_order')
    .eq('child_id', childId)
    .eq('status', 'active')
    .order('display_order');
  if (error) throw error;
  if (!reglesActives || reglesActives.length === 0) return null;

  const { dates, etatsParRegle } = await fetchHistoriqueRegles(
    childId,
    timezone,
    aujourdHui,
    reglesActives.map((r) => r.id),
    FENETRE_SERIE
  );

  for (const regle of reglesActives) {
    const etatsRegle = etatsParRegle.get(regle.id);
    const joursRegle: JourDeSerie[] = dates.map((date) => ({ state: etatsRegle?.get(date) ?? null }));
    if (calculerSerieEnCours(joursRegle) >= SERIE_ACQUISE) {
      return { ruleInstanceId: regle.id, label: regle.label };
    }
  }
  return null;
}

async function detecterCandidatRegleEnEchec(childId: string, timezone: string, aujourdHui: string) {
  const { data: reglesActives, error } = await supabase
    .from('rule_instance')
    .select('id, label, template_id, display_order')
    .eq('child_id', childId)
    .eq('status', 'active')
    .order('display_order');
  if (error) throw error;
  if (!reglesActives || reglesActives.length === 0) return null;

  const { dates, etatsParRegle } = await fetchHistoriqueRegles(
    childId,
    timezone,
    aujourdHui,
    reglesActives.map((r) => r.id),
    FENETRE_ECHEC
  );

  for (const regle of reglesActives) {
    const etatsRegle = etatsParRegle.get(regle.id);
    const etatsRecents = dates
      .map((date) => etatsRegle?.get(date) ?? null)
      .filter((etat): etat is EtatRegle => etat !== null);
    if (detecterRegleEnEchec(etatsRecents)) {
      const splitInto = regle.template_id ? await fetchSplitInto(regle.template_id) : [];
      return { ruleInstanceId: regle.id, label: regle.label, splitInto };
    }
  }
  return null;
}

async function fetchSplitInto(templateId: string): Promise<string[]> {
  const { data, error } = await supabase.from('rule_template').select('split_into').eq('id', templateId).single();
  if (error || !data) return [];
  return data.split_into ?? [];
}

async function detecterCandidatUsureRecompense(childId: string) {
  const { data: attributions, error } = await supabase
    .from('reward_grant')
    .select('reward_instance_id, granted_at')
    .eq('child_id', childId)
    .order('granted_at', { ascending: false })
    .limit(10);
  if (error) throw error;

  const { data: instances, error: instancesError } = await supabase
    .from('reward_instance')
    .select('created_at')
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
    .limit(1);
  if (instancesError) throw instancesError;

  const dernierAjout = instances?.[0]?.created_at;
  const semainesDepuisDernierAjout = dernierAjout
    ? Math.floor((Date.now() - new Date(dernierAjout).getTime()) / (7 * 24 * 60 * 60 * 1000))
    : 0;

  return detecterUsureRecompense(
    (attributions ?? []).map((a) => ({ rewardInstanceId: a.reward_instance_id })),
    semainesDepuisDernierAjout
  );
}

async function detecterCandidatSeuil(childId: string) {
  const { data: semaines, error } = await supabase
    .from('week_summary')
    .select('days_threshold_met')
    .eq('child_id', childId)
    .order('iso_year', { ascending: false })
    .order('iso_week', { ascending: false })
    .limit(3);
  if (error) throw error;
  return detecterSeuilMalCalibre((semaines ?? []).map((s) => ({ daysThresholdMet: s.days_threshold_met })));
}

async function detecterCandidatChangementAge(childId: string, aujourdHui: string) {
  const { data: child, error } = await supabase.from('child').select('birth_date').eq('id', childId).single();
  if (error || !child) return null;
  if (!detecterChangementAge(child.birth_date, aujourdHui)) return null;
  return { age: calculerAge(child.birth_date, new Date(`${aujourdHui}T12:00:00Z`)) };
}

async function collecterDonneesDeclencheurs(
  childId: string,
  timezone: string,
  aujourdHui: string
): Promise<DonneesDeclencheurs> {
  const [regleAcquise, regleEnEchec, recompenseUsee, seuil, changementAge] = await Promise.all([
    detecterCandidatRegleAcquise(childId, timezone, aujourdHui),
    detecterCandidatRegleEnEchec(childId, timezone, aujourdHui),
    detecterCandidatUsureRecompense(childId),
    detecterCandidatSeuil(childId),
    detecterCandidatChangementAge(childId, aujourdHui),
  ]);

  return {
    regleAcquise,
    regleEnEchec,
    recompenseUsee: recompenseUsee.declenche ? { rewardInstanceId: recompenseUsee.rewardInstanceId } : null,
    seuilHaut: seuil === 'haut',
    seuilBas: seuil === 'bas',
    changementAge,
  };
}

// §6.1 : passe quotidienne à la clôture. Ne crée rien si une suggestion a
// déjà été créée pour cet enfant dans les 7 derniers jours, quel que soit
// son statut — la cadence limite le nombre de suggestions, pas seulement
// celles encore en attente.
export async function evaluerEtCreerSuggestion(childId: string, timezone: string): Promise<void> {
  const aujourdHui = dateDuJourDansFuseau(timezone);
  const ilYA7Jours = dateDuJourDansFuseau(timezone, -(CADENCE_SUGGESTION_JOURS - 1));

  const { data: recente, error: recenteError } = await supabase
    .from('pilotage_suggestion')
    .select('id')
    .eq('child_id', childId)
    .gte('created_at', `${ilYA7Jours}T00:00:00Z`)
    .limit(1);
  if (recenteError) throw recenteError;
  if (recente && recente.length > 0) return;

  const donnees = await collecterDonneesDeclencheurs(childId, timezone, aujourdHui);
  const declencheur: Declencheur | null = evaluerDeclencheurs(donnees);
  if (!declencheur) return;

  const { type, ...payload } = declencheur;
  const { error: insertError } = await supabase.from('pilotage_suggestion').insert({ child_id: childId, type, payload });
  if (insertError) throw insertError;
}

export async function fetchSuggestionsEnAttente(childId: string): Promise<SuggestionView[]> {
  const { data, error } = await supabase
    .from('pilotage_suggestion')
    .select('id, type, payload, created_at')
    .eq('child_id', childId)
    .eq('status', 'pending')
    .order('created_at');
  if (error) throw error;
  return (data ?? []).map((s) => ({
    id: s.id,
    type: s.type as SuggestionType,
    payload: (s.payload as Record<string, unknown>) ?? {},
    createdAt: s.created_at,
  }));
}

export async function dismisserSuggestion(suggestionId: string): Promise<void> {
  await marquerSuggestionResolue(suggestionId, 'dismissed');
}

async function fetchIdsTemplatesExclus(childId: string): Promise<string[]> {
  const { data, error } = await supabase.from('rule_instance').select('template_id').eq('child_id', childId);
  if (error) throw error;
  return (data ?? []).map((r) => r.template_id).filter((id): id is string => !!id);
}

export async function fetchCandidatsNouvelleRegle(childId: string, limite: number): Promise<RuleTemplate[]> {
  const { data: child, error } = await supabase.from('child').select('birth_date').eq('id', childId).single();
  if (error || !child) throw error ?? new Error('child introuvable');
  const idsExclus = await fetchIdsTemplatesExclus(childId);
  const templates = await fetchRuleTemplates();
  const age = calculerAge(child.birth_date);
  return classerParAnnee(templates, age, idsExclus).slice(0, limite);
}

// §6.2 : si acceptée, la règle passe acquired, une seule nouvelle règle est
// proposée à sa place (D9), et le seuil est recalculé sur l'ensemble des
// règles actives qui en résultera.
export async function accepterRegleAcquise(suggestionId: string, childId: string, ruleInstanceId: string): Promise<void> {
  const { error: updateError } = await supabase
    .from('rule_instance')
    .update({ status: 'acquired', acquired_at: new Date().toISOString() })
    .eq('id', ruleInstanceId);
  if (updateError) throw updateError;

  const [nouvelleRegle] = await fetchCandidatsNouvelleRegle(childId, 1);

  const { data: reglesRestantes, error: reglesError } = await supabase
    .from('rule_instance')
    .select('points, is_thematic, bonus_value, status')
    .eq('child_id', childId);
  if (reglesError) throw reglesError;

  const actives = (reglesRestantes ?? []).filter((r) => r.status === 'active');
  const pointsActives = actives.filter((r) => !r.is_thematic).map((r) => r.points);
  if (nouvelleRegle) pointsActives.push(nouvelleRegle.defaultPoints);
  const bonusThematique = actives.find((r) => r.is_thematic)?.bonus_value ?? 0;
  const nouveauSeuil = calculerSeuilPropose(pointsActives, bonusThematique);

  if (nouvelleRegle) {
    await inserterNouvelleRegle(childId, nouvelleRegle);
  }
  await appliquerNouveauSeuil(childId, nouveauSeuil);
  await marquerSuggestionResolue(suggestionId, 'accepted');
}

async function inserterNouvelleRegle(childId: string, template: RuleTemplate): Promise<void> {
  const { error } = await supabase.from('rule_instance').insert({
    child_id: childId,
    template_id: template.id,
    label: template.label,
    short_label: template.shortLabel,
    icon: template.icon,
    category: template.category,
    points: template.defaultPoints,
    is_thematic: false,
    status: 'active',
  });
  if (error) throw error;
}

async function appliquerNouveauSeuil(childId: string, dailyThreshold: number): Promise<void> {
  const { data: child, error } = await supabase.from('child').select('settings').eq('id', childId).single();
  if (error || !child) throw error ?? new Error('child introuvable');
  const settings = { ...(child.settings as Record<string, unknown>), dailyThreshold };
  const { error: updateError } = await supabase.from('child').update({ settings }).eq('id', childId);
  if (updateError) throw updateError;
}

// §6.3 : « mettre en pause » réutilise le statut retired existant — le
// modèle de données ne distingue pas une pause d'un retrait définitif, et
// le garde-fou « jamais supprimer » est respecté dans les deux cas.
export async function mettreRegleEnRetrait(suggestionId: string, ruleInstanceId: string): Promise<void> {
  const { error } = await supabase
    .from('rule_instance')
    .update({ status: 'retired', retired_at: new Date().toISOString() })
    .eq('id', ruleInstanceId);
  if (error) throw error;
  await marquerSuggestionResolue(suggestionId, 'accepted');
}

export async function decouperRegleEnEchec(
  suggestionId: string,
  childId: string,
  ruleInstanceId: string,
  templateDecoupeId: string
): Promise<void> {
  const templates = await fetchRuleTemplates();
  const template = templates.find((t) => t.id === templateDecoupeId);
  if (!template) throw new Error('Règle de découpage introuvable');

  const { error: retireError } = await supabase
    .from('rule_instance')
    .update({ status: 'retired', retired_at: new Date().toISOString() })
    .eq('id', ruleInstanceId);
  if (retireError) throw retireError;

  await inserterNouvelleRegle(childId, template);
  await marquerSuggestionResolue(suggestionId, 'accepted');
}

export async function reformulerRegle(
  suggestionId: string,
  ruleInstanceId: string,
  nouveauLabel: string,
  nouveauShortLabel: string
): Promise<void> {
  const { error } = await supabase
    .from('rule_instance')
    .update({ label: nouveauLabel, short_label: nouveauShortLabel })
    .eq('id', ruleInstanceId);
  if (error) throw error;
  await marquerSuggestionResolue(suggestionId, 'accepted');
}

// §6.4, D7 : on ajoute au menu, on ne retire jamais rien.
export async function ajouterRecompensesApresUsure(suggestionId: string, childId: string, tier: RewardTier): Promise<void> {
  const { data: child, error } = await supabase.from('child').select('birth_date').eq('id', childId).single();
  if (error || !child) throw error ?? new Error('child introuvable');

  const { data: dejaAuMenu, error: menuError } = await supabase
    .from('reward_instance')
    .select('template_id')
    .eq('child_id', childId);
  if (menuError) throw menuError;
  const idsExclus = (dejaAuMenu ?? []).map((r) => r.template_id).filter((id): id is string => !!id);

  const templates = await fetchRewardTemplates();
  const age = calculerAge(child.birth_date);
  const candidats = templates.filter((t) => t.tier === tier && t.ageMin <= age && age <= t.ageMax && !idsExclus.includes(t.id));
  const choisies = selectionnerAvecPriorite(candidats, 2);

  if (choisies.length > 0) {
    const { data: existantes, error: existantesError } = await supabase
      .from('reward_instance')
      .select('display_order')
      .eq('child_id', childId)
      .order('display_order', { ascending: false })
      .limit(1);
    if (existantesError) throw existantesError;
    const premierOrdre = (existantes?.[0]?.display_order ?? 0) + 1;

    const { error: insertError } = await supabase.from('reward_instance').insert(
      choisies.map((r, i) => ({
        child_id: childId,
        template_id: r.id,
        label: r.label,
        category: r.category,
        tier: r.tier,
        display_order: premierOrdre + i,
      }))
    );
    if (insertError) throw insertError;
  }

  await marquerSuggestionResolue(suggestionId, 'accepted');
}

// §6.5 : utilisé pour relever (delta positif) ou baisser (delta négatif) le
// seuil quotidien — jamais sous 1 point.
export async function ajusterSeuilQuotidien(suggestionId: string, childId: string, delta: number): Promise<void> {
  const { data: child, error } = await supabase.from('child').select('settings').eq('id', childId).single();
  if (error || !child) throw error ?? new Error('child introuvable');
  const settingsActuels = child.settings as { dailyThreshold: number };
  const nouveauSeuil = Math.max(1, settingsActuels.dailyThreshold + delta);
  const { error: updateError } = await supabase
    .from('child')
    .update({ settings: { ...settingsActuels, dailyThreshold: nouveauSeuil } })
    .eq('id', childId);
  if (updateError) throw updateError;
  await marquerSuggestionResolue(suggestionId, 'accepted');
}

// §6.2 : contrôle ponctuel — si la règle repassée en vérification ce jour-là
// n'est pas tenue, elle repasse active plutôt que de rester acquired à
// tort. dayEntryRepository a déjà exclu ces cochages du score ; ceci ne
// fait que corriger le statut une fois la journée close.
export async function verifierControlesPonctuels(dayEntryId: string): Promise<void> {
  const { data: cochages, error } = await supabase
    .from('rule_check')
    .select('rule_instance_id, state, rule_instance:rule_instance_id (status)')
    .eq('day_entry_id', dayEntryId);
  if (error) throw error;

  const echecs = (cochages ?? []).filter(
    (c) => c.state === 'not_respected' && (c.rule_instance as unknown as { status: string } | null)?.status === 'acquired'
  );

  for (const echec of echecs) {
    const { error: updateError } = await supabase
      .from('rule_instance')
      .update({ status: 'active' })
      .eq('id', echec.rule_instance_id);
    if (updateError) throw updateError;
  }
}

export type RegleActiveOption = { ruleInstanceId: string; label: string };

export async function fetchReglesActives(childId: string): Promise<RegleActiveOption[]> {
  const { data, error } = await supabase
    .from('rule_instance')
    .select('id, label')
    .eq('child_id', childId)
    .eq('status', 'active')
    .order('display_order');
  if (error) throw error;
  return (data ?? []).map((r) => ({ ruleInstanceId: r.id, label: r.label }));
}

export type RecompenseInfo = { label: string; tier: RewardTier };

export async function fetchRecompenseInfo(rewardInstanceId: string): Promise<RecompenseInfo | null> {
  const { data, error } = await supabase
    .from('reward_instance')
    .select('label, tier')
    .eq('id', rewardInstanceId)
    .maybeSingle();
  if (error || !data) return null;
  return { label: data.label, tier: data.tier };
}

// §1.2 : réutilisé à la fois par le pilotage (suggestion à résoudre) et par
// la consultation libre du référentiel depuis les Réglages (pas de
// suggestion à marquer, juste la contrainte des 6 règles actives).
export async function ajouterHabitudeDepuisReferentiel(childId: string, template: RuleTemplate): Promise<boolean> {
  const { data: toutesLesRegles, error } = await supabase.from('rule_instance').select('status').eq('child_id', childId);
  if (error) throw error;
  const actives = (toutesLesRegles ?? []).filter((r) => r.status === 'active');
  if (actives.length >= 6) return false;

  await inserterNouvelleRegle(childId, template);
  return true;
}

export async function ajouterRegleChoisie(suggestionId: string, childId: string, template: RuleTemplate): Promise<boolean> {
  const ok = await ajouterHabitudeDepuisReferentiel(childId, template);
  if (ok) await marquerSuggestionResolue(suggestionId, 'accepted');
  return ok;
}
