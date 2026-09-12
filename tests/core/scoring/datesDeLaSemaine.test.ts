import { datesDeLaSemaine, estDernierJourDeLaSemaine } from '../../../core/scoring/datesDeLaSemaine';

describe('datesDeLaSemaine', () => {
  it('retourne les 7 jours de lundi à dimanche (semaine démarrant lundi)', () => {
    // 2026-09-16 est un mercredi.
    expect(datesDeLaSemaine('2026-09-16', 1)).toEqual([
      '2026-09-14',
      '2026-09-15',
      '2026-09-16',
      '2026-09-17',
      '2026-09-18',
      '2026-09-19',
      '2026-09-20',
    ]);
  });

  it('un dimanche appartient à la semaine qui se termine ce jour-là (semaine démarrant lundi)', () => {
    expect(datesDeLaSemaine('2026-09-20', 1)[6]).toBe('2026-09-20');
    expect(datesDeLaSemaine('2026-09-20', 1)[0]).toBe('2026-09-14');
  });

  it('respecte un premier jour de semaine différent (dimanche)', () => {
    expect(datesDeLaSemaine('2026-09-16', 7)).toEqual([
      '2026-09-13',
      '2026-09-14',
      '2026-09-15',
      '2026-09-16',
      '2026-09-17',
      '2026-09-18',
      '2026-09-19',
    ]);
  });
});

describe('estDernierJourDeLaSemaine', () => {
  it('dimanche est le dernier jour pour une semaine démarrant lundi', () => {
    expect(estDernierJourDeLaSemaine('2026-09-20', 1)).toBe(true);
    expect(estDernierJourDeLaSemaine('2026-09-19', 1)).toBe(false);
  });

  it('samedi est le dernier jour pour une semaine démarrant dimanche', () => {
    expect(estDernierJourDeLaSemaine('2026-09-19', 7)).toBe(true);
    expect(estDernierJourDeLaSemaine('2026-09-20', 7)).toBe(false);
  });
});
