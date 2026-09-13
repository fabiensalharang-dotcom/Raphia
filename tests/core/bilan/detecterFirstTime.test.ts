import { detecterFirstTime } from '../../../core/bilan/detecterFirstTime';

describe('detecterFirstTime', () => {
  it('se déclenche si respectée aujourd’hui et jamais avant', () => {
    expect(detecterFirstTime('respected', false)).toBe(true);
  });

  it('ne se déclenche pas si déjà respectée auparavant', () => {
    expect(detecterFirstTime('respected', true)).toBe(false);
  });

  it('ne se déclenche pas si non respectée aujourd’hui', () => {
    expect(detecterFirstTime('not_respected', false)).toBe(false);
  });

  it('ne se déclenche pas si not_applicable aujourd’hui', () => {
    expect(detecterFirstTime('not_applicable', false)).toBe(false);
  });
});
