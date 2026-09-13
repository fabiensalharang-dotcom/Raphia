import { calculerTauxReussiteParRegle } from '../../../core/scoring/calculerTauxReussiteParRegle';

describe('calculerTauxReussiteParRegle', () => {
  it('trie du meilleur au moins bon taux de réussite', () => {
    const cochages = [
      { ruleInstanceId: 'a', label: 'Règle A', state: 'respected' as const },
      { ruleInstanceId: 'a', label: 'Règle A', state: 'respected' as const },
      { ruleInstanceId: 'a', label: 'Règle A', state: 'not_respected' as const },
      { ruleInstanceId: 'b', label: 'Règle B', state: 'respected' as const },
      { ruleInstanceId: 'b', label: 'Règle B', state: 'not_respected' as const },
    ];
    expect(calculerTauxReussiteParRegle(cochages)).toEqual([
      { ruleInstanceId: 'a', label: 'Règle A', tauxReussite: 2 / 3, joursApplicables: 3 },
      { ruleInstanceId: 'b', label: 'Règle B', tauxReussite: 0.5, joursApplicables: 2 },
    ]);
  });

  it('un cochage not_applicable ne compte ni au numérateur ni au dénominateur', () => {
    const cochages = [
      { ruleInstanceId: 'a', label: 'Règle scolaire', state: 'respected' as const },
      { ruleInstanceId: 'a', label: 'Règle scolaire', state: 'not_applicable' as const }, // un dimanche
      { ruleInstanceId: 'a', label: 'Règle scolaire', state: 'not_applicable' as const },
    ];
    expect(calculerTauxReussiteParRegle(cochages)).toEqual([
      { ruleInstanceId: 'a', label: 'Règle scolaire', tauxReussite: 1, joursApplicables: 1 },
    ]);
  });

  it("une règle jamais applicable sur la période n'apparaît pas", () => {
    const cochages = [
      { ruleInstanceId: 'a', label: 'Règle scolaire', state: 'not_applicable' as const },
      { ruleInstanceId: 'a', label: 'Règle scolaire', state: 'not_applicable' as const },
    ];
    expect(calculerTauxReussiteParRegle(cochages)).toEqual([]);
  });

  it('aucun cochage : liste vide', () => {
    expect(calculerTauxReussiteParRegle([])).toEqual([]);
  });

  it('une règle jamais respectée obtient un taux de zéro, sans être exclue', () => {
    const cochages = [
      { ruleInstanceId: 'a', label: 'Règle A', state: 'not_respected' as const },
      { ruleInstanceId: 'a', label: 'Règle A', state: 'not_respected' as const },
    ];
    expect(calculerTauxReussiteParRegle(cochages)).toEqual([
      { ruleInstanceId: 'a', label: 'Règle A', tauxReussite: 0, joursApplicables: 2 },
    ]);
  });
});
