import { detecterRegleEnEchec } from '../../../core/pilotage/detecterRegleEnEchec';

describe('detecterRegleEnEchec', () => {
  it('se déclenche à exactement 10 jours non respectés sur 14', () => {
    const etats = [
      ...Array(10).fill('not_respected' as const),
      ...Array(4).fill('respected' as const),
    ];
    expect(detecterRegleEnEchec(etats)).toBe(true);
  });

  it('ne se déclenche pas à 9 jours non respectés sur 14', () => {
    const etats = [
      ...Array(9).fill('not_respected' as const),
      ...Array(5).fill('respected' as const),
    ];
    expect(detecterRegleEnEchec(etats)).toBe(false);
  });

  it('les jours not_applicable ne comptent jamais comme un échec', () => {
    const etats = [
      ...Array(10).fill('not_respected' as const),
      ...Array(4).fill('not_applicable' as const),
    ];
    expect(detecterRegleEnEchec(etats)).toBe(true);

    const etatsInsuffisants = [
      ...Array(9).fill('not_respected' as const),
      ...Array(5).fill('not_applicable' as const),
    ];
    expect(detecterRegleEnEchec(etatsInsuffisants)).toBe(false);
  });

  it('aucun historique : pas de déclenchement', () => {
    expect(detecterRegleEnEchec([])).toBe(false);
  });
});
