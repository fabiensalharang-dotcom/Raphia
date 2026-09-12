import type { JourSemaine } from './types';

const SEUIL_HEBDOMADAIRE_DEFAUT = 5;

export type CumulHebdomadaire = {
  daysThresholdMet: number;
  weeklyThresholdMet: boolean;
};

// §5.3 : chaque jour porte déjà son propre threshold_met, calculé au
// moment voulu avec le seuil en vigueur ce jour-là (§5.2, §6 changement de
// seuil en cours de semaine). Cette fonction ne fait qu'agréger des
// booléens déjà tranchés, elle ne recalcule jamais un jour passé.
export function calculerCumulHebdomadaire(
  joursSemaine: JourSemaine[],
  seuilHebdomadaire: number = SEUIL_HEBDOMADAIRE_DEFAUT
): CumulHebdomadaire {
  const daysThresholdMet = joursSemaine.filter((jour) => jour.thresholdMet).length;
  return {
    daysThresholdMet,
    weeklyThresholdMet: daysThresholdMet >= seuilHebdomadaire,
  };
}
