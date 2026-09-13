import { detecterWeeklyPace } from '../../../core/bilan/detecterWeeklyPace';

describe('detecterWeeklyPace', () => {
  it('vrai à un jour du seuil hebdomadaire', () => {
    expect(detecterWeeklyPace(4, 5)).toBe(true);
  });

  it('faux si déjà au seuil ou au-delà', () => {
    expect(detecterWeeklyPace(5, 5)).toBe(false);
  });

  it('faux à deux jours du seuil', () => {
    expect(detecterWeeklyPace(3, 5)).toBe(false);
  });
});
