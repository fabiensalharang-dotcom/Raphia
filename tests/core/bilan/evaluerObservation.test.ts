import { evaluerObservation } from '../../../core/bilan/evaluerObservation';
import type { DonneesObservation } from '../../../core/bilan/types';

const AUCUN: DonneesObservation = {
  recovery: false,
  firstTime: null,
  streakBuilding: null,
  perfectDay: false,
  thresholdFirstOfWeek: false,
  weeklyPace: false,
  closeToThreshold: false,
  ruleStruggling: null,
};

describe('evaluerObservation', () => {
  it('retombe sur steady si rien ne se déclenche', () => {
    expect(evaluerObservation(AUCUN, null)).toEqual({ type: 'steady' });
  });

  it('recovery prime sur tous les autres', () => {
    const donnees: DonneesObservation = { ...AUCUN, recovery: true, perfectDay: true, closeToThreshold: true };
    expect(evaluerObservation(donnees, null)).toEqual({ type: 'recovery' });
  });

  it('first_time prime sur streak_building et les suivants', () => {
    const donnees: DonneesObservation = {
      ...AUCUN,
      firstTime: { ruleInstanceId: 'r1', label: 'Cartable' },
      streakBuilding: { ruleInstanceId: 'r2', label: 'Devoirs', days: 3 },
    };
    expect(evaluerObservation(donnees, null)).toEqual({ type: 'first_time', ruleInstanceId: 'r1', label: 'Cartable' });
  });

  it('rule_struggling est le dernier candidat avant steady', () => {
    const donnees: DonneesObservation = { ...AUCUN, ruleStruggling: { ruleInstanceId: 'r3', label: 'Chambre' } };
    expect(evaluerObservation(donnees, null)).toEqual({ type: 'rule_struggling', ruleInstanceId: 'r3', label: 'Chambre' });
  });

  it('saute un candidat identique au type d’hier et passe au suivant', () => {
    const donnees: DonneesObservation = { ...AUCUN, perfectDay: true, closeToThreshold: true };
    expect(evaluerObservation(donnees, 'perfect_day')).toEqual({ type: 'close_to_threshold' });
  });

  it('retombe sur steady si le seul candidat déclenché est identique au type d’hier', () => {
    const donnees: DonneesObservation = { ...AUCUN, perfectDay: true };
    expect(evaluerObservation(donnees, 'perfect_day')).toEqual({ type: 'steady' });
  });

  it('steady peut se répéter deux soirs de suite, faute d’alternative', () => {
    expect(evaluerObservation(AUCUN, 'steady')).toEqual({ type: 'steady' });
  });
});
