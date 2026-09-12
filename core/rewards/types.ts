export type RewardCategory = 'relationnelle' | 'privilege' | 'temps' | 'materielle';
export type RewardTier = 'daily' | 'weekly';

export type RewardTemplate = {
  id: string;
  label: string;
  category: RewardCategory;
  tier: RewardTier;
  ageMin: number;
  ageMax: number;
  requiresParentTime: boolean;
};
