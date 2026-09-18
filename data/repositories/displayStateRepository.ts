import { calculerSerieEnCours, estDernierJourDeLaSemaine, type EtatRegle, type JourDeSerie } from '../../core/scoring';
import type { RuleCategory } from '../../core/referential/types';
import type { AccentColorKey } from '../../theme/accentPalette';
import { fetchDayEntry } from './dayEntryRepository';
import { fetchAvailableRewards, fetchGrantForDayEntry, type GrantedReward, type RewardInstanceOption } from './rewardGrantRepository';
import { creerResumeSiAbsent } from './weekSummaryRepository';
import { supabase } from '../supabaseClient';

export type DisplayRuleState = {
  shortLabel: string;
  icon: string;
  category: RuleCategory;
  isThematic: boolean;
  etat: EtatRegle;
  points: number;
  bonusValue: number;
};

export type DisplayAcquiredRule = {
  shortLabel: string;
  icon: string;
};

export type DisplayWeekDay = {
  date: string;
  thresholdMet: boolean | null; // null = pas de journée enregistrée ce jour-là
};

export type DisplayStreak = {
  shortLabel: string;
  icon: string;
  days: number;
};

export type DisplayRewardState = {
  grant: GrantedReward | null;
  options: RewardInstanceOption[];
};

export type DisplayWeeklyRewardState = DisplayRewardState & {
  weekSummaryId: string;
};

export type DisplayState = {
  childFirstName: string;
  themeColor: AccentColorKey | null;
  dayEntryId: string;
  score: number;
  thresholdApplied: number;
  thresholdMet: boolean;
  rules: DisplayRuleState[];
  acquiredRules: DisplayAcquiredRule[];
  weekStrip: DisplayWeekDay[];
  streak: DisplayStreak | null;
  dailyReward: DisplayRewardState;
  weeklyReward: DisplayWeeklyRewardState | null;
};

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

// §6.2, §7.2 : la série affichée en badge ne considère que les règles
// actives — une règle déjà acquise ou retirée n'a plus de série à montrer
// ici, ce sujet appartient au moteur de pilotage (hors périmètre, L10).
async function chargerSerieBadge(
  childId: string,
  timezone: string,
  aujourdHui: string,
  reglesActives: { id: string; short_label: string; icon: string }[]
): Promise<DisplayStreak | null> {
  if (reglesActives.length === 0) return null;

  const FENETRE_JOURS = 30;
  const dates = Array.from({ length: FENETRE_JOURS }, (_, i) => dateDuJourDansFuseau(timezone, -i));
  const premierJour = dates[dates.length - 1];

  const { data: jours, error: joursError } = await supabase
    .from('day_entry')
    .select('id, date')
    .eq('child_id', childId)
    .gte('date', premierJour)
    .lte('date', aujourdHui);
  if (joursError) throw joursError;
  if (!jours || jours.length === 0) return null;

  const { data: cochages, error: cochagesError } = await supabase
    .from('rule_check')
    .select('rule_instance_id, state, day_entry_id')
    .in('day_entry_id', jours.map((j) => j.id))
    .in('rule_instance_id', reglesActives.map((r) => r.id));
  if (cochagesError) throw cochagesError;

  const dateParDayEntryId = new Map(jours.map((j) => [j.id, j.date]));
  const etatParCle = new Map<string, EtatRegle>();
  for (const cochage of cochages ?? []) {
    const date = dateParDayEntryId.get(cochage.day_entry_id);
    if (!date) continue;
    etatParCle.set(`${date}|${cochage.rule_instance_id}`, cochage.state);
  }

  let meilleure: DisplayStreak | null = null;
  for (const regle of reglesActives) {
    const joursRegle: JourDeSerie[] = dates.map((date) => ({
      state: etatParCle.get(`${date}|${regle.id}`) ?? null,
    }));
    const serie = calculerSerieEnCours(joursRegle);
    if (serie >= 3 && (!meilleure || serie > meilleure.days)) {
      meilleure = { shortLabel: regle.short_label, icon: regle.icon, days: serie };
    }
  }
  return meilleure;
}

async function chargerRecompenseJour(
  childId: string,
  dayEntryId: string | null,
  thresholdMet: boolean
): Promise<DisplayRewardState> {
  if (!dayEntryId || !thresholdMet) return { grant: null, options: [] };
  const grant = await fetchGrantForDayEntry(dayEntryId, 'daily');
  if (grant) return { grant, options: [] };
  const options = await fetchAvailableRewards(childId, 'daily');
  return { grant: null, options };
}

