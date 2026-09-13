// §6.2 : une règle acquired est re-proposée à la vérification une fois par
// mois, sur une seule journée — celle qui correspond au quantième du jour
// où elle a été acquise (le 12 du mois si acquired_at tombait un 12), à
// partir du mois suivant l'acquisition (jamais le jour même). Un mois plus
// court que ce quantième (ex. acquise un 31) saute simplement ce mois-là,
// sans jamais planter.
export function estJourDeControle(acquiredAt: string, aujourdHui: string): boolean {
  const dateAcquisition = new Date(acquiredAt);
  const jour = new Date(`${aujourdHui}T00:00:00Z`);

  if (dateAcquisition.getUTCDate() !== jour.getUTCDate()) return false;

  const memeMois =
    dateAcquisition.getUTCFullYear() === jour.getUTCFullYear() && dateAcquisition.getUTCMonth() === jour.getUTCMonth();
  return !memeMois;
}
