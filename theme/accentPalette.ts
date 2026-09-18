// Palette resserrée plutôt que libre : chaque couleur est choisie pour
// garder un contraste suffisant avec le texte blanc utilisé dans les
// en-têtes, boutons et jauges partout dans l'app.
export type AccentColorKey = 'rouge' | 'orange' | 'ambre' | 'vert' | 'bleu' | 'violet' | 'rose' | 'turquoise';

export const DEFAULT_ACCENT_KEY: AccentColorKey = 'rouge';

export const ACCENT_PALETTE: Record<AccentColorKey, { accent: string; accentSoft: string }> = {
  rouge: { accent: '#D9483C', accentSoft: '#FFA26B' },
  orange: { accent: '#E07A3F', accentSoft: '#FFC48A' },
  ambre: { accent: '#C99A2E', accentSoft: '#F0D485' },
  vert: { accent: '#4CAF7D', accentSoft: '#A8E0C4' },
  bleu: { accent: '#4E7FE0', accentSoft: '#AFC6F5' },
  violet: { accent: '#8B5FD9', accentSoft: '#D3BFF2' },
  rose: { accent: '#E0568A', accentSoft: '#F5B8D0' },
  turquoise: { accent: '#2FA9B8', accentSoft: '#9EDCE3' },
};

export const ORDRE_PALETTE: AccentColorKey[] = ['rouge', 'orange', 'ambre', 'vert', 'bleu', 'violet', 'rose', 'turquoise'];

export function accentColorsFor(cle: string | null | undefined): { accent: string; accentSoft: string } {
  return ACCENT_PALETTE[cle as AccentColorKey] ?? ACCENT_PALETTE[DEFAULT_ACCENT_KEY];
}
