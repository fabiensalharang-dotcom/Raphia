import { supabase } from '../supabaseClient';
import type { RewardTemplate } from '../../core/rewards/types';

type RewardTemplateRow = {
  id: string;
  label: string;
  category: RewardTemplate['category'];
  tier: RewardTemplate['tier'];
  age_min: number;
  age_max: number;
  requires_parent_time: boolean;
};

function toRewardTemplate(row: RewardTemplateRow): RewardTemplate {
  return {
    id: row.id,
    label: row.label,
    category: row.category,
    tier: row.tier,
    ageMin: row.age_min,
    ageMax: row.age_max,
    requiresParentTime: row.requires_parent_time,
  };
}

export async function fetchRewardTemplates(): Promise<RewardTemplate[]> {
  const { data, error } = await supabase.from('reward_template').select('*');
  if (error) throw error;
  return (data as RewardTemplateRow[]).map(toRewardTemplate);
}
