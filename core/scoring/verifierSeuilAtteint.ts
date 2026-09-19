export type DefiBloquant = { estBloquant: boolean; estRespecte: boolean };

// §5.2 : le seuil est figé dans day_entry au moment de la création de la
// journée (threshold_applied) — cette fonction ne fait que comparer, elle
// ne décide jamais quelle valeur de seuil utiliser.
//
// Le Défi (règle thématique) reste additif par défaut (ses points comptent
// dans le total comme n'importe quelle règle). Un parent peut le rendre
// « bloquant » dans le référentiel : dans ce cas précis, un Défi non tenu
// empêche la récompense du jour même si le total dépasse le seuil — jamais
// l'inverse (un Défi bloquant tenu ne dispense pas d'atteindre le seuil).
export function verifierSeuilAtteint(
  pointsDuJour: number,
  seuilApplique: number,
  defiBloquant?: DefiBloquant
): boolean {
  if (defiBloquant?.estBloquant && !defiBloquant.estRespecte) return false;
  return pointsDuJour >= seuilApplique;
}
