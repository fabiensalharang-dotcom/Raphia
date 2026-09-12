import type { RewardTemplate } from './types';

export type PropositionRecompenses = {
  quotidiennes: RewardTemplate[];
  hebdomadaires: RewardTemplate[];
};

function estPrioritaire(recompense: RewardTemplate): boolean {
  return recompense.category === 'relationnelle' || recompense.category === 'temps';
}

// §4.2 : au moins 3 récompenses relationnelle/temps sur les 5 quotidiennes
// proposées à la création — les récompenses matérielles ne doivent jamais
// être majoritaires. On applique la même priorité aux 2 hebdomadaires,
// cohérent avec D7 sans être exigé par un chiffre précis.
function selectionnerAvecPriorite(candidats: RewardTemplate[], n: number): RewardTemplate[] {
  const prioritaires = candidats.filter(estPrioritaire);
  const autres = candidats.filter((c) => !estPrioritaire(c));
  const minPrioritaires = Math.min(3, prioritaires.length, n);
  const choisis = prioritaires.slice(0, minPrioritaires);
  const reste = [...prioritaires.slice(minPrioritaires), ...autres];
  return [...choisis, ...reste].slice(0, n);
}

// §3.3 : 5 récompenses quotidiennes + 2 hebdomadaires proposées à la
// création. Les listes reçues sont déjà filtrées par âge par l'appelant.
export function proposerRecompensesInitiales(
  candidatsJour: RewardTemplate[],
  candidatsSemaine: RewardTemplate[]
): PropositionRecompenses {
  return {
    quotidiennes: selectionnerAvecPriorite(candidatsJour, 5),
    hebdomadaires: selectionnerAvecPriorite(candidatsSemaine, 2),
  };
}
