export type UsageVariante = {
  variant: number;
  date: string;
};

// §7.7 : au moins 5 variantes par type d'observation (4 par question),
// jamais réutilisée avant 14 jours, et si toutes ont été vues on repart
// sur la moins récente. Toujours choisir la variante la moins récemment
// utilisée satisfait les deux règles à la fois — une variante jamais
// utilisée est traitée comme infiniment ancienne.
export function choisirVariante(nombreVariantes: number, historique: UsageVariante[]): number {
  const dernierUsage = new Map<number, string>();
  for (const usage of historique) {
    const existant = dernierUsage.get(usage.variant);
    if (!existant || usage.date > existant) dernierUsage.set(usage.variant, usage.date);
  }

  let meilleure = 0;
  let dateLaPlusAncienne = dernierUsage.get(0) ?? '';
  for (let variante = 1; variante < nombreVariantes; variante++) {
    const date = dernierUsage.get(variante) ?? '';
    if (date < dateLaPlusAncienne) {
      meilleure = variante;
      dateLaPlusAncienne = date;
    }
  }
  return meilleure;
}
