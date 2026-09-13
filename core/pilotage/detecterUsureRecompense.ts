export type ResultatUsureRecompense =
  | { declenche: true; rewardInstanceId: string | null }
  | { declenche: false };

// §6.4 : usure d'une récompense — soit une même reward_instance a été
// attribuée 8 fois sur les 10 dernières attributions (peu importe le tier),
// soit aucune récompense n'a été ajoutée au menu depuis 8 semaines.
export function detecterUsureRecompense(
  dixDernieresAttributions: { rewardInstanceId: string }[],
  semainesDepuisDernierAjout: number
): ResultatUsureRecompense {
  const compte = new Map<string, number>();
  for (const attribution of dixDernieresAttributions) {
    compte.set(attribution.rewardInstanceId, (compte.get(attribution.rewardInstanceId) ?? 0) + 1);
  }

  const fatiguee = Array.from(compte.entries()).find(([, n]) => n >= 8);
  if (fatiguee) return { declenche: true, rewardInstanceId: fatiguee[0] };

  if (semainesDepuisDernierAjout >= 8) return { declenche: true, rewardInstanceId: null };

  return { declenche: false };
}
