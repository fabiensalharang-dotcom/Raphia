import type { Difficulty, RuleTemplate } from './types';

// §4.2 D4 : pour un enfant de N ans, on retient les règles où
// age_min ≤ N ≤ age_max, triées par abs(focus_year - N) croissant puis par
// difficulté. Le dossier ne précise pas le sens du tri par difficulté :
// on propose les règles les plus faciles en premier à distance égale du
// focus_year, cohérent avec le ton du produit (§12, on n'écrase pas
// l'enfant de règles exigeantes dès le départ).
const ORDRE_DIFFICULTE: Record<Difficulty, number> = {
  facile: 0,
  moyenne: 1,
  exigeante: 2,
};

export function classerParAnnee(
  regles: RuleTemplate[],
  age: number,
  idsExclus: string[] = []
): RuleTemplate[] {
  return regles
    .filter((regle) => regle.ageMin <= age && age <= regle.ageMax && !idsExclus.includes(regle.id))
    .sort((a, b) => {
      const distanceA = Math.abs(a.focusYear - age);
      const distanceB = Math.abs(b.focusYear - age);
      if (distanceA !== distanceB) return distanceA - distanceB;
      return ORDRE_DIFFICULTE[a.difficulty] - ORDRE_DIFFICULTE[b.difficulty];
    });
}
