import { calculerAge } from '../../../core/referential/calculerAge';

describe('calculerAge', () => {
  it("calcule l'âge simple", () => {
    expect(calculerAge('2018-06-15', new Date('2026-09-12'))).toBe(8);
  });

  it("n'a pas encore eu son anniversaire cette année", () => {
    expect(calculerAge('2018-10-15', new Date('2026-09-12'))).toBe(7);
  });

  it("l'anniversaire tombe exactement aujourd'hui", () => {
    expect(calculerAge('2018-09-12', new Date('2026-09-12'))).toBe(8);
  });

  it("l'anniversaire était hier", () => {
    expect(calculerAge('2018-09-11', new Date('2026-09-12'))).toBe(8);
  });

  it('gère un anniversaire le 29 février (année bissextile)', () => {
    expect(calculerAge('2016-02-29', new Date('2026-02-28'))).toBe(9);
    expect(calculerAge('2016-02-29', new Date('2026-03-01'))).toBe(10);
  });
});
