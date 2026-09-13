import { calculerSeuilsAtteintsParSemaine } from '../../../core/scoring/calculerSeuilsAtteintsParSemaine';

describe('calculerSeuilsAtteintsParSemaine', () => {
  it('regroupe les jours par semaine ISO et compte les seuils atteints', () => {
    const jours = [
      { date: '2026-09-07', thresholdMet: true }, // semaine 37
      { date: '2026-09-08', thresholdMet: true },
      { date: '2026-09-09', thresholdMet: false },
      { date: '2026-09-14', thresholdMet: true }, // semaine 38
      { date: '2026-09-15', thresholdMet: false },
    ];
    expect(calculerSeuilsAtteintsParSemaine(jours)).toEqual([
      { isoYear: 2026, isoWeek: 37, daysThresholdMet: 2 },
      { isoYear: 2026, isoWeek: 38, daysThresholdMet: 1 },
    ]);
  });

  it('une semaine à cheval sur deux années regroupe correctement', () => {
    const jours = [
      { date: '2020-12-31', thresholdMet: true }, // semaine 53 de 2020
      { date: '2021-01-01', thresholdMet: true }, // aussi semaine 53 de 2020 (ISO)
      { date: '2021-01-04', thresholdMet: false }, // semaine 1 de 2021
    ];
    expect(calculerSeuilsAtteintsParSemaine(jours)).toEqual([
      { isoYear: 2020, isoWeek: 53, daysThresholdMet: 2 },
      { isoYear: 2021, isoWeek: 1, daysThresholdMet: 0 },
    ]);
  });

  it('aucun jour : liste vide', () => {
    expect(calculerSeuilsAtteintsParSemaine([])).toEqual([]);
  });

  it('résultat trié chronologiquement même si les jours arrivent dans le désordre', () => {
    const jours = [
      { date: '2026-09-14', thresholdMet: true },
      { date: '2026-09-07', thresholdMet: true },
    ];
    expect(calculerSeuilsAtteintsParSemaine(jours)).toEqual([
      { isoYear: 2026, isoWeek: 37, daysThresholdMet: 1 },
      { isoYear: 2026, isoWeek: 38, daysThresholdMet: 1 },
    ]);
  });
});
