import type { EtatRegle } from './types';

export type JourDeSerie = {
  state: EtatRegle | null; // null = aucun cochage ce jour-là (jour absent)
};

// §6.2, §7.2 : série de jours consécutifs où une règle est respectée, la
// plus récente en premier. Un jour not_applicable ne casse pas la série
// (« un dimanche, une règle scolaire n'a pas de sens ») ; un jour absent
// (jamais ouvert) la casse, faute de pouvoir confirmer qu'elle continue.
export function calculerSerieEnCours(joursRegle: JourDeSerie[]): number {
  let serie = 0;
  for (const jour of joursRegle) {
    if (jour.state === 'respected') {
      serie += 1;
      continue;
    }
    if (jour.state === 'not_applicable') continue;
    break;
  }
  return serie;
}
