import AsyncStorage from '@react-native-async-storage/async-storage';

import { estJourDeControle } from '../../core/pilotage';
import type { RuleCategory } from '../../core/referential/types';
import { calculerScoreJournalier, verifierSeuilAtteint } from '../../core/scoring';
import type { EtatRegle, PointageRegle, StatutRegle } from '../../core/scoring/types';
import { supabase } from '../supabaseClient';

export type RuleCheckView = {
  ruleInstanceId: string;
  label: string;
  shortLabel: string;
  icon: string;
  category: RuleCategory;
  points: number;
  isThematic: boolean;
  bonusValue: number;
  status: StatutRegle;
  etat: EtatRegle;
};

export type DayEntryView = {
  dayEntryId: string;
  childId: string;
  date: string;
  thresholdApplied: number;
  thresholdMet: boolean;
  pointsTotal: number;
  isClosed: boolean;
  checks: RuleCheckView[];
};

// Politique hors ligne (§9.1) : le cache local, une fois qu'il existe pour
// cette journée, fait autorité. À chaque tentative réseau, on pousse l'état
// du cache vers Supabase plutôt que d'écraser localement avec le serveur —
// sinon des cochages faits hors ligne seraient perdus au retour du réseau.
function cleDeCache(childId: string, date: string): string {
  return `raphia:day-entry:${childId}:${date}`;
}

async function lireCache(cle: string): Promise<DayEntryView | null> {
  try {
    const brut = await AsyncStorage.getItem(cle);
    return brut ? (JSON.parse(brut) as DayEntryView) : null;
  } catch {
    return null;
  }
}

async function ecrireCache(cle: string, vue: DayEntryView): Promise<void> {
  try {
    await AsyncStorage.setItem(cle, JSON.stringify(vue));
  } catch {
    // Le cache est un confort hors ligne, pas une garantie — une écriture
    // échouée ne doit jamais bloquer l'usage de l'écran.
  }
}

function recalculerTotaux(checks: RuleCheckView[], thresholdApplied: number): { pointsTotal: number; thresholdMet: boolean } {
  const pointages: PointageRegle[] = checks.map((c) => ({
    ruleInstanceId: c.ruleInstanceId,
    points: c.points,
    isThematic: c.isThematic,
    bonusValue: c.bonusValue,
    status: c.status,
    etat: c.etat,
  }));
  const pointsTotal = calculerScoreJournalier(pointages);
  return { pointsTotal, thresholdMet: verifierSeuilAtteint(pointsTotal, thresholdApplied) };
}

