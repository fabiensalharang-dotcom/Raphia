import { evaluerDeclencheurs } from '../../../core/pilotage/evaluerDeclencheurs';
import type { DonneesDeclencheurs } from '../../../core/pilotage/types';

const AUCUN: DonneesDeclencheurs = {
  regleAcquise: null,
  regleEnEchec: null,
  recompenseUsee: null,
  seuilHaut: false,
  seuilBas: false,
  changementAge: null,
};

describe('evaluerDeclencheurs', () => {
  it('aucun déclencheur : pas de suggestion', () => {
    expect(evaluerDeclencheurs(AUCUN)).toBeNull();
  });

  it('rule_acquired prime sur tous les autres', () => {
    const donnees: DonneesDeclencheurs = {
      ...AUCUN,
      regleAcquise: { ruleInstanceId: 'r1', label: 'Cartable' },
      regleEnEchec: { ruleInstanceId: 'r2', label: 'Chambre', splitInto: [] },
      seuilHaut: true,
    };
    expect(evaluerDeclencheurs(donnees)).toEqual({ type: 'rule_acquired', ruleInstanceId: 'r1', label: 'Cartable' });
  });

  it('rule_failing prime sur reward_fatigue et le seuil', () => {
    const donnees: DonneesDeclencheurs = {
      ...AUCUN,
      regleEnEchec: { ruleInstanceId: 'r2', label: 'Chambre', splitInto: ['x'] },
      recompenseUsee: { rewardInstanceId: 'ecran' },
      seuilBas: true,
    };
    expect(evaluerDeclencheurs(donnees)).toEqual({
      type: 'rule_failing',
      ruleInstanceId: 'r2',
      label: 'Chambre',
      splitInto: ['x'],
    });
  });

  it('reward_fatigue prime sur le seuil et le changement d’âge', () => {
    const donnees: DonneesDeclencheurs = {
      ...AUCUN,
      recompenseUsee: { rewardInstanceId: null },
      seuilHaut: true,
      changementAge: { age: 8 },
    };
    expect(evaluerDeclencheurs(donnees)).toEqual({ type: 'reward_fatigue', rewardInstanceId: null });
  });

  it('threshold_high prime sur threshold_low et changement d’âge', () => {
    const donnees: DonneesDeclencheurs = { ...AUCUN, seuilHaut: true, seuilBas: true, changementAge: { age: 8 } };
    expect(evaluerDeclencheurs(donnees)).toEqual({ type: 'threshold_high' });
  });

  it('threshold_low prime sur le changement d’âge', () => {
    const donnees: DonneesDeclencheurs = { ...AUCUN, seuilBas: true, changementAge: { age: 8 } };
    expect(evaluerDeclencheurs(donnees)).toEqual({ type: 'threshold_low' });
  });

  it('age_change en dernier recours', () => {
    const donnees: DonneesDeclencheurs = { ...AUCUN, changementAge: { age: 8 } };
    expect(evaluerDeclencheurs(donnees)).toEqual({ type: 'age_change', age: 8 });
  });
});