async function chargerRecompenseSemaine(
  childId: string,
  dayEntryId: string | null,
  date: string | null,
  isClosed: boolean,
  weekStartDay: number,
  weeklyThreshold: number
): Promise<DisplayWeeklyRewardState | null> {
  if (!dayEntryId || !date || !isClosed) return null;
  if (!estDernierJourDeLaSemaine(date, weekStartDay)) return null;

  const resume = await creerResumeSiAbsent(childId, date, weekStartDay, weeklyThreshold);
  if (!resume.weeklyThresholdMet) return null;

  const grant = await fetchGrantForDayEntry(dayEntryId, 'weekly');
  if (grant) return { grant, options: [], weekSummaryId: resume.id };
  const options = await fetchAvailableRewards(childId, 'weekly');
  return { grant: null, options, weekSummaryId: resume.id };
}

// §8.5 : alimente le mode Affichage à partir d'un seul objet sérialisable,
// sans aucune dépendance à l'état de navigation de l'app — cette fonction
// ne suppose rien d'autre que le childId reçu par la route.
export async function fetchDisplayState(childId: string): Promise<DisplayState> {
  const { data: child, error: childError } = await supabase
    .from('child')
    .select('first_name, household_id, settings')
    .eq('id', childId)
    .single();
  if (childError || !child) throw childError ?? new Error('child introuvable');

  const { data: household, error: householdError } = await supabase
    .from('household')
    .select('timezone, week_start_day')
    .eq('id', child.household_id)
    .single();
  if (householdError || !household) throw householdError ?? new Error('household introuvable');

  const aujourdHui = dateDuJourDansFuseau(household.timezone);

  const [dayEntry, acquisesRes, semaineRes, reglesActivesRes] = await Promise.all([
    fetchDayEntry(childId, aujourdHui),
    supabase.from('rule_instance').select('short_label, icon').eq('child_id', childId).eq('status', 'acquired'),
    supabase
      .from('day_entry')
      .select('date, threshold_met')
      .eq('child_id', childId)
      .gte('date', dateDuJourDansFuseau(household.timezone, -6))
      .lte('date', aujourdHui),
    supabase.from('rule_instance').select('id, short_label, icon').eq('child_id', childId).eq('status', 'active'),
  ]);

  if (acquisesRes.error) throw acquisesRes.error;
  if (semaineRes.error) throw semaineRes.error;
  if (reglesActivesRes.error) throw reglesActivesRes.error;

  const parDate = new Map((semaineRes.data ?? []).map((j) => [j.date, j.threshold_met]));
  const weekStrip: DisplayWeekDay[] = Array.from({ length: 7 }, (_, i) => {
    const date = dateDuJourDansFuseau(household.timezone, i - 6);
    return { date, thresholdMet: parDate.has(date) ? (parDate.get(date) as boolean) : null };
  });

  const weeklyThreshold = (child.settings as { weeklyThreshold?: number })?.weeklyThreshold ?? 5;

  const [streak, dailyReward, weeklyReward] = await Promise.all([
    chargerSerieBadge(childId, household.timezone, aujourdHui, reglesActivesRes.data ?? []),
    chargerRecompenseJour(childId, dayEntry?.dayEntryId ?? null, dayEntry?.thresholdMet ?? false),
    chargerRecompenseSemaine(
      childId,
      dayEntry?.dayEntryId ?? null,
      dayEntry?.date ?? null,
      dayEntry?.isClosed ?? false,
      household.week_start_day,
      weeklyThreshold
    ),
  ]);

  return {
    childFirstName: child.first_name,
    themeColor: (child.settings as { themeColor?: AccentColorKey } | null)?.themeColor ?? null,
    dayEntryId: dayEntry?.dayEntryId ?? '',
    score: dayEntry?.pointsTotal ?? 0,
    thresholdApplied: dayEntry?.thresholdApplied ?? 0,
    thresholdMet: dayEntry?.thresholdMet ?? false,
    rules: (dayEntry?.checks ?? []).map((c) => ({
      shortLabel: c.shortLabel,
      icon: c.icon,
      category: c.category,
      isThematic: c.isThematic,
      etat: c.etat,
      points: c.points,
      bonusValue: c.bonusValue,
    })),
    acquiredRules: (acquisesRes.data ?? []).map((r) => ({ shortLabel: r.short_label, icon: r.icon })),
    weekStrip,
    streak,
    dailyReward,
    weeklyReward,
  };
}
