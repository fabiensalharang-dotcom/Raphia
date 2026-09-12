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
});
