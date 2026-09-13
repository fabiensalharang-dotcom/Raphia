import { detecterRecovery } from '../../../core/bilan/detecterRecovery';

describe('detecterRecovery', () => {
  it('se déclenche après exactement 2 jours consécutifs sans, suivis d’un seuil atteint', () => {
    const joursPrecedents = [{ thresholdMet: false }, { thresholdMet: false }, { thresholdMet: true }];
    expect(detecterRecovery(true, joursPrecedents)).toBe(true);
  });

  it('ne se déclenche pas si le seuil du jour n’est pas atteint', () => {
    const joursPrecedents = [{ thresholdMet: false }, { thresholdMet: false }];
    expect(detecterRecovery(false, joursPrecedents)).toBe(false);
  });

  it('ne se déclenche pas si un seul jour précédent est sous le seuil', () => {
    const joursPrecedents = [{ thresholdMet: false }, { thresholdMet: true }];
    expect(detecterRecovery(true, joursPrecedents)).toBe(false);
  });

  it('ne se déclenche pas avec moins de 2 jours d’historique', () => {
    expect(detecterRecovery(true, [{ thresholdMet: false }])).toBe(false);
    expect(detecterRecovery(true, [])).toBe(false);
  });
});
