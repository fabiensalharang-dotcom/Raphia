import type { EtatRegle } from '../scoring/types';

// §6.3 : une règle est en échec durable si elle est not_respected sur 10
// des 14 derniers jours. `etatsRecents` doit contenir les 14 derniers jours
// (les jours not_applicable ne comptent jamais comme un échec).
export function detecterRegleEnEchec(etatsRecents: EtatRegle[]): boolean {
  const nonRespectes = etatsRecents.filter((etat) => etat === 'not_respected').length;
  return nonRespectes >= 10;
}
