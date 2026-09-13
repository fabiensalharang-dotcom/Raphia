import {
  choisirVariante,
  detecterCloseToThreshold,
  detecterFirstTime,
  detecterPerfectDay,
  detecterRecovery,
  detecterRuleStruggling,
  detecterThresholdFirstOfWeek,
  detecterWeeklyPace,
  evaluerObservation,
  type CandidatRegle,
  type CandidatSerie,
  type DonneesObservation,
  type ObservationType,
} from '../../core/bilan';
import {
  calculerCumulHebdomadaire,
  calculerSerieEnCours,
  calculerTauxReussiteParRegle,
  datesDeLaSemaine,
  semaineIso,
  type CochageRegle,
  type EtatRegle,
  type JourDeSerie,
} from '../../core/scoring';
import { fetchDayEntriesForDates } from './dayEntryRepository';
import { fetchHistoriqueRegles } from './pilotageRepository';
import { supabase } from '../supabaseClient';

const NB_VARIANTES_OBSERVATION = 5;
const NB_VARIANTES_QUESTION = 4;
const SERIE_STREAK_BUILDING = 3;
const FENETRE_SERIE = 30;
const FENETRE_RULE_STRUGGLING = 7;
const CADENCE_RULE_STRUGGLING_JOURS = 7;

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

