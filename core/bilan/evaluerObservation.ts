import type { DonneesObservation, Observation, ObservationType } from './types';

// §7.4 : les détecteurs sont évalués dans l'ordre de priorité du document.
// §7.5-3 : jamais deux soirs de suite le même observation_type — on saute
// un candidat qui matche celui d'hier, sauf `steady` qui reste le filet de
// sécurité final (il n'y a rien en dessous).
export function evaluerObservation(donnees: DonneesObservation, typeHier: ObservationType | null): Observation {
  const candidats: Observation[] = [];
  if (donnees.recovery) candidats.push({ type: 'recovery' });
  if (donnees.firstTime) candidats.push({ type: 'first_time', ...donnees.firstTime });
  if (donnees.streakBuilding) candidats.push({ type: 'streak_building', ...donnees.streakBuilding });
  if (donnees.perfectDay) candidats.push({ type: 'perfect_day' });
  if (donnees.thresholdFirstOfWeek) candidats.push({ type: 'threshold_first_of_week' });
  if (donnees.weeklyPace) candidats.push({ type: 'weekly_pace' });
  if (donnees.closeToThreshold) candidats.push({ type: 'close_to_threshold' });
  if (donnees.ruleStruggling) candidats.push({ type: 'rule_struggling', ...donnees.ruleStruggling });

  for (const candidat of candidats) {
    if (candidat.type !== typeHier) return candidat;
  }
  return { type: 'steady' };
}