async function chargerDepuisServeur(
  childId: string,
  date: string,
  thresholdApplied: number
): Promise<DayEntryView> {
  const { data: reglesActives, error: reglesError } = await supabase
    .from('rule_instance')
    .select('id, label, short_label, icon, category, points, is_thematic, bonus_value, status')
    .eq('child_id', childId)
    .eq('status', 'active');
  if (reglesError) throw reglesError;

  // §6.2 : une règle acquired repasse une seule journée par mois dans le
  // tableau, pour vérifier qu'elle tient toujours — sans jamais compter
  // dans le score (calculerScoreJournalier ignore déjà tout statut
  // différent de « active »).
  const { data: reglesAcquises, error: acquisesError } = await supabase
    .from('rule_instance')
    .select('id, label, short_label, icon, category, points, is_thematic, bonus_value, status, acquired_at')
    .eq('child_id', childId)
    .eq('status', 'acquired')
    .not('acquired_at', 'is', null);
  if (acquisesError) throw acquisesError;

  const reglesEnControle = (reglesAcquises ?? []).filter(
    (r) => r.acquired_at && estJourDeControle(r.acquired_at, date)
  );
  const reglesDuJour = [...(reglesActives ?? []), ...reglesEnControle];

  let { data: dayEntry, error: dayEntryError } = await supabase
    .from('day_entry')
    .select('id, points_total, threshold_applied, threshold_met, is_closed')
    .eq('child_id', childId)
    .eq('date', date)
    .maybeSingle();
  if (dayEntryError) throw dayEntryError;

  if (!dayEntry) {
    const { data: cree, error: creationError } = await supabase
      .from('day_entry')
      .insert({ child_id: childId, date, threshold_applied: thresholdApplied })
      .select('id, points_total, threshold_applied, threshold_met, is_closed')
      .single();
    if (creationError) throw creationError;
    dayEntry = cree;
  }

  const { data: checksExistants, error: checksError } = await supabase
    .from('rule_check')
    .select('rule_instance_id, state, points_awarded')
    .eq('day_entry_id', dayEntry.id);
  if (checksError) throw checksError;

  const checksParRegle = new Map((checksExistants ?? []).map((c) => [c.rule_instance_id, c]));
  const aCreer = reglesDuJour.filter((r) => !checksParRegle.has(r.id));
  if (aCreer.length > 0) {
    const { error: insertError } = await supabase
      .from('rule_check')
      .insert(aCreer.map((r) => ({ day_entry_id: dayEntry!.id, rule_instance_id: r.id })));
    if (insertError) throw insertError;
  }

  const checks: RuleCheckView[] = reglesDuJour.map((r) => {
    const existant = checksParRegle.get(r.id);
    return {
      ruleInstanceId: r.id,
      label: r.label,
      shortLabel: r.short_label,
      icon: r.icon,
      category: r.category as RuleCategory,
      points: r.points,
      isThematic: r.is_thematic,
      bonusValue: r.bonus_value,
      status: r.status,
      etat: (existant?.state as EtatRegle) ?? 'not_respected',
    };
  });

  return {
    dayEntryId: dayEntry.id,
    childId,
    date,
    thresholdApplied: dayEntry.threshold_applied,
    thresholdMet: dayEntry.threshold_met,
    pointsTotal: dayEntry.points_total,
    isClosed: dayEntry.is_closed,
    checks,
  };
}

async function pousserVersServeur(vue: DayEntryView): Promise<void> {
  await Promise.all(
    vue.checks.map((c) => {
      const pointsAwarded = c.etat === 'respected' ? (c.isThematic ? c.bonusValue : c.points) : 0;
      return supabase
        .from('rule_check')
        .update({ state: c.etat, points_awarded: pointsAwarded })
        .eq('day_entry_id', vue.dayEntryId)
        .eq('rule_instance_id', c.ruleInstanceId);
    })
  );

  await supabase
    .from('day_entry')
    .update({
      points_total: vue.pointsTotal,
      threshold_met: vue.thresholdMet,
      is_closed: vue.isClosed,
      closed_at: vue.isClosed ? new Date().toISOString() : null,
    })
    .eq('id', vue.dayEntryId);
}

// Pour consulter un jour passé sans en créer un s'il n'a jamais été utilisé
// (pas de fabrication rétroactive de données) — contrairement à
// getOrCreateDayEntry, dédiée au jour courant.
export async function fetchDayEntry(childId: string, date: string): Promise<DayEntryView | null> {
  const cle = cleDeCache(childId, date);

  const { data: dayEntry, error: dayEntryError } = await supabase
    .from('day_entry')
    .select('id, points_total, threshold_applied, threshold_met, is_closed')
    .eq('child_id', childId)
    .eq('date', date)
    .maybeSingle();
  if (dayEntryError) {
    const cache = await lireCache(cle);
    return cache;
  }
  if (!dayEntry) return null;

  const [{ data: reglesActives, error: reglesError }, { data: checksExistants, error: checksError }] =
    await Promise.all([
      supabase
        .from('rule_instance')
        .select('id, label, short_label, icon, category, points, is_thematic, bonus_value, status')
        .eq('child_id', childId),
      supabase.from('rule_check').select('rule_instance_id, state').eq('day_entry_id', dayEntry.id),
    ]);
  if (reglesError || checksError) {
    const cache = await lireCache(cle);
    return cache;
  }

  const checksParRegle = new Map((checksExistants ?? []).map((c) => [c.rule_instance_id, c]));
  const checks: RuleCheckView[] = (reglesActives ?? [])
    .filter((r) => checksParRegle.has(r.id))
    .map((r) => ({
      ruleInstanceId: r.id,
      label: r.label,
      shortLabel: r.short_label,
      icon: r.icon,
      category: r.category as RuleCategory,
      points: r.points,
      isThematic: r.is_thematic,
      bonusValue: r.bonus_value,
      status: r.status,
      etat: (checksParRegle.get(r.id)?.state as EtatRegle) ?? 'not_respected',
    }));

  const vue: DayEntryView = {
    dayEntryId: dayEntry.id,
    childId,
    date,
    thresholdApplied: dayEntry.threshold_applied,
    thresholdMet: dayEntry.threshold_met,
    pointsTotal: dayEntry.points_total,
    isClosed: dayEntry.is_closed,
    checks,
  };
  await ecrireCache(cle, vue);
  return vue;
}

