import { peutModifierJourCloture } from '../../../core/scoring/peutModifierJourCloture';

describe('peutModifierJourCloture', () => {
  it('le jour même reste modifiable après clôture, avant minuit', () => {
    expect(peutModifierJourCloture('2026-09-12', new Date('2026-09-12T20:00:00Z'), 'Europe/Paris')).toBe(true);
  });

  it('se fige dès le lendemain, même quelques minutes après minuit local', () => {
    // 2026-09-12T22:01:00Z = 2026-09-13 00h01 à Paris (été, UTC+2).
    expect(peutModifierJourCloture('2026-09-12', new Date('2026-09-12T22:01:00Z'), 'Europe/Paris')).toBe(false);
  });

  it('un jour plus ancien que la veille est toujours figé', () => {
    expect(peutModifierJourCloture('2026-09-10', new Date('2026-09-13T08:00:00Z'), 'Europe/Paris')).toBe(false);
  });

  it("respecte un fuseau très différent (Pacific/Kiritimati, UTC+14), pas codé en dur sur Paris", () => {
    // 2026-09-12T09:00:00Z = 2026-09-12 23h00 locale à Kiritimati : encore
    // le jour même, donc modifiable.
    expect(peutModifierJourCloture('2026-09-12', new Date('2026-09-12T09:00:00Z'), 'Pacific/Kiritimati')).toBe(true);
    // 2026-09-12T11:00:00Z = 2026-09-13 01h00 locale à Kiritimati : minuit
    // franchi, figé.
    expect(peutModifierJourCloture('2026-09-12', new Date('2026-09-12T11:00:00Z'), 'Pacific/Kiritimati')).toBe(false);
  });
});
