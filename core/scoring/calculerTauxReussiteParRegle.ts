export type CochageRegle = {
  ruleInstanceId: string;
  label: string;
  state: 'respected' | 'not_respected' | 'not_applicable';
};

export type TauxReussiteRegle = {
  ruleInstanceId: string;
  label: string;
  tauxReussite: number;
  joursApplicables: number;
};

// §9.3 : taux de réussite par règle, trié du meilleur au moins bon. Un
// cochage not_applicable ne compte ni au numérateur ni au dénominateur
// (§4.3) — une règle qui n'a jamais été applicable sur la période
// n'apparaît pas du tout, plutôt que d'afficher un taux de 0 trompeur.
export function calculerTauxReussiteParRegle(cochages: CochageRegle[]): TauxReussiteRegle[] {
  const parRegle = new Map<string, { label: string; respectes: number; applicables: number }>();

  for (const cochage of cochages) {
    if (cochage.state === 'not_applicable') continue;
    const entree = parRegle.get(cochage.ruleInstanceId) ?? { label: cochage.label, respectes: 0, applicables: 0 };
    entree.applicables += 1;
    if (cochage.state === 'respected') entree.respectes += 1;
    parRegle.set(cochage.ruleInstanceId, entree);
  }

  return Array.from(parRegle.entries())
    .map(([ruleInstanceId, { label, respectes, applicables }]) => ({
      ruleInstanceId,
      label,
      tauxReussite: respectes / applicables,
      joursApplicables: applicables,
    }))
    .sort((a, b) => b.tauxReussite - a.tauxReussite);
}
