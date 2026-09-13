import { detecterPerfectDay } from '../../../core/bilan/detecterPerfectDay';

describe('detecterPerfectDay', () => {
  it('vrai si toutes les règles actives et applicables sont respectées', () => {
    const checks = [
      { etat: 'respected' as const, status: 'active' as const },
      { etat: 'respected' as const, status: 'active' as const },
      { etat: 'not_applicable' as const, status: 'active' as const },
    ];
    expect(detecterPerfectDay(checks)).toBe(true);
  });

  it('faux si une règle applicable n’est pas respectée', () => {
    const checks = [
      { etat: 'respected' as const, status: 'active' as const },
      { etat: 'not_respected' as const, status: 'active' as const },
    ];
    expect(detecterPerfectDay(checks)).toBe(false);
  });

  it('ignore les règles acquises ou retirées', () => {
    const checks = [
      { etat: 'respected' as const, status: 'active' as const },
      { etat: 'not_respected' as const, status: 'acquired' as const },
    ];
    expect(detecterPerfectDay(checks)).toBe(true);
  });

  it('faux si aucune règle n’est applicable', () => {
    const checks = [{ etat: 'not_applicable' as const, status: 'active' as const }];
    expect(detecterPerfectDay(checks)).toBe(false);
  });

  it('faux si aucune règle du tout', () => {
    expect(detecterPerfectDay([])).toBe(false);
  });
});
