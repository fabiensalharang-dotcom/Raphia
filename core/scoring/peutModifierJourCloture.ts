function dateDuJourDansFuseau(instant: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(instant);
}

// Une journée clôturée reste modifiable jusqu'à minuit du même jour civil
// (fuseau du foyer) — l'enfant garde la main sur un choix de récompense ou
// une correction de dernière minute, sans réouvrir l'historique au-delà.
// Contrairement à estJourModifiable (journée jamais clôturée, grâce jusqu'à
// midi le lendemain), il n'y a ici aucune tolérance après minuit.
export function peutModifierJourCloture(dateJour: string, maintenant: Date, timezone: string): boolean {
  return dateDuJourDansFuseau(maintenant, timezone) === dateJour;
}
