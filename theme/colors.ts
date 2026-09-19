import type { RuleCategory } from '../core/referential/types';
import type { RewardCategory } from '../core/rewards/types';

// Direction validée avec l'utilisateur (retour famille pilote, sept. 2026) :
// couleurs vives par thématique, accent chaud, fond crème plutôt que blanc pur.
export const colors = {
  background: '#FBF6EE',
  surface: '#FFFFFF',
  ink: '#3A2E2A',
  inkMuted: '#8A7D73',
  border: '#E4E1D9',

  accent: '#D9483C',
  accentSoft: '#FFA26B',
  special: '#E8A623',

  danger: '#B00020',
};

export const categoryColors: Record<RuleCategory, string> = {
  autonomie: '#FF9F45',
  securite: '#2FBDB6',
  social: '#FF6B9D',
  scolaire: '#5B7FFF',
  ecrans: '#9B6BFF',
  emotions: '#FF6B5B',
  organisation: '#4CC98A',
};

// §7 : une règle sans catégorie connue (cache non rafraîchi depuis cet ajout,
// ou donnée inattendue) reste lisible plutôt que de casser l'écran.
export function couleurCategorie(category: RuleCategory | null | undefined): string {
  return (category && categoryColors[category]) || colors.inkMuted;
}

export const rewardCategoryColors: Record<RewardCategory, string> = {
  relationnelle: '#E0568A',
  privilege: '#C99A2E',
  temps: '#4E7FE0',
  materielle: '#4CAF7D',
};

export function couleurCategorieRecompense(category: RewardCategory | null | undefined): string {
  return (category && rewardCategoryColors[category]) || colors.inkMuted;
}
