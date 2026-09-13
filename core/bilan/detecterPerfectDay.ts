import type { EtatRegle, StatutRegle } from '../scoring/types';

// §7.4 : toutes les règles applicables tenues. Une journée sans aucune
// règle applicable (tout en not_applicable) n'est pas une journée parfaite
// — il n'y a rien à célébrer, juste rien à cocher.
export function detecterPerfectDay(checks: { etat: EtatRegle; status: StatutRegle }[]): boolean {
  const applicables = checks.filter((c) => c.status === 'active' && c.etat !== 'not_applicable');
  if (applicables.length === 0) return false;
  return applicables.every((c) => c.etat === 'respected');
}
