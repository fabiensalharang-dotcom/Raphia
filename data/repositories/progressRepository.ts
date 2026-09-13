import {
  calculerSeuilsAtteintsParSemaine,
  calculerTauxReussiteParRegle,
  type SeuilsSemaine,
  type TauxReussiteRegle,
} from '../../core/scoring';
import { supabase } from '../supabaseClient';

export type PointsJour = {
  date: string;
  pointsTotal: number | null; // null = aucune journée enregistrée ce jour-là
};

export type ProgressView = {
  dailyPoints: PointsJour[];
  ruleSuccessRates: TauxReussiteRegle[];
  weeklyThresholds: SeuilsSemaine[];
};

function dateDuJourDansFuseau(timezone: string, decalageJours = 0): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const instant = new Date();
  instant.setUTCDate(instant.getUTCDate() + decalageJours);
  return formatter.format(instant);
}

// §9.3 : les trois blocs de l'écran de progression, sur une fenêtre de 4,
// 8 ou 12 semaines se terminant aujourd'hui. Ne persiste rien — ce sont
// des lectures d'historique déjà figé (day_entry, rule_check), jamais un
// recalcul qui réécrirait quoi que ce soit (garde-fou #6).
export async function fetchProgressView(
  childId: string,
  timezone: string,
  weeks: 4 | 8 | 12
): Promise<ProgressView> {
  const nombreJours = weeks * 7;
  const aujourdHui = dateDuJourDansFuseau(timezone);
  const premierJour = dateDuJourDansFuseau(timezone, -(nombreJours - 1));

  const { data: joursEnregistres, error: joursError } = await supabase
    .from('day_entry')
    .select('id, date, points_total, threshold_met')
    .eq('child_id', childId)
    .gte('date', premierJour)
    .lte('date', aujourdHui);
  if (joursError) throw joursError;

  const parDate = new Map((joursEnregistres ?? []).map((j) => [j.date, j]));
  const toutesLesDates = Array.from({ length: nombreJours }, (_, i) => dateDuJourDansFuseau(timezone, i - (nombreJours - 1)));

  const dailyPoints: PointsJour[] = toutesLesDates.map((date) => ({
    date,
    pointsTotal: parDate.get(date)?.points_total ?? null,
  }));

  const weeklyThresholds = calculerSeuilsAtteintsParSemaine(
    toutesLesDates.map((date) => ({ date, thresholdMet: parDate.get(date)?.threshold_met ?? false }))
  );

  const dayEntryIds = (joursEnregistres ?? []).map((j) => j.id);
  let ruleSuccessRates: TauxReussiteRegle[] = [];
  if (dayEntryIds.length > 0) {
    const { data: cochages, error: cochagesError } = await supabase
      .from('rule_check')
      .select('rule_instance_id, state, rule_instance:rule_instance_id (label)')
      .in('day_entry_id', dayEntryIds);
    if (cochagesError) throw cochagesError;

    ruleSuccessRates = calculerTauxReussiteParRegle(
      (cochages ?? []).map((c) => ({
        ruleInstanceId: c.rule_instance_id,
        label: (c.rule_instance as unknown as { label: string })?.label ?? '',
        state: c.state,
      }))
    );
  }

  return { dailyPoints, ruleSuccessRates, weeklyThresholds };
}
