import { estJourDeControle } from '../../../core/pilotage/estJourDeControle';

describe('estJourDeControle', () => {
  it('se déclenche le même quantième, le mois suivant', () => {
    expect(estJourDeControle('2026-08-12T10:00:00Z', '2026-09-12')).toBe(true);
  });

  it('ne se déclenche jamais le jour même de l’acquisition', () => {
    expect(estJourDeControle('2026-09-12T10:00:00Z', '2026-09-12')).toBe(false);
  });

  it('ne se déclenche pas à un autre quantième', () => {
    expect(estJourDeControle('2026-08-12T10:00:00Z', '2026-09-13')).toBe(false);
  });

  it('saute un mois trop court pour le quantième (acquise un 31)', () => {
    expect(estJourDeControle('2026-08-31T10:00:00Z', '2026-09-30')).toBe(false);
  });

  it('se déclenche à nouveau plusieurs mois plus tard', () => {
    expect(estJourDeControle('2026-06-12T10:00:00Z', '2026-09-12')).toBe(true);
  });
});
