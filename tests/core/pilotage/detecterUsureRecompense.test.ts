import { detecterUsureRecompense } from '../../../core/pilotage/detecterUsureRecompense';

describe('detecterUsureRecompense', () => {
  it('se déclenche quand une même récompense est attribuée 8 fois sur les 10 dernières', () => {
    const attributions = [
      ...Array(8).fill({ rewardInstanceId: 'ecran' }),
      { rewardInstanceId: 'histoire' },
      { rewardInstanceId: 'calin' },
    ];
    expect(detecterUsureRecompense(attributions, 0)).toEqual({ declenche: true, rewardInstanceId: 'ecran' });
  });

  it('ne se déclenche pas à 7 fois sur 10', () => {
    const attributions = [
      ...Array(7).fill({ rewardInstanceId: 'ecran' }),
      { rewardInstanceId: 'histoire' },
      { rewardInstanceId: 'calin' },
      { rewardInstanceId: 'parc' },
    ];
    expect(detecterUsureRecompense(attributions, 0)).toEqual({ declenche: false });
  });

  it('se déclenche après 8 semaines sans ajout au menu, sans récompense précise', () => {
    expect(detecterUsureRecompense([], 8)).toEqual({ declenche: true, rewardInstanceId: null });
  });

  it('ne se déclenche pas avant 8 semaines sans ajout', () => {
    expect(detecterUsureRecompense([], 7)).toEqual({ declenche: false });
  });

  it('la répétition prime si les deux conditions sont réunies', () => {
    const attributions = Array(8).fill({ rewardInstanceId: 'ecran' });
    expect(detecterUsureRecompense(attributions, 9)).toEqual({ declenche: true, rewardInstanceId: 'ecran' });
  });
});
