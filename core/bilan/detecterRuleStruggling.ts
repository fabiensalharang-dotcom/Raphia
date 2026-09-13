import type { EtatRegle } from '../scoring/types';

// §7.4 : une règle non tenue sur au moins 5 des 7 derniers jours
// applicables. `etatsRecents` : les jours applicables uniquement (les
// not_applicable ont déjà été exclus par l'appelant), le plus récent
// n'a pas besoin d'ordre particulier ici, seul le compte importe.
export function detecterRuleStruggling(etatsRecents: EtatRegle[]): boolean {
  const nonRespectes = etatsRecents.filter((etat) => etat === 'not_respected').length;
  return nonRespectes >= 5;
}
