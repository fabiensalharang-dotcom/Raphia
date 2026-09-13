import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { genererBilanDuJour, genererBilanHebdomadaireSiAbsent } from '../../data/repositories/bilanRepository';
import { estDernierJourDeLaSemaine, estJourModifiable } from '../../core/scoring';
import type { EtatRegle } from '../../core/scoring/types';
import {
  cloturerJournee,
  fetchDayEntry,
  getOrCreateDayEntry,
  mettreAJourCochage,
  type DayEntryView,
} from '../../data/repositories/dayEntryRepository';
import { evaluerEtCreerSuggestion, verifierControlesPonctuels } from '../../data/repositories/pilotageRepository';
import {
  fetchRecompensesEnAttente,
  marquerConsommee,
  type PendingRewardGrant,
} from '../../data/repositories/rewardGrantRepository';
import { creerResumeSiAbsent } from '../../data/repositories/weekSummaryRepository';
import { supabase } from '../../data/supabaseClient';
import {
  demanderAutorisationSiPremierRituel,
  programmerNotificationAnniversaire,
  programmerNotificationBilan,
  programmerNotificationBilanHebdomadaire,
} from '../../data/notifications';
import { useOnboardingState } from '../../data/useOnboardingState';
import { strings } from '../../i18n/fr-FR';

