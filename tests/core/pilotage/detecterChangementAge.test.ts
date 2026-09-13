import { detecterChangementAge } from '../../../core/pilotage/detecterChangementAge';

describe('detecterChangementAge', () => {
  it("se déclenche le jour de l'anniversaire", () => {
    expect(detecterChangementAge('2019-04-10', '2026-04-10')).toBe(true);
  });

  it("ne se déclenche pas la veille ou le lendemain", () => {
    expect(detecterChangementAge('2019-04-10', '2026-04-09')).toBe(false);
    expect(detecterChangementAge('2019-04-10', '2026-04-11')).toBe(false);
  });

  it('gère un anniversaire le 29 février', () => {
    expect(detecterChangementAge('2016-02-29', '2028-02-29')).toBe(true);
  });

  it("ne se déclenche pas à un autre mois portant le même quantième", () => {
    expect(detecterChangementAge('2019-04-10', '2026-05-10')).toBe(false);
  });
});
