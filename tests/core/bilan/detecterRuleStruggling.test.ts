import { detecterRuleStruggling } from '../../../core/bilan/detecterRuleStruggling';

describe('detecterRuleStruggling', () => {
  it('se déclenche à exactement 5 jours non respectés sur 7', () => {
    const etats = [
      ...Array(5).fill('not_respected' as const),
      ...Array(2).fill('respected' as const),
    ];
    expect(detecterRuleStruggling(etats)).toBe(true);
  });

  it('ne se déclenche pas à 4 jours non respectés sur 7', () => {
    const etats = [
      ...Array(4).fill('not_respected' as const),
      ...Array(3).fill('respected' as const),
    ];
    expect(detecterRuleStruggling(etats)).toBe(false);
  });

  it('aucun historique : pas de déclenchement', () => {
    expect(detecterRuleStruggling([])).toBe(false);
  });
});
