import { proposerReglesInitiales } from '../../../core/referential/proposerReglesInitiales';
import type { RuleTemplate } from '../../../core/referential/types';

function regle(overrides: Partial<RuleTemplate>): RuleTemplate {
  return {
    id: 'id',
    category: 'autonomie',
    label: 'label',
    shortLabel: 'short',
    icon: 'icon',
    ageMin: 3,
    ageMax: 11,
    focusYear: 6,
    isThematicEligible: false,
    defaultPoints: 1,
    difficulty: 'facile',
    splitInto: [],
    ...overrides,
  };
}

describe('proposerReglesInitiales', () => {
  it('choisit la première règle éligible comme thématique et 4 autres en standard', () => {
    const regles = [
      regle({ id: 'a' }),
      regle({ id: 'b', isThematicEligible: true }),
      regle({ id: 'c' }),
      regle({ id: 'd' }),
      regle({ id: 'e' }),
      regle({ id: 'f' }),
    ];
    const { thematique, standard } = proposerReglesInitiales(regles);
    expect(thematique?.id).toBe('b');
    expect(standard.map((r) => r.id)).toEqual(['a', 'c', 'd', 'e']);
  });

  it('ne propose aucune règle thématique si aucune n’est éligible', () => {
    const regles = [regle({ id: 'a' }), regle({ id: 'b' })];
    const { thematique, standard } = proposerReglesInitiales(regles);
    expect(thematique).toBeNull();
    expect(standard.map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('ne plante pas avec moins de 4 règles disponibles (semaine incomplète du référentiel pour cet âge)', () => {
    const regles = [regle({ id: 'a', isThematicEligible: true }), regle({ id: 'b' })];
    const { thematique, standard } = proposerReglesInitiales(regles);
    expect(thematique?.id).toBe('a');
    expect(standard.map((r) => r.id)).toEqual(['b']);
  });

  it('retourne une proposition vide si le référentiel ne couvre pas cet âge', () => {
    const { thematique, standard } = proposerReglesInitiales([]);
    expect(thematique).toBeNull();
    expect(standard).toEqual([]);
  });
});
