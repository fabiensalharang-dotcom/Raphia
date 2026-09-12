import { calculerScoreJournalier } from '../../../core/scoring/calculerScoreJournalier';
import type { PointageRegle } from '../../../core/scoring/types';

function pointage(overrides: Partial<PointageRegle>): PointageRegle {
  return {
    ruleInstanceId: 'id',
    points: 1,
    isThematic: false,
    bonusValue: 2,
    status: 'active',
    etat: 'respected',
    ...overrides,
  };
}

describe('calculerScoreJournalier', () => {
  it('journée sans aucun cochage : le score est 0', () => {
    expect(calculerScoreJournalier([])).toBe(0);
  });

  it('additionne les points des règles non thématiques respectées', () => {
    const pointages = [
      pointage({ ruleInstanceId: 'a', points: 1 }),
      pointage({ ruleInstanceId: 'b', points: 1 }),
    ];
    expect(calculerScoreJournalier(pointages)).toBe(2);
  });

  it('une règle non tenue n’ajoute rien (jamais de point négatif)', () => {
    const pointages = [
      pointage({ ruleInstanceId: 'a', points: 1, etat: 'respected' }),
      pointage({ ruleInstanceId: 'b', points: 5, etat: 'not_respected' }),
    ];
    expect(calculerScoreJournalier(pointages)).toBe(1);
  });

  it('règle non applicable : ne compte ni positivement ni négativement', () => {
    const pointages = [
      pointage({ ruleInstanceId: 'a', points: 1, etat: 'respected' }),
      pointage({ ruleInstanceId: 'b', points: 3, etat: 'not_applicable' }),
    ];
    expect(calculerScoreJournalier(pointages)).toBe(1);
  });

  it('règle thématique respectée : ajoute le bonus, pas ses propres points', () => {
    const pointages = [pointage({ isThematic: true, points: 1, bonusValue: 2, etat: 'respected' })];
    expect(calculerScoreJournalier(pointages)).toBe(2);
  });

  it('règle thématique non tenue : n’ajoute ni bonus ni points', () => {
    const pointages = [pointage({ isThematic: true, points: 1, bonusValue: 2, etat: 'not_respected' })];
    expect(calculerScoreJournalier(pointages)).toBe(0);
  });

  it('une règle acquired ne compte pas dans le score, même respectée', () => {
    const pointages = [pointage({ status: 'acquired', points: 5, etat: 'respected' })];
    expect(calculerScoreJournalier(pointages)).toBe(0);
  });

  it('une règle retired ne compte pas dans le score', () => {
    const pointages = [pointage({ status: 'retired', points: 5, etat: 'respected' })];
    expect(calculerScoreJournalier(pointages)).toBe(0);
  });

  it('combine plusieurs règles actives, une thématique et une acquired', () => {
    const pointages = [
      pointage({ ruleInstanceId: 'a', points: 1, etat: 'respected' }),
      pointage({ ruleInstanceId: 'b', points: 1, etat: 'not_respected' }),
      pointage({ ruleInstanceId: 'c', isThematic: true, points: 1, bonusValue: 2, etat: 'respected' }),
      pointage({ ruleInstanceId: 'd', status: 'acquired', points: 10, etat: 'respected' }),
    ];
    expect(calculerScoreJournalier(pointages)).toBe(3);
  });
});
