// §5.2 : le seuil est figé dans day_entry au moment de la création de la
// journée (threshold_applied) — cette fonction ne fait que comparer, elle
// ne décide jamais quelle valeur de seuil utiliser.
export function verifierSeuilAtteint(pointsDuJour: number, seuilApplique: number): boolean {
  return pointsDuJour >= seuilApplique;
}
