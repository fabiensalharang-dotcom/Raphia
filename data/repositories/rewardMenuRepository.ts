import { supabase } from '../supabaseClient';
import type { RewardTemplate } from '../../core/rewards/types';

export type MenuInfo = { rewardInstanceId: string; isAvailable: boolean };

// §9.5, D7 : le menu est stable — chaque modèle n'est jamais réinséré une
// fois présent, on ne fait que suivre son template_id pour savoir s'il est
// déjà au menu (disponible ou non).
export async function fetchMenuStatus(childId: string): Promise<Map<string, MenuInfo>> {
  const { data, error } = await supabase
    .from('reward_instance')
    .select('id, template_id, is_available')
    .eq('child_id', childId);
  if (error) throw error;

  const statut = new Map<string, MenuInfo>();
  for (const r of data ?? []) {
    if (r.template_id) statut.set(r.template_id, { rewardInstanceId: r.id, isAvailable: r.is_available });
  }
  return statut;
}

export async function ajouterRecompenseAuMenu(
  childId: string,
  template: RewardTemplate,
  libellePersonnalise?: string
): Promise<void> {
  const { data: existantes, error: existantesError } = await supabase
    .from('reward_instance')
    .select('display_order')
    .eq('child_id', childId)
    .order('display_order', { ascending: false })
    .limit(1);
  if (existantesError) throw existantesError;
  const prochainOrdre = (existantes?.[0]?.display_order ?? 0) + 1;

  const { error } = await supabase.from('reward_instance').insert({
    child_id: childId,
    template_id: template.id,
    label: libellePersonnalise?.trim() || template.label,
    category: template.category,
    tier: template.tier,
    display_order: prochainOrdre,
  });
  if (error) throw error;
}

// D7 : le menu est stable — on ne supprime jamais une reward_instance, on
// bascule seulement sa disponibilité. Une récompense retirée reste donc
// remise au menu en un geste, sans jamais recréer la ligne.
export async function definirDisponibiliteRecompense(rewardInstanceId: string, disponible: boolean): Promise<void> {
  const { error } = await supabase.from('reward_instance').update({ is_available: disponible }).eq('id', rewardInstanceId);
  if (error) throw error;
}
