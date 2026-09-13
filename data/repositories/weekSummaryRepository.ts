import { calculerCumulHebdomadaire } from '../../core/scoring';
import type { JourSemaine } from '../../core/scoring/types';
import { datesDeLaSemaine } from '../../core/scoring/datesDeLaSemaine';
import { semaineIso } from '../../core/scoring/semaineIso';
import { supabase } from '../supabaseClient';
import { fetchDayEntriesForDates } from './dayEntryRepository';

export type WeekSummaryView = {
  id: string;
  isoYear: number;
  isoWeek: number;
  pointsTotal: number;
  daysThresholdMet: number;
  weeklyThresholdApplied: number;
  weeklyThresholdMet: boolean;
};

const CONTRAINTE_UNICITE_VIOLEE = '23505';

export async function fetchWeekSummary(
  childId: string,
  isoYear: number,
  isoWeek: number
): Promise<WeekSummaryView | null> {
  const { data, error } = await supabase
    .from('week_summary')
    .select('id, points_total, days_threshold_met, weekly_threshold_applied, weekly_threshold_met')
    .eq('child_id', childId)
    .eq('iso_year', isoYear)
    .eq('iso_week', isoWeek)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    isoYear,
    isoWeek,
    pointsTotal: data.points_total,
    daysThresholdMet: data.days_threshold_met,
    weeklyThresholdApplied: data.weekly_threshold_applied,
    weeklyThresholdMet: data.weekly_threshold_met,
  };
}

// §4.3, garde-fou #6 : le résumé n'est calculé qu'une seule fois, à la
// clôture du dernier jour de la semaine, puis figé pour toujours — un
// second appel pour la même semaine (jour rouvert puis reclos) renvoie le
// résumé déjà existant sans jamais le recalculer.
export async function creerResumeSiAbsent(
  childId: string,
  dateDernierJour: string,
  weekStartDay: number,
  weeklyThresholdApplied: number
): Promise<WeekSummaryView> {
  const { isoYear, isoWeek } = semaineIso(dateDernierJour);

  const existant = await fetchWeekSummary(childId, isoYear, isoWeek);
  if (existant) return existant;

  const dates = datesDeLaSemaine(dateDernierJour, weekStartDay);
  const jours = await fetchDayEntriesForDates(childId, dates);
  const joursSemaine: JourSemaine[] = jours.map((j) => ({
    thresholdMet: j.thresholdMet,
    pointsTotal: j.pointsTotal,
  }));
  const cumul = calculerCumulHebdomadaire(joursSemaine, weeklyThresholdApplied);

  const { data, error } = await supabase
    .from('week_summary')
    .insert({
      child_id: childId,
      iso_year: isoYear,
      iso_week: isoWeek,
      points_total: cumul.pointsTotal,
      days_threshold_met: cumul.daysThresholdMet,
      weekly_threshold_applied: weeklyThresholdApplied,
      weekly_threshold_met: cumul.weeklyThresholdMet,
    })
    .select('id')
    .single();

  if (error) {
    // Deux fermetures concurrentes de la même semaine : celle qui perd la
    // course lit le résumé que l'autre vient de figer plutôt que d'échouer.
    if (error.code === CONTRAINTE_UNICITE_VIOLEE) {
      const gagnant = await fetchWeekSummary(childId, isoYear, isoWeek);
      if (gagnant) return gagnant;
    }
    throw error;
  }

  return {
    id: data.id,
    isoYear,
    isoWeek,
    pointsTotal: cumul.pointsTotal,
    daysThresholdMet: cumul.daysThresholdMet,
    weeklyThresholdApplied,
    weeklyThresholdMet: cumul.weeklyThresholdMet,
  };
}
