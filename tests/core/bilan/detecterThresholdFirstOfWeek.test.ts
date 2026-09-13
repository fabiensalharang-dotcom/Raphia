import { detecterThresholdFirstOfWeek } from '../../../core/bilan/detecterThresholdFirstOfWeek';

describe('detecterThresholdFirstOfWeek', () => {
  it('vrai si aucun jour précédent de la semaine n’a atteint le seuil', () => {
    const jours = [{ thresholdMet: false }, { thresholdMet: false }];
    expect(detecterThresholdFirstOfWeek(true, jours)).toBe(true);
  });

  it('vrai si aujourd’hui est le premier jour de la semaine (aucun jour précédent)', () => {
    expect(detecterThresholdFirstOfWeek(true, [])).toBe(true);
  });

  it('faux si un jour précédent avait déjà atteint le seuil', () => {
    const jours = [{ thresholdMet: true }, { thresholdMet: false }];
    expect(detecterThresholdFirstOfWeek(true, jours)).toBe(false);
  });

  it('faux si le seuil du jour n’est pas atteint', () => {
    expect(detecterThresholdFirstOfWeek(false, [{ thresholdMet: false }])).toBe(false);
  });
});
