import type { EtatRegle } from '../scoring/types';

// §7.4 : une règle tenue pour la première fois depuis son ajout.
export function detecterFirstTime(etatAujourdhui: EtatRegle, dejaRespecteeAvant: boolean): boolean {
  return etatAujourdhui === 'respected' && !dejaRespecteeAvant;
}
