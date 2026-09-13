// §7.4 : seuil atteint aujourd'hui après au moins 2 jours consécutifs sans.
// `joursPrecedents` : les jours juste avant aujourd'hui, le plus récent en
// premier (joursPrecedents[0] = hier).
export function detecterRecovery(seuilAtteintAujourdhui: boolean, joursPrecedents: { thresholdMet: boolean }[]): boolean {
  if (!seuilAtteintAujourdhui) return false;
  if (joursPrecedents.length < 2) return false;
  return !joursPrecedents[0].thresholdMet && !joursPrecedents[1].thresholdMet;
}
