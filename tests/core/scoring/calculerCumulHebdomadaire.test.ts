import { calculerCumulHebdomadaire } from '../../../core/scoring/calculerCumulHebdomadaire';

describe('calculerCumulHebdomadaire', () => {
  it('semaine complète, seuil hebdomadaire par défaut (5) atteint', () => {
    const jours = [
      { thresholdMet: true, pointsTotal: 8 },
      { thresholdMet: true, pointsTotal: 7 },
      { thresholdMet: true, pointsTotal: 9 },
      { thresholdMet: true, pointsTotal: 6 },
      { thresholdMet: true, pointsTotal: 8 },
      { thresholdMet: false, pointsTotal: 2 },
      { thresholdMet: false, pointsTotal: 3 },
    ];
    expect(calculerCumulHebdomadaire(jours)).toEqual({
      daysThresholdMet: 5,
      weeklyThresholdMet: true,
      pointsTotal: 43,
    });
  });

  it('semaine complète, seuil hebdomadaire non atteint', () => {
    const jours = [
      { thresholdMet: true, pointsTotal: 6 },
      { thresholdMet: true, pointsTotal: 7 },
      { thresholdMet: false, pointsTotal: 1 },
      { thresholdMet: false, pointsTotal: 0 },
      { thresholdMet: false, pointsTotal: 2 },
      { thresholdMet: false, pointsTotal: 1 },
      { thresholdMet: false, pointsTotal: 3 },
    ];
    expect(calculerCumulHebdomadaire(jours)).toEqual({
      daysThresholdMet: 2,
      weeklyThresholdMet: false,
      pointsTotal: 20,
    });
  });

  it('semaine incomplète (moins de 7 jours enregistrés) : compte ce qui existe, ne suppose rien', () => {
    const jours = [
      { thresholdMet: true, pointsTotal: 8 },
      { thresholdMet: true, pointsTotal: 7 },
      { thresholdMet: true, pointsTotal: 9 },
    ];
    expect(calculerCumulHebdomadaire(jours)).toEqual({
      daysThresholdMet: 3,
      weeklyThresholdMet: false,
      pointsTotal: 24,
    });
  });

  it('aucun jour enregistré : cumul à zéro, seuil non atteint', () => {
    expect(calculerCumulHebdomadaire([])).toEqual({
      daysThresholdMet: 0,
      weeklyThresholdMet: false,
      pointsTotal: 0,
    });
  });

  it('changement de seuil en cours de semaine : chaque jour garde son propre threshold_met déjà tranché', () => {
    // Le seuil quotidien a changé en cours de semaine (§5.2) : certains
    // jours ont été calculés avec l'ancien seuil, d'autres avec le
    // nouveau. Cette fonction ne recalcule rien, elle agrège les valeurs
    // déjà figées dans chaque day_entry.
    const jours = [
      { thresholdMet: true, pointsTotal: 5 }, // calculé avec l'ancien seuil (4)
      { thresholdMet: true, pointsTotal: 4 }, // calculé avec l'ancien seuil (4)
      { thresholdMet: false, pointsTotal: 5 }, // calculé avec le nouveau seuil (6), non atteint
      { thresholdMet: true, pointsTotal: 6 }, // calculé avec le nouveau seuil (6), atteint
      { thresholdMet: true, pointsTotal: 7 },
    ];
    expect(calculerCumulHebdomadaire(jours, 4)).toEqual({
      daysThresholdMet: 4,
      weeklyThresholdMet: true,
      pointsTotal: 27,
    });
  });

  it('respecte un seuil hebdomadaire personnalisé', () => {
    const jours = [
      { thresholdMet: true, pointsTotal: 8 },
      { thresholdMet: true, pointsTotal: 9 },
    ];
    expect(calculerCumulHebdomadaire(jours, 2)).toEqual({
      daysThresholdMet: 2,
      weeklyThresholdMet: true,
      pointsTotal: 17,
    });
  });
});