function ajouterJours(date: string, delta: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

async function fetchIdsReglesEnEchecEnAttente(childId: string): Promise<Set<string>> {
  // §7.5-4 : pas de doublon avec le pilotage — une règle déjà signalée en
  // attente côté pilotage (rule_failing) n'est jamais reprise dans le bilan.
  const { data, error } = await supabase
    .from('pilotage_suggestion')
    .select('payload')
    .eq('child_id', childId)
    .eq('type', 'rule_failing')
    .eq('status', 'pending');
  if (error) throw error;
  return new Set(
    (data ?? [])
      .map((s) => (s.payload as { ruleInstanceId?: string } | null)?.ruleInstanceId)
      .filter((id): id is string => !!id)
  );
}

// §6.1 : passe quotidienne à la clôture. Idempotent — un bilan déjà figé
// pour ce day_entry n'est jamais recalculé (garde-fou #17, même principe
// que week_summary).
export async function genererBilanDuJour(childId: string, dayEntryId: string, timezone: string): Promise<void> {
  const { data: existant, error: existantError } = await supabase
    .from('daily_digest')
    .select('id')
    .eq('day_entry_id', dayEntryId)
    .maybeSingle();
  if (existantError) throw existantError;
  if (existant) return;

  const { data: dayEntry, error: dayEntryError } = await supabase
    .from('day_entry')
    .select('date, points_total, threshold_applied, threshold_met')
    .eq('id', dayEntryId)
    .single();
  if (dayEntryError || !dayEntry) throw dayEntryError ?? new Error('day_entry introuvable');
  const aujourdHui = dayEntry.date;

  const { data: child, error: childError } = await supabase
    .from('child')
    .select('household_id, settings')
    .eq('id', childId)
    .single();
  if (childError || !child) throw childError ?? new Error('child introuvable');

  const { data: household, error: householdError } = await supabase
    .from('household')
    .select('week_start_day')
    .eq('id', child.household_id)
    .single();
  if (householdError || !household) throw householdError ?? new Error('household introuvable');

  const { data: reglesActives, error: reglesError } = await supabase
    .from('rule_instance')
    .select('id, label, display_order')
    .eq('child_id', childId)
    .eq('status', 'active')
    .order('display_order');
  if (reglesError) throw reglesError;
  const regles = reglesActives ?? [];

  const { data: checksAujourdhui, error: checksError } = await supabase
    .from('rule_check')
    .select('rule_instance_id, state')
    .eq('day_entry_id', dayEntryId);
  if (checksError) throw checksError;
  const etatParRegleAujourdhui = new Map((checksAujourdhui ?? []).map((c) => [c.rule_instance_id, c.state as EtatRegle]));

  // recovery, threshold_first_of_week, weekly_pace, rule_struggling (filtre
  // 1) ont besoin des jours calendaires et/ou de la semaine en cours.
  const jourMoins1 = ajouterJours(aujourdHui, -1);
  const jourMoins2 = ajouterJours(aujourdHui, -2);
  const [deuxDerniersJours, datesSemaine] = await Promise.all([
    fetchDayEntriesForDates(childId, [jourMoins1, jourMoins2]),
    Promise.resolve(datesDeLaSemaine(aujourdHui, household.week_start_day)),
  ]);
  const joursSemaine = await fetchDayEntriesForDates(childId, datesSemaine);
  const indexAujourdhui = datesSemaine.indexOf(aujourdHui);
  const joursAvantCetteSemaine = joursSemaine.slice(0, indexAujourdhui);

  const recovery = detecterRecovery(
    dayEntry.threshold_met,
    [jourMoins1, jourMoins2].map((date) => ({
      thresholdMet: deuxDerniersJours.find((j) => j.date === date)?.thresholdMet ?? false,
    }))
  );

  const thresholdFirstOfWeek = detecterThresholdFirstOfWeek(
    dayEntry.threshold_met,
    joursAvantCetteSemaine.map((j) => ({ thresholdMet: j.thresholdMet }))
  );

  const weeklyThreshold = (child.settings as { weeklyThreshold?: number })?.weeklyThreshold ?? 5;
  const cumulSemaine = calculerCumulHebdomadaire(
    joursSemaine.map((j) => ({ thresholdMet: j.thresholdMet, pointsTotal: j.pointsTotal })),
    weeklyThreshold
  );
  const weeklyPace = detecterWeeklyPace(cumulSemaine.daysThresholdMet, weeklyThreshold);

  const closeToThreshold = detecterCloseToThreshold(dayEntry.points_total, dayEntry.threshold_applied);

  const checksPourPerfectDay = regles.map((r) => ({
    etat: etatParRegleAujourdhui.get(r.id) ?? ('not_respected' as EtatRegle),
    status: 'active' as const,
  }));
  const perfectDay = detecterPerfectDay(checksPourPerfectDay);

  // first_time : parmi les règles respectées aujourd'hui, laquelle ne
  // l'a jamais été avant (recherche sur tout l'historique, pas une fenêtre).
  let firstTime: CandidatRegle | null = null;
  const respecteesAujourdhui = regles.filter((r) => etatParRegleAujourdhui.get(r.id) === 'respected');
  if (respecteesAujourdhui.length > 0) {
    const { data: joursAnterieurs, error: joursAnterieursError } = await supabase
      .from('day_entry')
      .select('id')
      .eq('child_id', childId)
      .lt('date', aujourdHui);
    if (joursAnterieursError) throw joursAnterieursError;
    const idsJoursAnterieurs = (joursAnterieurs ?? []).map((j) => j.id);

    let dejaRespecteesAvant = new Set<string>();
    if (idsJoursAnterieurs.length > 0) {
      const { data: cochagesAnterieurs, error: cochagesAnterieursError } = await supabase
        .from('rule_check')
        .select('rule_instance_id')
        .in('day_entry_id', idsJoursAnterieurs)
        .in('rule_instance_id', respecteesAujourdhui.map((r) => r.id))
        .eq('state', 'respected');
      if (cochagesAnterieursError) throw cochagesAnterieursError;
      dejaRespecteesAvant = new Set((cochagesAnterieurs ?? []).map((c) => c.rule_instance_id));
    }

    const candidate = respecteesAujourdhui.find((r) => !dejaRespecteesAvant.has(r.id));
    if (candidate) firstTime = { ruleInstanceId: candidate.id, label: candidate.label };
  }

  // streak_building : plus longue série en cours (≥ 3 jours), calculée sur
  // une fenêtre large pour ne jamais sous-estimer une série ancienne.
  let streakBuilding: CandidatSerie | null = null;
  {
    const { dates, etatsParRegle } = await fetchHistoriqueRegles(
      childId,
      timezone,
      aujourdHui,
      regles.map((r) => r.id),
      FENETRE_SERIE
    );
    for (const regle of regles) {
      const etatsRegle = etatsParRegle.get(regle.id);
      const joursRegle: JourDeSerie[] = dates.map((date) => ({ state: etatsRegle?.get(date) ?? null }));
      const serie = calculerSerieEnCours(joursRegle);
      if (serie >= SERIE_STREAK_BUILDING) {
        streakBuilding = { ruleInstanceId: regle.id, label: regle.label, days: serie };
        break;
      }
    }
  }

  // rule_struggling : filtres §7.5 (1, 2/5, 4) appliqués avant le détecteur.
  let ruleStruggling: CandidatRegle | null = null;
  const deuxJoursSousLeSeuil = [jourMoins1, jourMoins2].every(
    (date) => !(deuxDerniersJours.find((j) => j.date === date)?.thresholdMet ?? false)
  );
  if (!deuxJoursSousLeSeuil) {
    const { data: digestsRecents, error: digestsRecentsError } = await supabase
      .from('daily_digest')
      .select('id')
      .eq('child_id', childId)
      .eq('observation_type', 'rule_struggling')
      .gte('date', dateDuJourDansFuseau(timezone, -(CADENCE_RULE_STRUGGLING_JOURS - 1)))
      .limit(1);
    if (digestsRecentsError) throw digestsRecentsError;

    if (!digestsRecents || digestsRecents.length === 0) {
      const idsBloques = await fetchIdsReglesEnEchecEnAttente(childId);
      const { dates, etatsParRegle } = await fetchHistoriqueRegles(
        childId,
        timezone,
        aujourdHui,
        regles.map((r) => r.id),
        FENETRE_RULE_STRUGGLING
      );
      for (const regle of regles) {
        if (idsBloques.has(regle.id)) continue;
        const etatsRegle = etatsParRegle.get(regle.id);
        const etatsApplicables = dates
          .map((date) => etatsRegle?.get(date) ?? null)
          .filter((etat): etat is EtatRegle => etat !== null && etat !== 'not_applicable');
        if (detecterRuleStruggling(etatsApplicables)) {
          ruleStruggling = { ruleInstanceId: regle.id, label: regle.label };
          break;
        }
      }
    }
  }

  const { data: digestHier, error: digestHierError } = await supabase
    .from('daily_digest')
    .select('observation_type')
    .eq('child_id', childId)
    .eq('date', jourMoins1)
    .maybeSingle();
  if (digestHierError) throw digestHierError;
  const typeHier = (digestHier?.observation_type as ObservationType | undefined) ?? null;

  const donnees: DonneesObservation = {
    recovery,
    firstTime,
    streakBuilding,
    perfectDay,
    thresholdFirstOfWeek,
    weeklyPace,
    closeToThreshold,
    ruleStruggling,
  };
  const observation = evaluerObservation(donnees, typeHier);

  const { data: historiqueType, error: historiqueTypeError } = await supabase
    .from('daily_digest')
    .select('template_variant, question_variant, date')
    .eq('child_id', childId)
    .eq('observation_type', observation.type);
  if (historiqueTypeError) throw historiqueTypeError;

  const templateVariant = choisirVariante(
    NB_VARIANTES_OBSERVATION,
    (historiqueType ?? []).map((h) => ({ variant: h.template_variant, date: h.date }))
  );
  const questionVariant = choisirVariante(
    NB_VARIANTES_QUESTION,
    (historiqueType ?? []).map((h) => ({ variant: h.question_variant, date: h.date }))
  );

  let slots: Record<string, unknown> = {};
  if (observation.type === 'first_time' || observation.type === 'rule_struggling') {
    slots = { ruleLabel: observation.label };
  } else if (observation.type === 'streak_building') {
    slots = { ruleLabel: observation.label, days: observation.days };
  }

  const { error: insertError } = await supabase.from('daily_digest').insert({
    child_id: childId,
    day_entry_id: dayEntryId,
    date: aujourdHui,
    observation_type: observation.type,
    template_key: `bilan.observation.${observation.type}`,
    template_variant: templateVariant,
    question_key: `bilan.question.${observation.type}`,
    question_variant: questionVariant,
    slots,
  });
  if (insertError) throw insertError;
}

async function fetchEtatsPourDates(
  childId: string,
  ruleIds: string[],
  dates: string[]
): Promise<Map<string, Map<string, EtatRegle>>> {
  if (ruleIds.length === 0 || dates.length === 0) return new Map();
  const { data: dayEntries, error: dayEntriesError } = await supabase
    .from('day_entry')
    .select('id, date')
    .eq('child_id', childId)
    .in('date', dates);
  if (dayEntriesError) throw dayEntriesError;
  if (!dayEntries || dayEntries.length === 0) return new Map();

  const { data: cochages, error: cochagesError } = await supabase
    .from('rule_check')
    .select('rule_instance_id, state, day_entry_id')
    .in('day_entry_id', dayEntries.map((d) => d.id))
    .in('rule_instance_id', ruleIds);
  if (cochagesError) throw cochagesError;

  const dateParDayEntryId = new Map(dayEntries.map((d) => [d.id, d.date]));
  const etatsParRegle = new Map<string, Map<string, EtatRegle>>();
  for (const cochage of cochages ?? []) {
    const date = dateParDayEntryId.get(cochage.day_entry_id);
    if (!date) continue;
    if (!etatsParRegle.has(cochage.rule_instance_id)) etatsParRegle.set(cochage.rule_instance_id, new Map());
    etatsParRegle.get(cochage.rule_instance_id)!.set(date, cochage.state);
  }
  return etatsParRegle;
}

function construireCochages(
  dates: string[],
  etatsParRegle: Map<string, Map<string, EtatRegle>>,
  regles: { id: string; label: string }[]
): CochageRegle[] {
  const cochages: CochageRegle[] = [];
  for (const regle of regles) {
    const etatsRegle = etatsParRegle.get(regle.id);
    for (const date of dates) {
      const etat = etatsRegle?.get(date);
      if (etat) cochages.push({ ruleInstanceId: regle.id, label: regle.label, state: etat });
    }
  }
  return cochages;
}

// §7.8 : bilan hebdomadaire, déclenché à la clôture du dernier jour de la
// semaine, une fois par semaine (unicité portée par week_summary_id).
export async function genererBilanHebdomadaireSiAbsent(
  childId: string,
  weekSummaryId: string,
  weekStartDay: number,
  dateDernierJour: string
): Promise<void> {
  const { data: existant, error: existantError } = await supabase
    .from('weekly_digest')
    .select('id')
    .eq('week_summary_id', weekSummaryId)
    .maybeSingle();
  if (existantError) throw existantError;
  if (existant) return;

  const { data: weekSummary, error: weekSummaryError } = await supabase
    .from('week_summary')
    .select('points_total, days_threshold_met')
    .eq('id', weekSummaryId)
    .single();
  if (weekSummaryError || !weekSummary) throw weekSummaryError ?? new Error('week_summary introuvable');

  const datesSemaine = datesDeLaSemaine(dateDernierJour, weekStartDay);
  const datesSemainePrecedente = datesDeLaSemaine(ajouterJours(datesSemaine[0], -1), weekStartDay);

  const { data: toutesLesRegles, error: reglesError } = await supabase
    .from('rule_instance')
    .select('id, label')
    .eq('child_id', childId);
  if (reglesError) throw reglesError;
  const regles = toutesLesRegles ?? [];
  const ruleIds = regles.map((r) => r.id);

  const [etatsCetteSemaine, etatsSemainePrecedente] = await Promise.all([
    fetchEtatsPourDates(childId, ruleIds, datesSemaine),
    fetchEtatsPourDates(childId, ruleIds, datesSemainePrecedente),
  ]);

  const tauxCetteSemaine = calculerTauxReussiteParRegle(construireCochages(datesSemaine, etatsCetteSemaine, regles));
  const tauxSemainePrecedente = calculerTauxReussiteParRegle(
    construireCochages(datesSemainePrecedente, etatsSemainePrecedente, regles)
  );

  const tauxPrecedentParRegle = new Map(tauxSemainePrecedente.map((t) => [t.ruleInstanceId, t.tauxReussite]));
  let mostImproved: { label: string; delta: number } | null = null;
  for (const t of tauxCetteSemaine) {
    const avant = tauxPrecedentParRegle.get(t.ruleInstanceId);
    if (avant === undefined) continue;
    const delta = t.tauxReussite - avant;
    if (delta > 0 && (!mostImproved || delta > mostImproved.delta)) {
      mostImproved = { label: t.label, delta };
    }
  }

  const idsBloques = await fetchIdsReglesEnEchecEnAttente(childId);
  const candidatsFocus = tauxCetteSemaine.filter((t) => !idsBloques.has(t.ruleInstanceId));
  const focus = candidatsFocus.length > 0 ? candidatsFocus[candidatsFocus.length - 1] : null;

  // §7.8 : comparaison à la semaine précédente, seul endroit du produit où
  // elle est autorisée — et seulement si elle est positive ou stable.
  const { isoYear: yearPrec, isoWeek: weekPrec } = semaineIso(datesSemainePrecedente[0]);
  const { data: weekSummaryPrecedent, error: weekSummaryPrecedentError } = await supabase
    .from('week_summary')
    .select('days_threshold_met')
    .eq('child_id', childId)
    .eq('iso_year', yearPrec)
    .eq('iso_week', weekPrec)
    .maybeSingle();
  if (weekSummaryPrecedentError) throw weekSummaryPrecedentError;
  const showComparison = !!weekSummaryPrecedent && weekSummary.days_threshold_met >= weekSummaryPrecedent.days_threshold_met;

  // La récompense n'est jamais figée ici : au moment de la clôture qui
  // génère ce bilan, le parent n'a souvent pas encore choisi la récompense
  // hebdomadaire (choix fait juste après, en Mode Affichage). Comme pour
  // les règles tenues du bilan quotidien, elle est relue en direct à
  // l'affichage plutôt que stockée dans les slots (fetchLatestWeeklyDigest).
  const slots: Record<string, unknown> = {
    points: weekSummary.points_total,
    daysThresholdMet: weekSummary.days_threshold_met,
    mostRegularRuleLabel: tauxCetteSemaine[0]?.label ?? null,
    mostImprovedRuleLabel: mostImproved?.label ?? null,
    showComparison,
    focusRuleLabel: focus?.label ?? null,
  };

  const { error: insertError } = await supabase.from('weekly_digest').insert({
    child_id: childId,
    week_summary_id: weekSummaryId,
    template_key: 'bilan.weekly.template',
    template_variant: 0,
    slots,
  });
  if (insertError) throw insertError;
}

export type DailyDigestData = {
  childName: string;
  date: string;
  heldRuleLabels: string[];
  pointsTotal: number;
  thresholdMet: boolean;
  templateKey: string;
  templateVariant: number;
  questionKey: string;
  questionVariant: number;
  slots: Record<string, unknown>;
};

export async function fetchDailyDigest(childId: string, date: string): Promise<DailyDigestData | null> {
  const { data: child, error: childError } = await supabase.from('child').select('first_name').eq('id', childId).single();
  if (childError || !child) throw childError ?? new Error('child introuvable');

  const { data: dayEntry, error: dayEntryError } = await supabase
    .from('day_entry')
    .select('id, points_total, threshold_met')
    .eq('child_id', childId)
    .eq('date', date)
    .maybeSingle();
  if (dayEntryError) throw dayEntryError;
  if (!dayEntry) return null;

  const { data: digest, error: digestError } = await supabase
    .from('daily_digest')
    .select('id, template_key, template_variant, question_key, question_variant, slots, read_at')
    .eq('day_entry_id', dayEntry.id)
    .maybeSingle();
  if (digestError) throw digestError;
  if (!digest) return null;

  const { data: checks, error: checksError } = await supabase
    .from('rule_check')
    .select('state, rule_instance:rule_instance_id (label, status)')
    .eq('day_entry_id', dayEntry.id);
  if (checksError) throw checksError;
  const heldRuleLabels = (checks ?? [])
    .filter((c) => c.state === 'respected' && (c.rule_instance as unknown as { status: string } | null)?.status === 'active')
    .map((c) => (c.rule_instance as unknown as { label: string }).label);

  if (!digest.read_at) {
    await supabase.from('daily_digest').update({ read_at: new Date().toISOString() }).eq('id', digest.id);
  }

  return {
    childName: child.first_name,
    date,
    heldRuleLabels,
    pointsTotal: dayEntry.points_total,
    thresholdMet: dayEntry.threshold_met,
    templateKey: digest.template_key,
    templateVariant: digest.template_variant,
    questionKey: digest.question_key,
    questionVariant: digest.question_variant,
    slots: (digest.slots as Record<string, unknown>) ?? {},
  };
}

export type WeeklyDigestData = {
  isoYear: number;
  isoWeek: number;
  slots: Record<string, unknown>;
  rewardLabel: string | null;
};

export async function fetchLatestWeeklyDigest(childId: string): Promise<WeeklyDigestData | null> {
  const { data, error } = await supabase
    .from('weekly_digest')
    .select('id, week_summary_id, slots, read_at, week_summary:week_summary_id (iso_year, iso_week)')
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  if (!data.read_at) {
    await supabase.from('weekly_digest').update({ read_at: new Date().toISOString() }).eq('id', data.id);
  }

  // §7.8 : la récompense hebdomadaire est lue en direct (elle peut avoir
  // été choisie après la génération du bilan, voir genererBilanHebdomadaireSiAbsent).
  const { data: rewardGrant, error: rewardGrantError } = await supabase
    .from('reward_grant')
    .select('reward_instance:reward_instance_id (label)')
    .eq('week_summary_id', data.week_summary_id)
    .eq('tier', 'weekly')
    .maybeSingle();
  if (rewardGrantError) throw rewardGrantError;
  const rewardLabel = (rewardGrant?.reward_instance as unknown as { label: string } | null)?.label ?? null;

  const weekSummary = data.week_summary as unknown as { iso_year: number; iso_week: number };
  return {
    isoYear: weekSummary.iso_year,
    isoWeek: weekSummary.iso_week,
    slots: (data.slots as Record<string, unknown>) ?? {},
    rewardLabel,
  };
}
