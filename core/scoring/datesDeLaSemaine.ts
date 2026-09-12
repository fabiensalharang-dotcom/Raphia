// Convention ISO déjà utilisée pour household.week_start_day (1 = lundi ...
// 7 = dimanche), cohérente avec iso_year/iso_week (§4.3).
function jourIso(date: string): number {
  const jsDay = new Date(`${date}T12:00:00Z`).getUTCDay(); // 0 = dimanche ... 6 = samedi
  return jsDay === 0 ? 7 : jsDay;
}

function ajouterJours(date: string, delta: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

// Les 7 dates (du premier au dernier jour) de la semaine contenant `date`,
// selon le premier jour de semaine choisi par le foyer (household.week_start_day).
export function datesDeLaSemaine(date: string, weekStartDay: number): string[] {
  const decalage = (jourIso(date) - weekStartDay + 7) % 7;
  const premierJour = ajouterJours(date, -decalage);
  return Array.from({ length: 7 }, (_, i) => ajouterJours(premierJour, i));
}

// Vrai si `date` est le dernier jour de sa semaine (§5.3 : la récompense
// hebdomadaire se déclenche à la clôture du dernier jour de la semaine).
export function estDernierJourDeLaSemaine(date: string, weekStartDay: number): boolean {
  const dernierJour = ((weekStartDay + 5) % 7) + 1; // weekStartDay - 1, en restant dans 1..7
  return jourIso(date) === dernierJour;
}
