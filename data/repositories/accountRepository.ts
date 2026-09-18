import { strings } from '../../i18n/fr-FR';
import { supabase } from '../supabaseClient';

function remplir(gabarit: string, slots: Record<string, unknown>): string {
  return gabarit.replace(/\{(\w+)\}/g, (_, nom: string) => String(slots[nom] ?? ''));
}

function rendreObservation(cle: string, variante: number, slots: Record<string, unknown>): string {
  return remplir((strings as Record<string, string>)[`${cle}.${variante}`] ?? '', slots);
}

// Même gabarits fixes que app/(main)/bilan.tsx — le bilan hebdomadaire n'a
// pas de banque de variantes, seules les valeurs des slots varient.
function rendreBilanHebdomadaire(slots: Record<string, unknown>, rewardLabel: string | null): string[] {
  const lignes: string[] = [
    remplir(strings[(slots.daysThresholdMet as number) === 1 ? 'bilan.weekly.pointsSummary.one' : 'bilan.weekly.pointsSummary.other'], {
      points: slots.points as number,
      daysThresholdMet: slots.daysThresholdMet as number,
    }),
  ];
  if (slots.mostRegularRuleLabel) {
    lignes.push(remplir(strings['bilan.weekly.mostRegular'], { ruleLabel: slots.mostRegularRuleLabel as string }));
  }
  if (slots.showComparison && slots.mostImprovedRuleLabel) {
    lignes.push(remplir(strings['bilan.weekly.mostImproved'], { ruleLabel: slots.mostImprovedRuleLabel as string }));
  }
  if (rewardLabel) {
    lignes.push(remplir(strings['bilan.weekly.rewardUnlocked'], { rewardLabel }));
  }
  if (slots.focusRuleLabel) {
    lignes.push(remplir(strings['bilan.weekly.focus'], { ruleLabel: slots.focusRuleLabel as string }));
  }
  return lignes;
}

