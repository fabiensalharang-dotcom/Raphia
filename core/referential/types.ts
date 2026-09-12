export type Difficulty = 'facile' | 'moyenne' | 'exigeante';

export type RuleCategory =
  | 'autonomie'
  | 'securite'
  | 'social'
  | 'scolaire'
  | 'ecrans'
  | 'emotions'
  | 'organisation';

export type RuleTemplate = {
  id: string;
  category: RuleCategory;
  label: string;
  shortLabel: string;
  icon: string;
  ageMin: number;
  ageMax: number;
  focusYear: number;
  isThematicEligible: boolean;
  defaultPoints: number;
  difficulty: Difficulty;
  splitInto: string[];
};
