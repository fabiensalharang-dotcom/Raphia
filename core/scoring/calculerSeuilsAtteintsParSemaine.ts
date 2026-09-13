import { semaineIso } from './semaineIso';

export type JourPourSemaine = {
  date: string;
  thresholdMet: boolean;
};

export type SeuilsSemaine = {
  isoYear: number;
  isoWeek: number;
  daysThresholdMet: number;
};

// §9.3 : nombre de seuils quotidiens atteints par semaine, sur la période
// affichée. Un jour absent (jamais ouvert) ne compte pas comme atteint —
// même convention que fetchDayEntriesForDates (§4.3, §5.3) — et une
// semaine partiellement couverte par la fenêtre affiche simplement ce
// qu'elle contient, sans jamais l'assimiler à un objectif manqué (§9.3).
export function calculerSeuilsAtteintsParSemaine(jours: JourPourSemaine[]): SeuilsSemaine[] {
  const parSemaine = new Map<string, SeuilsSemaine>();

  for (const jour of jours) {
    const { isoYear, isoWeek } = semaineIso(jour.date);
    const cle = `${isoYear}-${isoWeek}`;
    const entree = parSemaine.get(cle) ?? { isoYear, isoWeek, daysThresholdMet: 0 };
    if (jour.thresholdMet) entree.daysThresholdMet += 1;
    parSemaine.set(cle, entree);
  }

  return Array.from(parSemaine.values()).sort((a, b) => a.isoYear - b.isoYear || a.isoWeek - b.isoWeek);
}