// §11.3 : export complet du foyer, format JSON lisible. Les bilans sont
// rendus en texte lisible au moment de l'export (§7.9 interdit de stocker
// le texte en base, pas de le produire pour un export ponctuel demandé
// par le parent).
export async function exporterDonneesFoyer(householdId: string): Promise<Record<string, unknown>> {
  const { data: household, error: householdError } = await supabase
    .from('household')
    .select('timezone, week_start_day, digest_time, created_at')
    .eq('id', householdId)
    .single();
  if (householdError || !household) throw householdError ?? new Error('household introuvable');

  const { data: caregivers, error: caregiversError } = await supabase
    .from('caregiver')
    .select('display_name, role, created_at')
    .eq('household_id', householdId);
  if (caregiversError) throw caregiversError;

  const { data: consentRecords, error: consentError } = await supabase
    .from('consent_record')
    .select('type, version, given_at, revoked_at')
    .eq('household_id', householdId);
  if (consentError) throw consentError;

  const { data: children, error: childrenError } = await supabase
    .from('child')
    .select('id, first_name, birth_date, settings, is_active, created_at')
    .eq('household_id', householdId);
  if (childrenError) throw childrenError;

  const childrenExport = await Promise.all(
    (children ?? []).map(async (child) => {
      const [rules, rewards, dayEntries, weekSummaries, rewardGrants, dailyDigests, weeklyDigests] = await Promise.all([
        supabase
          .from('rule_instance')
          .select('label, short_label, points, is_thematic, bonus_value, status, started_at, acquired_at, retired_at')
          .eq('child_id', child.id),
        supabase
          .from('reward_instance')
          .select('label, category, tier, is_available, created_at, last_granted_at')
          .eq('child_id', child.id),
        supabase
          .from('day_entry')
          .select('id, date, points_total, threshold_applied, threshold_met, is_closed')
          .eq('child_id', child.id)
          .order('date'),
        supabase
          .from('week_summary')
          .select('iso_year, iso_week, points_total, days_threshold_met, weekly_threshold_applied, weekly_threshold_met')
          .eq('child_id', child.id)
          .order('iso_year')
          .order('iso_week'),
        supabase
          .from('reward_grant')
          .select('tier, week_summary_id, granted_at, redeemed_at, reward_instance:reward_instance_id (label)')
          .eq('child_id', child.id),
        supabase
          .from('daily_digest')
          .select('date, observation_type, template_key, template_variant, question_key, question_variant, slots, read_at, shared_at')
          .eq('child_id', child.id)
          .order('date'),
        supabase
          .from('weekly_digest')
          .select('week_summary_id, slots, read_at, shared_at, week_summary:week_summary_id (iso_year, iso_week)')
          .eq('child_id', child.id),
      ]);

      const recompenseHebdoParSemaine = new Map<string, string>();
      for (const grant of rewardGrants.data ?? []) {
        if (grant.tier === 'weekly' && grant.week_summary_id) {
          const label = (grant.reward_instance as unknown as { label: string } | null)?.label;
          if (label) recompenseHebdoParSemaine.set(grant.week_summary_id, label);
        }
      }

      const dayEntryIds = (dayEntries.data ?? []).map((d) => d.id);
      const { data: ruleChecks } = dayEntryIds.length
        ? await supabase
            .from('rule_check')
            .select('day_entry_id, state, points_awarded, rule_instance:rule_instance_id (label)')
            .in('day_entry_id', dayEntryIds)
        : { data: [] as { day_entry_id: string; state: string; points_awarded: number; rule_instance: unknown }[] };

      const checksParJour = new Map<string, { ruleLabel: string; state: string; pointsAwarded: number }[]>();
      for (const check of ruleChecks ?? []) {
        const liste = checksParJour.get(check.day_entry_id) ?? [];
        liste.push({
          ruleLabel: (check.rule_instance as unknown as { label: string } | null)?.label ?? '',
          state: check.state,
          pointsAwarded: check.points_awarded,
        });
        checksParJour.set(check.day_entry_id, liste);
      }

      return {
        firstName: child.first_name,
        birthDate: child.birth_date,
        settings: child.settings,
        isActive: child.is_active,
        createdAt: child.created_at,
        rules: (rules.data ?? []).map((r) => ({
          label: r.label,
          shortLabel: r.short_label,
          points: r.points,
          isThematic: r.is_thematic,
          bonusValue: r.bonus_value,
          status: r.status,
          startedAt: r.started_at,
          acquiredAt: r.acquired_at,
          retiredAt: r.retired_at,
        })),
        rewards: (rewards.data ?? []).map((r) => ({
          label: r.label,
          category: r.category,
          tier: r.tier,
          isAvailable: r.is_available,
          createdAt: r.created_at,
          lastGrantedAt: r.last_granted_at,
        })),
        days: (dayEntries.data ?? []).map((d) => ({
          date: d.date,
          pointsTotal: d.points_total,
          thresholdApplied: d.threshold_applied,
          thresholdMet: d.threshold_met,
          isClosed: d.is_closed,
          checks: checksParJour.get(d.id) ?? [],
        })),
        weekSummaries: weekSummaries.data ?? [],
        rewardGrants: (rewardGrants.data ?? []).map((g) => ({
          tier: g.tier,
          grantedAt: g.granted_at,
          redeemedAt: g.redeemed_at,
          rewardLabel: (g.reward_instance as unknown as { label: string } | null)?.label ?? null,
        })),
        dailyDigests: (dailyDigests.data ?? []).map((d) => ({
          date: d.date,
          observationType: d.observation_type,
          observationText: rendreObservation(d.template_key, d.template_variant, (d.slots as Record<string, unknown>) ?? {}),
          questionText: rendreObservation(d.question_key, d.question_variant, (d.slots as Record<string, unknown>) ?? {}),
          readAt: d.read_at,
          sharedAt: d.shared_at,
        })),
        weeklyDigests: (weeklyDigests.data ?? []).map((d) => {
          const weekSummary = d.week_summary as unknown as { iso_year: number; iso_week: number } | null;
          const rewardLabel = recompenseHebdoParSemaine.get(d.week_summary_id) ?? null;
          return {
            isoYear: weekSummary?.iso_year ?? null,
            isoWeek: weekSummary?.iso_week ?? null,
            texte: rendreBilanHebdomadaire((d.slots as Record<string, unknown>) ?? {}, rewardLabel),
            readAt: d.read_at,
            sharedAt: d.shared_at,
          };
        }),
      };
    })
  );

  return {
    exportedAt: new Date().toISOString(),
    household: {
      timezone: household.timezone,
      weekStartDay: household.week_start_day,
      digestTime: household.digest_time,
      createdAt: household.created_at,
    },
    caregivers: (caregivers ?? []).map((c) => ({ displayName: c.display_name, role: c.role, createdAt: c.created_at })),
    consentRecords: (consentRecords ?? []).map((c) => ({
      type: c.type,
      version: c.version,
      givenAt: c.given_at,
      revokedAt: c.revoked_at,
    })),
    children: childrenExport,
  };
}

// §11.3 : suppression effective immédiatement (largement sous les 30 jours
// prévus), y compris la télémétrie liée au foyer. La suppression du foyer
// entraîne en cascade celle des enfants, règles, jours, bilans, etc.
// Ne supprime pas le compte d'authentification lui-même — une opération
// cliente ne peut pas le faire sans la clé de service, qui ne doit jamais
// quitter le serveur ; il faudra une fonction serveur dédiée pour ce
// dernier pas.
export async function supprimerCompte(householdId: string): Promise<void> {
  await supabase.rpc('supprimer_telemetrie_foyer', { p_household_id: householdId });

  const { error } = await supabase.from('household').delete().eq('id', householdId);
  if (error) throw error;

  await supabase.auth.signOut();
}
