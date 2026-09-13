import { detecterCloseToThreshold } from '../../../core/bilan/detecterCloseToThreshold';

describe('detecterCloseToThreshold', () => {
  it('vrai à un point du seuil', () => {
    expect(detecterCloseToThreshold(4, 5)).toBe(true);
  });

  it('faux si le seuil est déjà atteint', () => {
    expect(detecterCloseToThreshold(5, 5)).toBe(false);
  });

  it('faux à deux points du seuil', () => {
    expect(detecterCloseToThreshold(3, 5)).toBe(false);
  });
});
