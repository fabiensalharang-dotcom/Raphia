import type { EtatRegle } from '../../core/scoring/types';
import { fetchDayEntry } from './dayEntryRepository';
import { supabase } from '../supabaseClient';

export type DisplayRuleState = {
  shortLabel: string;
  icon: string;
  isThematic: boolean;
  etat: EtatRegle;
};

export type DisplayAcquiredRule = {
  shortLabel: string;
  icon: string;
};

export type DisplayWeekDay = {
  date: string;
  thresholdMet: boolean | null; // null = pas de journée enregistrée ce jour-là
};

export type DisplayState = {
  childFirstName: string;
  score: number;
  thresholdApplied: number;
  thresholdMet: boolean;
  rules: DisplayRuleState[];
  acquiredRules: DisplayAcquiredRule[];
  weekStrip: DisplayWeekDay[];
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

// §8.5 : alimente le mode Affichage à partir d'un seul objet sérialisable,
// sans aucune dépendance à l'état de navigation de l'app — cette fonction
// ne suppose rien d'autre que le childId reçu par la route.
export async function fetchDisplayState(childId: string): Promise<DisplayState> {
  const { data: child, error: childError } = await supabase
    .from('child')
    .select('first_name, household_id')
    .eq('id', childId)
    .single();
  if (childError || !child) throw childError ?? new Error('child introuvable');

  const { data: household, error: householdError } = await supabase
    .from('household')
    .select('timezone')
    .eq('id', child.household_id)
    .single();
  if (householdError || !household) throw householdError ?? new Error('household introuvable');

  const aujourdHui = dateDuJourDansFuseau(household.timezone);

  const [dayEntry, acquisesRes, semaineRes] = await Promise.all([
    fetchDayEntry(childId, aujourdHui),
    supabase.from('rule_instance').select('short_label, icon').eq('child_id', childId).eq('status', 'acquired'),
    supabase
      .from('day_entry')
      .select('date, threshold_met')
      .eq('child_id', childId)
      .gte('date', dateDuJourDansFuseau(household.timezone, -6))
      .lte('date', aujourdHui),
  ]);

  if (acquisesRes.error) throw acquisesRes.error;
  if (semaineRes.error) throw semaineRes.error;

  const parDate = new Map((semaineRes.data ?? []).map((j) => [j.date, j.threshold_met]));
  const weekStrip: DisplayWeekDay[] = Array.from({ length: 7 }, (_, i) => {
    const date = dateDuJourDansFuseau(household.timezone, i - 6);
    return { date, thresholdMet: parDate.has(date) ? (parDate.get(date) as boolean) : null };
  });

  return {
    childFirstName: child.first_name,
    score: dayEntry?.pointsTotal ?? 0,
    thresholdApplied: dayEntry?.thresholdApplied ?? 0,
    thresholdMet: dayEntry?.thresholdMet ?? false,
    rules: (dayEntry?.checks ?? []).map((c) => ({
      shortLabel: c.shortLabel,
      icon: c.icon,
      isThematic: c.isThematic,
      etat: c.etat,
    })),
    acquiredRules: (acquisesRes.data ?? []).map((r) => ({ shortLabel: r.short_label, icon: r.icon })),
    weekStrip,
  };
}
