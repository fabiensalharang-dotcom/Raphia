import { calculerSeuilPropose } from '../../../core/scoring/calculerSeuilPropose';

describe('calculerSeuilPropose', () => {
  it("reproduit l'exemple du dossier de conception (§5.4) : 4 règles à 1 point + bonus 2 → seuil 4", () => {
    expect(calculerSeuilPropose([1, 1, 1, 1], 2)).toBe(4);
  });

  it('arrondit au plus proche', () => {
    // max théorique 5 × 0,65 = 3,25 → 3
    expect(calculerSeuilPropose([1, 1, 1], 2)).toBe(3);
  });

  it('aucune règle active : seuil basé uniquement sur le bonus thématique', () => {
    expect(calculerSeuilPropose([], 2)).toBe(1);
  });

  it('aucune règle active et aucun bonus : seuil à zéro', () => {
    expect(calculerSeuilPropose([], 0)).toBe(0);
  });
});