// Pour le cumul hebdomadaire (§5.3) : lit les points_total et threshold_met
// déjà figés des jours de la semaine, sans en recalculer aucun — un jour
// absent (jamais ouvert) compte pour zéro point et seuil non atteint.
export async function fetchDayEntriesForDates(
  childId: string,
  dates: string[]
): Promise<{ date: string; pointsTotal: number; thresholdMet: boolean }[]> {
  const { data, error } = await supabase
    .from('day_entry')
    .select('date, points_total, threshold_met')
    .eq('child_id', childId)
    .in('date', dates);
  if (error) throw error;
  const parDate = new Map((data ?? []).map((j) => [j.date, j]));
  return dates.map((date) => {
    const jour = parDate.get(date);
    return { date, pointsTotal: jour?.points_total ?? 0, thresholdMet: jour?.threshold_met ?? false };
  });
}

export async function getOrCreateDayEntry(
  childId: string,
  date: string,
  thresholdApplied: number
): Promise<DayEntryView> {
  const cle = cleDeCache(childId, date);
  const cache = await lireCache(cle);

  try {
    const depuisServeur = await chargerDepuisServeur(childId, date, thresholdApplied);

    if (cache) {
      // Le cache local prime : on pousse ses états vers le serveur pour ne
      // pas perdre des cochages faits hors ligne, puis on renvoie le cache.
      const fusion: DayEntryView = {
        ...depuisServeur,
        isClosed: cache.isClosed || depuisServeur.isClosed,
        checks: depuisServeur.checks.map((c) => {
          const local = cache.checks.find((lc) => lc.ruleInstanceId === c.ruleInstanceId);
          return local ? { ...c, etat: local.etat } : c;
        }),
      };
      const totaux = recalculerTotaux(fusion.checks, fusion.thresholdApplied);
      const finale = { ...fusion, ...totaux };
      await pousserVersServeur(finale);
      await ecrireCache(cle, finale);
      return finale;
    }

    await ecrireCache(cle, depuisServeur);
    return depuisServeur;
  } catch (erreurReseau) {
    if (cache) return cache;
    throw erreurReseau;
  }
}

export async function mettreAJourCochage(
  vueActuelle: DayEntryView,
  ruleInstanceId: string,
  nouvelEtat: EtatRegle
): Promise<DayEntryView> {
  const checks = vueActuelle.checks.map((c) =>
    c.ruleInstanceId === ruleInstanceId ? { ...c, etat: nouvelEtat } : c
  );
  const totaux = recalculerTotaux(checks, vueActuelle.thresholdApplied);
  const nouvelleVue: DayEntryView = { ...vueActuelle, checks, ...totaux };

  await ecrireCache(cleDeCache(vueActuelle.childId, vueActuelle.date), nouvelleVue);

  try {
    await pousserVersServeur(nouvelleVue);
  } catch {
    // Hors ligne : le cache local a déjà la bonne valeur, on retentera au
    // prochain montage de l'écran ou à la prochaine action (§9.1).
  }

  return nouvelleVue;
}

export async function cloturerJournee(vueActuelle: DayEntryView): Promise<DayEntryView> {
  const nouvelleVue: DayEntryView = { ...vueActuelle, isClosed: true };
  await ecrireCache(cleDeCache(vueActuelle.childId, vueActuelle.date), nouvelleVue);

  try {
    await pousserVersServeur(nouvelleVue);
  } catch {
    // Idem : la clôture reste visible localement, se synchronisera plus tard.
  }

  return nouvelleVue;
}
