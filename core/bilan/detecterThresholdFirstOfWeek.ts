// §7.4 : premier seuil atteint de la semaine. `joursPrecedentsSemaine` :
// les jours de la semaine en cours avant aujourd'hui (vide si aujourd'hui
// est le premier jour de la semaine — alors vacuously vrai).
export function detecterThresholdFirstOfWeek(
  seuilAtteintAujourdhui: boolean,
  joursPrecedentsSemaine: { thresholdMet: boolean }[]
): boolean {
  if (!seuilAtteintAujourdhui) return false;
  return joursPrecedentsSemaine.every((jour) => !jour.thresholdMet);
}
