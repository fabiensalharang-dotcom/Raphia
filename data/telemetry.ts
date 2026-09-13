import { supabase } from './supabaseClient';

export type TelemetryEventType =
  | 'rule_kept'
  | 'rule_discarded'
  | 'rule_relabeled'
  | 'suggestion_accepted'
  | 'suggestion_dismissed'
  | 'reward_chosen'
  | 'digest_opened'
  | 'card_shared'
  | 'day_closed';

// §10.2 : jamais d'identifiant d'enfant ni de prénom dans la charge utile,
// identifiant de foyer pseudonymisé côté base (household_pseudonym), âge
// en années révolues seulement. Best-effort — un incident ici ne doit
// jamais perturber l'usage du produit (§10 : « on collecte, on ne pondère
// pas », rien ici n'est sur le chemin critique).
export async function enregistrerEvenement(
  householdId: string,
  eventType: TelemetryEventType,
  payload: Record<string, unknown> = {},
  childAge?: number
): Promise<void> {
  try {
    await supabase.rpc('enregistrer_evenement_telemetrie', {
      p_household_id: householdId,
      p_event_type: eventType,
      p_payload: payload,
      p_child_age: childAge ?? null,
    });
  } catch {
    // best-effort, voir commentaire ci-dessus
  }
}

// §10.2 : « le signal le plus précieux » — mais seule une passe de
// filtrage retire les données identifiantes avant exploitation. On ne
// sait détecter de façon fiable que le prénom déjà connu de l'enfant
// concerné ; le reste (prénoms de tiers, etc.) reste un filtrage manuel
// en aval, hors périmètre d'une fonction cliente.
export function filtrerTexteIdentifiant(texte: string, prenomEnfant: string): string {
  if (!prenomEnfant) return texte;
  const motif = new RegExp(prenomEnfant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  return texte.replace(motif, '[prénom]');
}
