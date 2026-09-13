// §7.4 : days_threshold_met == weekly_threshold - 1 — encore un jour et la
// semaine est réussie.
export function detecterWeeklyPace(daysThresholdMet: number, weeklyThreshold: number): boolean {
  return daysThresholdMet === weeklyThreshold - 1;
}
