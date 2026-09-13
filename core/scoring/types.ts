export type EtatRegle = 'respected' | 'not_respected' | 'not_applicable';

export type StatutRegle = 'active' | 'acquired' | 'retired';

export type PointageRegle = {
  ruleInstanceId: string;
  points: number;
  isThematic: boolean;
  bonusValue: number;
  status: StatutRegle;
  etat: EtatRegle;
};

export type JourSemaine = {
  thresholdMet: boolean;
  pointsTotal: number;
};
