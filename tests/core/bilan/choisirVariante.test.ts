import { choisirVariante } from '../../../core/bilan/choisirVariante';

describe('choisirVariante', () => {
  it('choisit la variante 0 quand aucun historique n’existe', () => {
    expect(choisirVariante(5, [])).toBe(0);
  });

  it('choisit une variante jamais utilisée plutôt qu’une déjà vue', () => {
    const historique = [{ variant: 0, date: '2026-09-01' }];
    expect(choisirVariante(3, historique)).toBe(1);
  });

  it('choisit la variante la moins récemment utilisée quand toutes ont déjà été vues', () => {
    const historique = [
      { variant: 0, date: '2026-09-10' },
      { variant: 1, date: '2026-09-01' },
      { variant: 2, date: '2026-09-05' },
    ];
    expect(choisirVariante(3, historique)).toBe(1);
  });

  it('tient compte de la date la plus récente d’utilisation pour une même variante', () => {
    const historique = [
      { variant: 0, date: '2026-08-01' },
      { variant: 0, date: '2026-09-10' },
      { variant: 1, date: '2026-09-05' },
    ];
    // variante 0 vue le plus récemment (10/09) malgré une première
    // utilisation ancienne : on doit retenir sa date la plus récente.
    expect(choisirVariante(2, historique)).toBe(1);
  });
});
