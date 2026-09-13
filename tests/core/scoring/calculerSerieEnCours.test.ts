import { calculerSerieEnCours } from '../../../core/scoring/calculerSerieEnCours';

describe('calculerSerieEnCours', () => {
  it('compte les jours respectés consécutifs depuis le plus récent', () => {
    const jours = [
      { state: 'respected' as const },
      { state: 'respected' as const },
      { state: 'respected' as const },
      { state: 'not_respected' as const },
    ];
    expect(calculerSerieEnCours(jours)).toBe(3);
  });

  it("un jour not_applicable ne casse pas la série mais ne l'allonge pas non plus", () => {
    const jours = [
      { state: 'respected' as const },
      { state: 'not_applicable' as const }, // un dimanche
      { state: 'respected' as const },
      { state: 'not_respected' as const },
    ];
    expect(calculerSerieEnCours(jours)).toBe(2);
  });

  it('un jour absent (jamais ouvert) casse la série', () => {
    const jours = [{ state: 'respected' as const }, { state: null }, { state: 'respected' as const }];
    expect(calculerSerieEnCours(jours)).toBe(1);
  });

  it('un jour non respecté en tête donne une série à zéro', () => {
    const jours = [{ state: 'not_respected' as const }, { state: 'respected' as const }];
    expect(calculerSerieEnCours(jours)).toBe(0);
  });

  it('aucun jour : série à zéro', () => {
    expect(calculerSerieEnCours([])).toBe(0);
  });

  it('tous les jours respectés sur la fenêtre fournie', () => {
    const jours = Array.from({ length: 5 }, () => ({ state: 'respected' as const }));
    expect(calculerSerieEnCours(jours)).toBe(5);
  });
});
