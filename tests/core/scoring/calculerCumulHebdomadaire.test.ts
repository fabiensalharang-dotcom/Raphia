import { calculerCumulHebdomadaire } from '../../../core/scoring/calculerCumulHebdomadaire';

describe('calculerCumulHebdomadaire', () => {
  it('semaine complète, seuil hebdomadaire par défaut (5) atteint', () => {
    const jours = [
      { thresholdMet: true },
      { thresholdMet: true },
      { thresholdMet: true },
      { thresholdMet: true },
      { thresholdMet: true },
      { thresholdMet: false },
      { thresholdMet: false },
    ];
    expect(calculerCumulHebdomadaire(jours)).toEqual({ daysThresholdMet: 5, weeklyThresholdMet: true });
  });

  it('semaine complète, seuil hebdomadaire non atteint', () => {
    const jours = [
      { thresholdMet: true },
      { thresholdMet: true },
      { thresholdMet: false },
      { thresholdMet: false },
      { thresholdMet: false },
      { thresholdMet: false },
      { thresholdMet: false },
    ];
    expect(calculerCumulHebdomadaire(jours)).toEqual({ daysThresholdMet: 2, weeklyThresholdMet: false });
  });

  it('semaine incomplète (moins de 7 jours enregistrés) : compte ce qui existe, ne suppose rien', () => {
    const jours = [{ thresholdMet: true }, { thresholdMet: true }, { thresholdMet: true }];
    expect(calculerCumulHebdomadaire(jours)).toEqual({ daysThresholdMet: 3, weeklyThresholdMet: false });
  });

  it('aucun jour enregistré : cumul à zéro, seuil non atteint', () => {
    expect(calculerCumulHebdomadaire([])).toEqual({ daysThresholdMet: 0, weeklyThresholdMet: false });
  });

  it('changement de seuil en cours de semaine : chaque jour garde son propre threshold_met déjà tranché', () => {
    // Le seuil quotidien a changé en cours de semaine (§5.2) : certains
    // jours ont été calculés avec l'ancien seuil, d'autres avec le
    // nouveau. Cette fonction ne recalcule rien, elle agrège les booléens
    // déjà figés dans chaque day_entry.
    const jours = [
      { thresholdMet: true }, // calculé avec l'ancien seuil (4)
      { thresholdMet: true }, // calculé avec l'ancien seuil (4)
      { thresholdMet: false }, // calculé avec le nouveau seuil (6), non atteint
      { thresholdMet: true }, // calculé avec le nouveau seuil (6), atteint
      { thresholdMet: true },
    ];
    expect(calculerCumulHebdomadaire(jours, 4)).toEqual({ daysThresholdMet: 4, weeklyThresholdMet: true });
  });

  it('respecte un seuil hebdomadaire personnalisé', () => {
    const jours = [{ thresholdMet: true }, { thresholdMet: true }];
    expect(calculerCumulHebdomadaire(jours, 2)).toEqual({ daysThresholdMet: 2, weeklyThresholdMet: true });
  });
});
