export type SuggestionType =
  | 'rule_acquired'
  | 'rule_failing'
  | 'reward_fatigue'
  | 'threshold_high'
  | 'threshold_low'
  | 'age_change';

export type CandidatRegleAcquise = {
  ruleInstanceId: string;
  label: string;
};

export type CandidatRegleEnEchec = {
  ruleInstanceId: string;
  label: string;
  splitInto: string[];
};

export type CandidatRecompenseUsee = {
  rewardInstanceId: string | null; // null = déclenché par l'absence d'ajout depuis 8 semaines, pas une récompense précise
};

export type CandidatChangementAge = {
  age: number;
};

export type DonneesDeclencheurs = {
  regleAcquise: CandidatRegleAcquise | null;
  regleEnEchec: CandidatRegleEnEchec | null;
  recompenseUsee: CandidatRecompenseUsee | null;
  seuilHaut: boolean;
  seuilBas: boolean;
  changementAge: CandidatChangementAge | null;
};

export type Declencheur =
  | ({ type: 'rule_acquired' } & CandidatRegleAcquise)
  | ({ type: 'rule_failing' } & CandidatRegleEnEchec)
  | ({ type: 'reward_fatigue' } & CandidatRecompenseUsee)
  | { type: 'threshold_high' }
  | { type: 'threshold_low' }
  | ({ type: 'age_change' } & CandidatChangementAge);
