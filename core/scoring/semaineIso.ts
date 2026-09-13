// §4.3 : week_summary.iso_year / iso_week — semaine ISO 8601 standard
// (le jeudi de la semaine détermine son année ; une année a 52 ou 53
// semaines ISO selon que son 1er janvier ou son 31 décembre tombe un jeudi).
export function semaineIso(date: string): { isoYear: number; isoWeek: number } {
  const d = new Date(`${date}T00:00:00Z`);
  const jourIso = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (4 - jourIso));

  const isoYear = d.getUTCFullYear();
  const debutAnnee = new Date(Date.UTC(isoYear, 0, 1));
  const isoWeek = Math.ceil(((d.getTime() - debutAnnee.getTime()) / 86400000 + 1) / 7);

  return { isoYear, isoWeek };
}
