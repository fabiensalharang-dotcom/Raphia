// §7.4 : points == threshold - 1 — à un point près.
export function detecterCloseToThreshold(points: number, threshold: number): boolean {
  return points === threshold - 1;
}
