import * as Notifications from 'expo-notifications';

import { strings } from '../i18n/fr-FR';
import { supabase } from './supabaseClient';

// §8.7 : notifications locales uniquement, aucune infrastructure push.
// Le contenu ne doit jamais dévoiler de prénom, de score ou de nom de
// règle — l'écran verrouillé est public (garde-fou #19).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// §7.10, §8.7 : ne jamais demander l'autorisation à l'installation
// (garde-fou #20) — seulement une fois le tout premier rituel du soir
// complet, une fois la valeur démontrée. « Premier » s'entend au niveau
// du foyer : un deuxième enfant ne redemande rien.
export async function demanderAutorisationSiPremierRituel(childId: string): Promise<void> {
  const { data: child, error: childError } = await supabase.from('child').select('household_id').eq('id', childId).single();
  if (childError || !child) return;

  const { data: enfants, error: enfantsError } = await supabase.from('child').select('id').eq('household_id', child.household_id);
  if (enfantsError || !enfants || enfants.length === 0) return;

  const { count, error: countError } = await supabase
    .from('day_entry')
    .select('id', { count: 'exact', head: true })
    .in('child_id', enfants.map((e) => e.id))
    .eq('is_closed', true);
  if (countError || count !== 1) return;

  await Notifications.requestPermissionsAsync();
}

// §8.7, cas limite : si digest_time est déjà passé, aucune notification —
// le parent est déjà dans l'application, le bilan y est disponible.
export async function programmerNotificationBilan(digestTime: string): Promise<void> {
  const permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') return;

  const [heures, minutes] = digestTime.split(':').map(Number);
  const maintenant = new Date();
  const cible = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate(), heures, minutes, 0, 0);
  if (cible.getTime() <= maintenant.getTime()) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: strings['bilan.notification.title'],
      body: strings['bilan.notification.body'],
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: cible },
  });
}

// §8.7, garde-fou #16 : jamais de relance conditionnée à une journée non
// clôturée. Ce rappel est donc volontairement inconditionnel — même
// message, même heure, pour tous les foyers, qu'ils aient déjà clôturé
// ou non. Identifiant stable pour ne jamais en accumuler plusieurs.
export async function programmerRappelRituelQuotidien(digestTime: string): Promise<void> {
  const permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') return;

  const [heures, minutes] = digestTime.split(':').map(Number);

  await Notifications.scheduleNotificationAsync({
    identifier: 'rappel-rituel-quotidien',
    content: {
      title: strings['bilan.reminderNotification.title'],
      body: strings['bilan.reminderNotification.body'],
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: heures, minute: minutes },
  });
}

export async function programmerNotificationBilanHebdomadaire(digestTime: string): Promise<void> {
  const permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') return;

  const [heures, minutes] = digestTime.split(':').map(Number);
  const maintenant = new Date();
  const cible = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate(), heures, minutes, 0, 0);
  if (cible.getTime() <= maintenant.getTime()) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: strings['bilan.weeklyNotification.title'],
      body: strings['bilan.weeklyNotification.body'],
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: cible },
  });
}

// §6.6, §8.7 : notification d'anniversaire, programmée à l'avance et
// répétée chaque année (identifiant stable pour ne jamais en accumuler
// plusieurs pour le même enfant).
export async function programmerNotificationAnniversaire(childId: string, birthDate: string): Promise<void> {
  const permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') return;

  const naissance = new Date(`${birthDate}T00:00:00Z`);
  await Notifications.scheduleNotificationAsync({
    identifier: `birthday-${childId}`,
    content: {
      title: strings['bilan.birthdayNotification.title'],
      body: strings['bilan.birthdayNotification.body'],
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.YEARLY,
      day: naissance.getUTCDate(),
      month: naissance.getUTCMonth(),
      hour: 9,
      minute: 0,
    },
  });
}
