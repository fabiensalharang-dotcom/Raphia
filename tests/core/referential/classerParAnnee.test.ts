import { classerParAnnee } from '../../../core/referential/classerParAnnee';
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

describe('classerParAnnee', () => {
  it('exclut une règle hors de sa tranche d’âge', () => {
    const regles = [regle({ id: 'trop-jeune', ageMin: 3, ageMax: 5 })];
    expect(classerParAnnee(regles, 8)).toEqual([]);
  });

  it('inclut un enfant à la limite exacte de deux tranches', () => {
    const regles = [
      regle({ id: 'borne-basse', ageMin: 8, ageMax: 10 }),
      regle({ id: 'borne-haute', ageMin: 5, ageMax: 8 }),
    ];
    const resultat = classerParAnnee(regles, 8);
    expect(resultat.map((r) => r.id).sort()).toEqual(['borne-basse', 'borne-haute']);
  });

  it('trie par distance au focus_year croissante', () => {
    const regles = [
      regle({ id: 'loin', ageMin: 3, ageMax: 11, focusYear: 3 }),
      regle({ id: 'proche', ageMin: 3, ageMax: 11, focusYear: 7 }),
      regle({ id: 'exact', ageMin: 3, ageMax: 11, focusYear: 8 }),
    ];
    const resultat = classerParAnnee(regles, 8);
    expect(resultat.map((r) => r.id)).toEqual(['exact', 'proche', 'loin']);
  });

  it('à distance égale, départage par difficulté croissante (facile en premier)', () => {
    const regles = [
      regle({ id: 'exigeante', focusYear: 8, difficulty: 'exigeante' }),
      regle({ id: 'facile', focusYear: 8, difficulty: 'facile' }),
      regle({ id: 'moyenne', focusYear: 8, difficulty: 'moyenne' }),
    ];
    const resultat = classerParAnnee(regles, 8);
    expect(resultat.map((r) => r.id)).toEqual(['facile', 'moyenne', 'exigeante']);
  });

  it('exclut les règles déjà actives ou acquises pour cet enfant', () => {
    const regles = [regle({ id: 'deja-active' }), regle({ id: 'nouvelle' })];
    const resultat = classerParAnnee(regles, 8, ['deja-active']);
    expect(resultat.map((r) => r.id)).toEqual(['nouvelle']);
  });

  it('retourne une liste vide si aucune règle ne correspond', () => {
    expect(classerParAnnee([], 8)).toEqual([]);
  });
});
