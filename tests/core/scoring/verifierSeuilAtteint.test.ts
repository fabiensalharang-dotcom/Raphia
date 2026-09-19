import { verifierSeuilAtteint } from '../../../core/scoring/verifierSeuilAtteint';

describe('verifierSeuilAtteint', () => {
  it('le seuil est atteint quand les points sont strictement supérieurs', () => {
    expect(verifierSeuilAtteint(5, 4)).toBe(true);
  });

  it('le seuil est atteint quand les points sont exactement égaux', () => {
    expect(verifierSeuilAtteint(4, 4)).toBe(true);
  });

  it("le seuil n'est pas atteint en dessous", () => {
    expect(verifierSeuilAtteint(3, 4)).toBe(false);
  });

  it('journée sans aucun cochage : 0 point n’atteint jamais un seuil positif', () => {
    expect(verifierSeuilAtteint(0, 1)).toBe(false);
  });

  it('sans Défi bloquant configuré, le seuil reste purement additif', () => {
    expect(verifierSeuilAtteint(5, 4, { estBloquant: false, estRespecte: false })).toBe(true);
  });

  it('Défi bloquant non tenu : pas de seuil atteint même si le total dépasse', () => {
    expect(verifierSeuilAtteint(10, 4, { estBloquant: true, estRespecte: false })).toBe(false);
  });

  it('Défi bloquant tenu : le seuil redevient une simple comparaison de points', () => {
    expect(verifierSeuilAtteint(4, 4, { estBloquant: true, estRespecte: true })).toBe(true);
  });

  it('Défi bloquant tenu mais total sous le seuil : toujours pas atteint', () => {
    expect(verifierSeuilAtteint(2, 4, { estBloquant: true, estRespecte: true })).toBe(false);
  });
});
