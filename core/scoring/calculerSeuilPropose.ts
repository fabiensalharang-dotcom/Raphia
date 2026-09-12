const COEFFICIENT_CALIBRAGE = 0.65;

// §5.4 : le seuil proposé à l'installation (ou recalculé après une règle
// acquise, §6.2) n'est pas arbitraire. Le maximum théorique inclut les
// points de TOUTES les règles actives, thématique comprise, plus son
// bonus — à distinguer du calcul du score réel d'une journée (§5.1) qui,
// lui, ne compte jamais les points propres de la règle thématique.
export function calculerSeuilPropose(pointsReglesActives: number[], bonusThematique: number): number {
  const pointsMaxTheoriques = pointsReglesActives.reduce((total, points) => total + points, 0) + bonusThematique;
  return Math.round(pointsMaxTheoriques * COEFFICIENT_CALIBRAGE);
}