function dateDuJourDansFuseau(timezone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

function ajouterJours(date: string, delta: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function formaterDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function suivantEtat(etatActuel: EtatRegle): EtatRegle {
  return etatActuel === 'respected' ? 'not_respected' : 'respected';
}

export default function Today() {
  const onboarding = useOnboardingState();
  const [timezone, setTimezone] = useState<string | null>(null);
  const [weekStartDay, setWeekStartDay] = useState<number | null>(null);
  const [digestTime, setDigestTime] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayView, setDayView] = useState<DayEntryView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingRewards, setPendingRewards] = useState<PendingRewardGrant[]>([]);

  const householdId = onboarding.status === 'ready' ? onboarding.householdId : null;
  const childId = onboarding.status === 'ready' ? onboarding.childId : null;

  useEffect(() => {
    if (!householdId) return;
    let cancelled = false;

    async function initialiser() {
      const { data: household, error: householdError } = await supabase
        .from('household')
        .select('timezone, week_start_day, digest_time')
        .eq('id', householdId as string)
        .single();
      if (cancelled) return;
      if (householdError || !household) {
        setError(strings['today.error']);
        return;
      }
      setTimezone(household.timezone);
      setWeekStartDay(household.week_start_day);
      setDigestTime(household.digest_time);
      setSelectedDate(dateDuJourDansFuseau(household.timezone));
    }

    initialiser();
    return () => {
      cancelled = true;
    };
  }, [householdId]);

  useEffect(() => {
    if (!childId || !timezone || !selectedDate) return;
    let cancelled = false;

    async function charger() {
      setLoading(true);
      setError(null);
      try {
        const aujourdHui = dateDuJourDansFuseau(timezone as string);
        if (selectedDate === aujourdHui) {
          const { data: child, error: childError } = await supabase
            .from('child')
            .select('settings, birth_date')
            .eq('id', childId as string)
            .single();
          if (childError || !child) throw childError ?? new Error('child introuvable');
          const seuil = (child.settings as { dailyThreshold: number }).dailyThreshold;
          const vue = await getOrCreateDayEntry(childId as string, selectedDate as string, seuil);
          if (!cancelled) setDayView(vue);
          // §6.6, §8.7 : programmée une fois pour toutes, se répète chaque
          // année — un identifiant stable côté notification évite les doublons.
          programmerNotificationAnniversaire(childId as string, child.birth_date).catch(() => {});
        } else {
          const vue = await fetchDayEntry(childId as string, selectedDate as string);
          if (!cancelled) setDayView(vue);
        }
      } catch {
        if (!cancelled) setError(strings['today.error']);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    charger();
    return () => {
      cancelled = true;
    };
  }, [childId, timezone, selectedDate]);

  useEffect(() => {
    rafraichirRecompensesEnAttente();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

  async function rafraichirRecompensesEnAttente() {
    if (!childId) return;
    const liste = await fetchRecompensesEnAttente(childId);
    setPendingRewards(liste);
  }

  if (onboarding.status === 'loading') {
    return <View style={{ flex: 1 }} />;
  }
  if (onboarding.status !== 'ready') {
    return <Redirect href="/" />;
  }

  const aujourdHui = timezone ? dateDuJourDansFuseau(timezone) : null;
  const peutAllerAuJourSuivant = selectedDate !== null && aujourdHui !== null && selectedDate < aujourdHui;
  const modifiable =
    dayView !== null &&
    !dayView.isClosed &&
    timezone !== null &&
    estJourModifiable(dayView.date, new Date(), timezone);

  async function basculer(ruleInstanceId: string, etatActuel: EtatRegle) {
    if (!dayView || !modifiable) return;
    const nouvelEtat = suivantEtat(etatActuel);
    const nouvelleVue = await mettreAJourCochage(dayView, ruleInstanceId, nouvelEtat);
    setDayView(nouvelleVue);
  }

  async function basculerNonApplicable(ruleInstanceId: string, etatActuel: EtatRegle) {
    if (!dayView || !modifiable) return;
    const nouvelEtat: EtatRegle = etatActuel === 'not_applicable' ? 'not_respected' : 'not_applicable';
    const nouvelleVue = await mettreAJourCochage(dayView, ruleInstanceId, nouvelEtat);
    setDayView(nouvelleVue);
  }

  async function cloturer() {
    if (!dayView || !modifiable) return;
    const nouvelleVue = await cloturerJournee(dayView);
    setDayView(nouvelleVue);

    // §6.2 : corrige le statut d'une règle en contrôle ponctuel avant
    // d'évaluer les déclencheurs, pour ne pas suggérer sur une base fausse.
    // §7.10 : le bilan est généré à la clôture, jamais avant.
    if (childId && timezone) {
      try {
        await verifierControlesPonctuels(nouvelleVue.dayEntryId);
        await evaluerEtCreerSuggestion(childId, timezone);
        await genererBilanDuJour(childId, nouvelleVue.dayEntryId, timezone);
        await demanderAutorisationSiPremierRituel(childId);
        if (digestTime) await programmerNotificationBilan(digestTime);

        if (weekStartDay !== null && estDernierJourDeLaSemaine(nouvelleVue.date, weekStartDay)) {
          const { data: child } = await supabase.from('child').select('settings').eq('id', childId).single();
          const weeklyThreshold = (child?.settings as { weeklyThreshold?: number })?.weeklyThreshold ?? 5;
          const resume = await creerResumeSiAbsent(childId, nouvelleVue.date, weekStartDay, weeklyThreshold);
          await genererBilanHebdomadaireSiAbsent(childId, resume.id, weekStartDay, nouvelleVue.date);
          if (digestTime) await programmerNotificationBilanHebdomadaire(digestTime);
        }
      } catch {
        // Le pilotage et le bilan sont une couche secondaire : une erreur
        // ici ne doit jamais bloquer la clôture, déjà actée localement et
        // côté serveur.
      }
    }

    // §7.2 : la séquence enfant se joue en Mode Affichage, déclenchée par
    // la clôture de la journée.
    if (childId) router.push(`/display/${childId}`);
  }

  async function consommer(grantId: string) {
    await marquerConsommee(grantId);
    rafraichirRecompensesEnAttente();
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.dateRow}>
        <TouchableOpacity onPress={() => selectedDate && setSelectedDate(ajouterJours(selectedDate, -1))}>
          <Text style={styles.dateArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.date}>{selectedDate ? formaterDate(selectedDate) : ''}</Text>
        <TouchableOpacity
          onPress={() => selectedDate && setSelectedDate(ajouterJours(selectedDate, 1))}
          disabled={!peutAllerAuJourSuivant}
        >
          <Text style={[styles.dateArrow, !peutAllerAuJourSuivant && styles.dateArrowDisabled]}>›</Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!loading && !dayView && !error ? <Text style={styles.empty}>{strings['today.noEntryForDay']}</Text> : null}

      {dayView && (
        <>
          <Text style={styles.points}>{dayView.pointsTotal}</Text>

          <View style={styles.gaugeTrack}>
            <View
              style={[
                styles.gaugeFill,
                { width: `${Math.min(100, (dayView.pointsTotal / Math.max(1, dayView.thresholdApplied)) * 100)}%` },
              ]}
            />
          </View>
          {dayView.thresholdMet ? <Text style={styles.thresholdMet}>{strings['today.thresholdReached']}</Text> : null}

          {dayView.checks.map((check) => (
            <TouchableOpacity
              key={check.ruleInstanceId}
              style={[styles.rule, check.etat === 'respected' && styles.ruleRespected]}
              onPress={() => basculer(check.ruleInstanceId, check.etat)}
              onLongPress={() => basculerNonApplicable(check.ruleInstanceId, check.etat)}
              disabled={!modifiable}
            >
              {check.isThematic && <Text style={styles.badge}>{strings['today.thematicBadge']}</Text>}
              {check.status === 'acquired' && <Text style={styles.badge}>{strings['today.monthlyCheckBadge']}</Text>}
              <Text
                style={[
                  styles.ruleLabel,
                  check.etat === 'not_applicable' && styles.ruleNotApplicable,
                ]}
              >
                {check.label}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.displayButton}
            onPress={() => childId && router.push(`/display/${childId}`)}
          >
            <Text style={styles.displayButtonText}>{strings['today.switchToDisplay']}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.displayButton} onPress={() => router.push('/progress')}>
            <Text style={styles.displayButtonText}>{strings['progress.openProgress']}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.displayButton} onPress={() => router.push('/pilotage')}>
            <Text style={styles.displayButtonText}>{strings['pilotage.openPilotage']}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.displayButton} onPress={() => router.push('/bilan')}>
            <Text style={styles.displayButtonText}>{strings['bilan.openBilan']}</Text>
          </TouchableOpacity>

          {dayView.isClosed ? (
            <Text style={styles.closed}>{strings['today.dayClosed']}</Text>
          ) : !modifiable ? (
            <Text style={styles.closed}>{strings['today.dayFrozen']}</Text>
          ) : (
            <TouchableOpacity style={styles.closeButton} onPress={cloturer}>
              <Text style={styles.closeButtonText}>{strings['today.closeDay']}</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {pendingRewards.length > 0 && (
        <View style={styles.pendingSection}>
          <Text style={styles.pendingTitle}>{strings['today.pendingRewardsTitle']}</Text>
          {pendingRewards.map((reward) => (
            <View key={reward.grantId} style={styles.pendingRow}>
              <Text style={styles.pendingLabel}>{reward.label}</Text>
              <TouchableOpacity onPress={() => consommer(reward.grantId)}>
                <Text style={styles.pendingAction}>{strings['today.markConsumed']}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity onPress={() => supabase.auth.signOut()}>
        <Text style={styles.signOut}>{strings['today.signOut']}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateArrow: {
    fontSize: 28,
    paddingHorizontal: 16,
  },
  dateArrowDisabled: {
    opacity: 0.3,
  },
  date: {
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  points: {
    fontSize: 64,
    fontWeight: '700',
    textAlign: 'center',
  },
  gaugeTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#eee',
    overflow: 'hidden',
  },
  gaugeFill: {
    height: '100%',
    backgroundColor: '#208AEF',
  },
  thresholdMet: {
    textAlign: 'center',
    color: '#208AEF',
    fontWeight: '600',
  },
  rule: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 14,
  },
  ruleRespected: {
    borderColor: '#208AEF',
    backgroundColor: '#EAF4FF',
  },
  ruleLabel: {
    fontSize: 16,
  },
  ruleNotApplicable: {
    color: '#999',
    fontStyle: 'italic',
  },
  badge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#208AEF',
    marginBottom: 4,
  },
  displayButton: {
    borderWidth: 1,
    borderColor: '#208AEF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  displayButtonText: {
    color: '#208AEF',
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  closed: {
    textAlign: 'center',
    color: '#444',
    marginTop: 8,
  },
  empty: {
    textAlign: 'center',
    color: '#444',
    marginTop: 40,
  },
  error: {
    color: '#B00020',
    textAlign: 'center',
  },
  pendingSection: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
    marginTop: 16,
    gap: 8,
  },
  pendingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
  },
  pendingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pendingLabel: {
    fontSize: 16,
  },
  pendingAction: {
    color: '#208AEF',
  },
  signOut: {
    color: '#208AEF',
    textAlign: 'center',
    marginTop: 24,
  },
});
