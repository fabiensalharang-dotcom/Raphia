import { estJourModifiable } from '../../../core/scoring/estJourModifiable';

describe('estJourModifiable', () => {
  it("le jour même reste toujours modifiable", () => {
    expect(estJourModifiable('2026-09-12', new Date('2026-09-12T23:00:00Z'), 'Europe/Paris')).toBe(true);
  });

  it('la veille reste modifiable avant midi (fuseau Europe/Paris, UTC+2 en septembre)', () => {
    // 2026-09-13T09:00:00Z = 11h00 à Paris (été, UTC+2) : avant midi local.
    expect(estJourModifiable('2026-09-12', new Date('2026-09-13T09:00:00Z'), 'Europe/Paris')).toBe(true);
  });

  it('la veille se fige après midi local (fuseau Europe/Paris)', () => {
    // 2026-09-13T10:30:00Z = 12h30 à Paris (été, UTC+2) : après midi local.
    expect(estJourModifiable('2026-09-12', new Date('2026-09-13T10:30:00Z'), 'Europe/Paris')).toBe(false);
  });

  it('un jour plus ancien que la veille est toujours figé', () => {
    expect(estJourModifiable('2026-09-10', new Date('2026-09-13T08:00:00Z'), 'Europe/Paris')).toBe(false);
  });

  it("respecte un fuseau très différent (Pacific/Kiritimati, UTC+14), pas codé en dur sur Paris", () => {
    // 2026-09-13T09:00:00Z = 2026-09-13 23h00 locale à Kiritimati (UTC+14) :
    // c'est bien le lendemain de dateJour, mais après midi local → figé.
    expect(estJourModifiable('2026-09-12', new Date('2026-09-13T09:00:00Z'), 'Pacific/Kiritimati')).toBe(false);
    // 2026-09-11T15:00:00Z = 2026-09-12 05h00 locale à Kiritimati : le
    // lendemain de dateJour, mais avant midi local → encore modifiable.
    expect(estJourModifiable('2026-09-11', new Date('2026-09-11T15:00:00Z'), 'Pacific/Kiritimati')).toBe(true);
  });
});
