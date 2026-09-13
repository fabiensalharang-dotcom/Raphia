import type { Declencheur, DonneesDeclencheurs } from './types';

// §6.2 : 14 jours consécutifs respectés (les not_applicable n'interrompent
// pas la série — voir calculerSerieEnCours, core/scoring).
export const SERIE_ACQUISE = 14;

// §6.1 : les déclencheurs sont évalués dans l'ordre de présentation du
// document (§6.2 à §6.6) — le dossier ne fixe pas d'ordre explicite,
// celui-ci est le plus naturel à lire. Le premier qui se déclenche fournit
// l'unique suggestion de la semaine (§6.1) ; les autres, même déclenchés,
// sont ignorés ce jour-là.
export function evaluerDeclencheurs(donnees: DonneesDeclencheurs): Declencheur | null {
  if (donnees.regleAcquise) return { type: 'rule_acquired', ...donnees.regleAcquise };
  if (donnees.regleEnEchec) return { type: 'rule_failing', ...donnees.regleEnEchec };
  if (donnees.recompenseUsee) return { type: 'reward_fatigue', ...donnees.recompenseUsee };
  if (donnees.seuilHaut) return { type: 'threshold_high' };
  if (donnees.seuilBas) return { type: 'threshold_low' };
  if (donnees.changementAge) return { type: 'age_change', ...donnees.changementAge };
  return null;
}
