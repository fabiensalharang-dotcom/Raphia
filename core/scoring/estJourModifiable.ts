function obtenirDateEtHeureDansFuseau(instant: Date, timezone: string): { date: string; heure: number } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(instant);
  const valeur = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const heure = valeur('hour');
  return {
    date: `${valeur('year')}-${valeur('month')}-${valeur('day')}`,
    // 'en-CA' avec hour12:false peut rendre minuit "24" selon l'environnement ICU.
    heure: heure === '24' ? 0 : Number(heure),
  };
}

function lendemain(dateJour: string): string {
  const d = new Date(`${dateJour}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// §5.5 : une journée non clôturée reste modifiable jusqu'à 12h00 le
// lendemain (dans le fuseau du foyer), puis elle se fige. Ça couvre le
// parent qui oublie de cocher le soir, sans permettre de réécrire la
// semaine indéfiniment.
export function estJourModifiable(dateJour: string, maintenant: Date, timezone: string): boolean {
  const { date: aujourdHui, heure } = obtenirDateEtHeureDansFuseau(maintenant, timezone);

  if (dateJour === aujourdHui) return true;
  if (aujourdHui === lendemain(dateJour) && heure < 12) return true;
  return false;
}
