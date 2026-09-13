import { semaineIso } from '../../../core/scoring/semaineIso';

describe('semaineIso', () => {
  it('un jeudi ordinaire détermine simplement sa propre année et semaine', () => {
    expect(semaineIso('2026-09-13')).toEqual({ isoYear: 2026, isoWeek: 37 });
  });

  it("le 1er janvier peut appartenir à la semaine 53 de l'année précédente", () => {
    expect(semaineIso('2016-01-01')).toEqual({ isoYear: 2015, isoWeek: 53 });
  });

  it("le 1er janvier peut appartenir à la semaine 52 de l'année précédente", () => {
    expect(semaineIso('2017-01-01')).toEqual({ isoYear: 2016, isoWeek: 52 });
  });

  it('le 1er janvier peut appartenir à la semaine 1 de sa propre année', () => {
    expect(semaineIso('2018-01-01')).toEqual({ isoYear: 2018, isoWeek: 1 });
  });

  it('le 31 décembre peut appartenir à la semaine 53 de sa propre année', () => {
    expect(semaineIso('2020-12-31')).toEqual({ isoYear: 2020, isoWeek: 53 });
  });

  it("le 1er janvier peut appartenir à la semaine 53 de l'année précédente (année à 53 semaines)", () => {
    expect(semaineIso('2021-01-01')).toEqual({ isoYear: 2020, isoWeek: 53 });
  });
});
