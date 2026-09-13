export type ObservationType =
  | 'recovery'
  | 'first_time'
  | 'streak_building'
  | 'perfect_day'
  | 'threshold_first_of_week'
  | 'weekly_pace'
  | 'close_to_threshold'
  | 'rule_struggling'
  | 'steady';

export type CandidatRegle = {
  ruleInstanceId: string;
  label: string;
};

export type CandidatSerie = CandidatRegle & {
  days: number;
};

// §7.4 : chaque champ est déjà le résultat d'un détecteur (ou null/false
// s'il ne se déclenche pas), et `ruleStruggling` est déjà passé par les
// filtres du §7.5 (cadence 7 jours, doublon pilotage) — evaluerObservation
// ne fait qu'appliquer la priorité et l'anti-répétition de type.
export type DonneesObservation = {
  recovery: boolean;
  firstTime: CandidatRegle | null;
  streakBuilding: CandidatSerie | null;
  perfectDay: boolean;
  thresholdFirstOfWeek: boolean;
  weeklyPace: boolean;
  closeToThreshold: boolean;
  ruleStruggling: CandidatRegle | null;
};

export type Observation =
  | { type: 'recovery' }
  | ({ type: 'first_time' } & CandidatRegle)
  | ({ type: 'streak_building' } & CandidatSerie)
  | { type: 'perfect_day' }
  | { type: 'threshold_first_of_week' }
  | { type: 'weekly_pace' }
  | { type: 'close_to_threshold' }
  | ({ type: 'rule_struggling' } & CandidatRegle)
  | { type: 'steady' };
