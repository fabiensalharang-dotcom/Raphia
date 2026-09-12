import { supabase } from '../supabaseClient';
import type { RewardTier } from '../../core/rewards/types';

export type RewardInstanceOption = {
  id: string;
  label: string;
};

export type PendingRewardGrant = {
  grantId: string;
  label: string;
  tier: RewardTier;
  grantedAt: string;
};

export async function fetchAvailableRewards(childId: string, tier: RewardTier): Promise<RewardInstanceOption[]> {
  const { data, error } = await supabase
    .from('reward_instance')
    .select('id, label')
    .eq('child_id', childId)
    .eq('tier', tier)
    .eq('is_available', true)
    .order('display_order');
  if (error) throw error;
  return data ?? [];
}

export type GrantedReward = {
  id: string;
  label: string;
};

export async function fetchGrantForDayEntry(dayEntryId: string, tier: RewardTier): Promise<GrantedReward | null> {
  const { data, error } = await supabase
    .from('reward_grant')
    .select('id, reward_instance:reward_instance_id (label)')
    .eq('day_entry_id', dayEntryId)
    .eq('tier', tier)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { id: data.id, label: (data.reward_instance as unknown as { label: string })?.label ?? '' };
}

export async function attribuerRecompense(
  childId: string,
  dayEntryId: string,
  rewardInstanceId: string,
  tier: RewardTier
): Promise<void> {
  const { error: grantError } = await supabase
    .from('reward_grant')
    .insert({ child_id: childId, day_entry_id: dayEntryId, reward_instance_id: rewardInstanceId, tier });
  if (grantError) throw grantError;

  const { error: updateError } = await supabase
    .from('reward_instance')
    .update({ last_granted_at: new Date().toISOString() })
    .eq('id', rewardInstanceId);
  if (updateError) throw updateError;
}

export async function fetchRecompensesEnAttente(childId: string): Promise<PendingRewardGrant[]> {
  const { data, error } = await supabase
    .from('reward_grant')
    .select('id, tier, granted_at, reward_instance:reward_instance_id (label)')
    .eq('child_id', childId)
    .is('redeemed_at', null)
    .order('granted_at');
  if (error) throw error;
  return (data ?? []).map((g) => ({
    grantId: g.id,
    label: (g.reward_instance as unknown as { label: string })?.label ?? '',
    tier: g.tier,
    grantedAt: g.granted_at,
  }));
}

export async function marquerConsommee(grantId: string): Promise<void> {
  const { error } = await supabase
    .from('reward_grant')
    .update({ redeemed_at: new Date().toISOString() })
    .eq('id', grantId);
  if (error) throw error;
}
