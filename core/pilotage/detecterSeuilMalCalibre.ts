export type NiveauSeuil = 'haut' | 'bas' | null;

// §6.5 : seuil mal calibré sur 3 semaines pleines.
// - haut : seuil atteint 7 jours sur 7 chaque semaine → l'enfant ne
//   progresse plus.
// - bas : seuil atteint moins de 2 fois par semaine chaque semaine →
//   risque de décrochage.
// Une semaine incomplète (historique trop court) ne permet pas de trancher.
export function detecterSeuilMalCalibre(troisDernieresSemaines: { daysThresholdMet: number }[]): NiveauSeuil {
  if (troisDernieresSemaines.length < 3) return null;

  if (troisDernieresSemaines.every((semaine) => semaine.daysThresholdMet === 7)) return 'haut';
  if (troisDernieresSemaines.every((semaine) => semaine.daysThresholdMet < 2)) return 'bas';
  return null;
}
