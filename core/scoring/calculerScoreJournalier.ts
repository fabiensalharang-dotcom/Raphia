import type { PointageRegle } from './types';

// §5.1 : le score ne peut structurellement jamais diminuer. Une règle non
// tenue ne retire rien, elle n'ajoute pas. La règle thématique ne compte
// que via bonus_value si elle est respectée — jamais ses propres points.
// Les règles acquired/retired ne comptent pas dans le score (§5.1, §6.2)
// mais restent affichées ailleurs dans l'app.
export function calculerScoreJournalier(pointages: PointageRegle[]): number {
  return pointages.reduce((total, pointage) => {
    if (pointage.status !== 'active') return total;
    if (pointage.etat !== 'respected') return total;
    if (pointage.isThematic) return total + pointage.bonusValue;
    return total + pointage.points;
  }, 0);
}
