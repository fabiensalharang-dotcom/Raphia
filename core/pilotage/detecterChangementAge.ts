// §6.6 : déclenché le jour anniversaire de l'enfant (mois et jour de
// naissance identiques à aujourd'hui).
export function detecterChangementAge(dateNaissance: string, aujourdHui: string): boolean {
  const naissance = new Date(`${dateNaissance}T00:00:00Z`);
  const jour = new Date(`${aujourdHui}T00:00:00Z`);
  return naissance.getUTCMonth() === jour.getUTCMonth() && naissance.getUTCDate() === jour.getUTCDate();
}
