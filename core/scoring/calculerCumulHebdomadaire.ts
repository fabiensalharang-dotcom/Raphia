import type { JourSemaine } from './types';

const SEUIL_HEBDOMADAIRE_DEFAUT = 5;

export type CumulHebdomadaire = {
  daysThresholdMet: number;
  weeklyThresholdMet: boolean;
  pointsTotal: number;
};

// §5.3 : chaque jour porte déjà son propre threshold_met et points_total,
// figés au moment voulu avec le seuil en vigueur ce jour-là (§5.2, §6
// changement de seuil en cours de semaine). Cette fonction ne fait
// qu'agréger des valeurs déjà tranchées, elle ne recalcule jamais un jour
// passé — c'est cette agrégation qui est figée dans week_summary (§4.3).
export function calculerCumulHebdomadaire(
  joursSemaine: JourSemaine[],
  seuilHebdomadaire: number = SEUIL_HEBDOMADAIRE_DEFAUT
): CumulHebdomadaire {
  const daysThresholdMet = joursSemaine.filter((jour) => jour.thresholdMet).length;
  const pointsTotal = joursSemaine.reduce((total, jour) => total + jour.pointsTotal, 0);
  return {
    daysThresholdMet,
    weeklyThresholdMet: daysThresholdMet >= seuilHebdomadaire,
    pointsTotal,
  };
}
