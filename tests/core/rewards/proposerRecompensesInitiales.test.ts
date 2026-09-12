import { proposerRecompensesInitiales } from '../../../core/rewards/proposerRecompensesInitiales';
import type { RewardTemplate } from '../../../core/rewards/types';

function recompense(overrides: Partial<RewardTemplate>): RewardTemplate {
  return {
    id: 'id',
    label: 'label',
    category: 'materielle',
    tier: 'daily',
    ageMin: 3,
    ageMax: 11,
    requiresParentTime: false,
    ...overrides,
  };
}

describe('proposerRecompensesInitiales', () => {
  it('propose au moins 3 récompenses relationnelle/temps sur les 5 quotidiennes', () => {
    const candidats = [
      recompense({ id: 'r1', category: 'relationnelle' }),
      recompense({ id: 'r2', category: 'temps' }),
      recompense({ id: 'r3', category: 'relationnelle' }),
      recompense({ id: 'p1', category: 'privilege' }),
      recompense({ id: 'm1', category: 'materielle' }),
      recompense({ id: 'm2', category: 'materielle' }),
    ];
    const { quotidiennes } = proposerRecompensesInitiales(candidats, []);
    expect(quotidiennes).toHaveLength(5);
    const prioritaires = quotidiennes.filter((r) => r.category === 'relationnelle' || r.category === 'temps');
    expect(prioritaires.length).toBeGreaterThanOrEqual(3);
  });

  it('les matérielles ne sont jamais majoritaires quand des alternatives existent', () => {
    const candidats = [
      recompense({ id: 'r1', category: 'relationnelle' }),
      recompense({ id: 'r2', category: 'temps' }),
      recompense({ id: 'r3', category: 'relationnelle' }),
      recompense({ id: 'p1', category: 'privilege' }),
      recompense({ id: 'm1', category: 'materielle' }),
    ];
    const { quotidiennes } = proposerRecompensesInitiales(candidats, []);
    const materielles = quotidiennes.filter((r) => r.category === 'materielle');
    expect(materielles.length).toBeLessThan(3);
  });

  it('ne plante pas avec moins de 3 récompenses prioritaires disponibles', () => {
    const candidats = [
      recompense({ id: 'r1', category: 'relationnelle' }),
      recompense({ id: 'p1', category: 'privilege' }),
      recompense({ id: 'm1', category: 'materielle' }),
    ];
    const { quotidiennes } = proposerRecompensesInitiales(candidats, []);
    expect(quotidiennes).toHaveLength(3);
    expect(quotidiennes.map((r) => r.id)).toEqual(['r1', 'p1', 'm1']);
  });

  it('sélectionne 2 récompenses hebdomadaires avec la même priorité', () => {
    const candidats = [
      recompense({ id: 'p1', category: 'privilege' }),
      recompense({ id: 'r1', category: 'relationnelle' }),
      recompense({ id: 'r2', category: 'temps' }),
    ];
    const { hebdomadaires } = proposerRecompensesInitiales([], candidats);
    expect(hebdomadaires.map((r) => r.id).sort()).toEqual(['r1', 'r2']);
  });

  it('retourne des listes vides si aucun candidat ne correspond à l’âge', () => {
    const { quotidiennes, hebdomadaires } = proposerRecompensesInitiales([], []);
    expect(quotidiennes).toEqual([]);
    expect(hebdomadaires).toEqual([]);
  });
});
