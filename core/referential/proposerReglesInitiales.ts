import type { RuleTemplate } from './types';

export type PropositionInitiale = {
  thematique: RuleTemplate | null;
  standard: RuleTemplate[];
};

// §3.3 : proposition automatique de 4 règles adaptées à l'âge + 1 règle
// thématique, à partir d'une liste déjà classée par classerParAnnee.
export function proposerReglesInitiales(reglesClassees: RuleTemplate[]): PropositionInitiale {
  const thematique = reglesClassees.find((regle) => regle.isThematicEligible) ?? null;
  const standard = reglesClassees.filter((regle) => regle.id !== thematique?.id).slice(0, 4);

  return { thematique, standard };
}
