import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ChildSwitcher from '../../components/ChildSwitcher';
import Pousse from '../../components/Pousse';
import type { RuleCategory } from '../../core/referential/types';
import { useActiveChild } from '../../data/activeChild';
import { genererBilanDuJour, genererBilanHebdomadaireSiAbsent } from '../../data/repositories/bilanRepository';
import { estDernierJourDeLaSemaine, estJourModifiable } from '../../core/scoring';
import type { EtatRegle } from '../../core/scoring/types';
import {
  cloturerJournee,
  fetchDayEntry,
  getOrCreateDayEntry,
  mettreAJourCochage,
  type DayEntryView,
  type RuleCheckView,
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
  programmerRappelRituelQuotidien,
} from '../../data/notifications';
import { enregistrerEvenement } from '../../data/telemetry';
import { useOnboardingState } from '../../data/useOnboardingState';
import { strings } from '../../i18n/fr-FR';
import { colors, couleurCategorie } from '../../theme/colors';
import { fonts } from '../../theme/typography';

const ICONE_PAR_CATEGORIE: Record<RuleCategory, keyof typeof Ionicons.glyphMap> = {
  autonomie: 'walk-outline',
  securite: 'shield-checkmark-outline',
  social: 'chatbubbles-outline',
  scolaire: 'book-outline',
  ecrans: 'tablet-portrait-outline',
  emotions: 'heart-outline',
  organisation: 'list-outline',
};

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
  const [childFirstName, setChildFirstName] = useState<string>('');

  const householdId = onboarding.status === 'ready' ? onboarding.householdId : null;
  const { activeChildId, setActiveChildId, children: enfantsFoyer, activeAccent } = useActiveChild();
  const aPlusieursEnfants = enfantsFoyer.length > 1;
  const params = useLocalSearchParams<{ activateChildId?: string }>();
  const childId = activeChildId;
  const insets = useSafeAreaInsets();
  const accentStyles = useMemo(
    () => makeAccentStyles(activeAccent.accent, insets.top),
    [activeAccent.accent, insets.top]
  );

  // Arrivée depuis la configuration d'un enfant supplémentaire (Réglages) :
  // on bascule directement sur son tableau plutôt que de rester sur le
  // premier enfant du foyer.
  useEffect(() => {
    if (typeof params.activateChildId === 'string') setActiveChildId(params.activateChildId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.activateChildId]);

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
    if (!childId) return;
    let cancelled = false;
    supabase
      .from('child')
      .select('first_name')
      .eq('id', childId)
      .single()
      .then(({ data }) => {
        if (!cancelled && data) setChildFirstName(data.first_name);
      });
    return () => {
      cancelled = true;
    };
  }, [childId]);

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
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
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

  function confirmerCloture() {
    if (!dayView || !modifiable) return;
    const nonCochees = dayView.checks.filter((c) => c.etat === 'not_respected').length;
    const cle =
      nonCochees === 0 ? 'today.closeConfirmBody.zero' : nonCochees === 1 ? 'today.closeConfirmBody.one' : 'today.closeConfirmBody.other';
    const message = strings[cle].replace('{count}', String(nonCochees));

    if (Platform.OS === 'web') {
      if (window.confirm(message)) cloturer();
      return;
    }
    Alert.alert(strings['today.closeConfirmTitle'], message, [
      { text: strings['today.closeConfirmCancel'], style: 'cancel' },
      { text: strings['today.closeConfirmConfirm'], onPress: cloturer },
    ]);
  }

  async function cloturer() {
    if (!dayView || !modifiable) return;
    const nouvelleVue = await cloturerJournee(dayView);
    setDayView(nouvelleVue);
    if (householdId) enregistrerEvenement(householdId, 'day_closed', { thresholdMet: nouvelleVue.thresholdMet });

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
        if (digestTime) await programmerRappelRituelQuotidien(digestTime);

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
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <View style={accentStyles.header}>
        <View style={styles.headerRow}>
          <Pousse size={46} />
          <View>
            <Text style={styles.greeting}>
              {strings['today.greetingPrefix']} {childFirstName} !
            </Text>
            <Text style={styles.mascotLine}>{strings['today.mascotGreeting']}</Text>
          </View>
        </View>
      </View>

      <ChildSwitcher />

      <View style={[styles.datePill, aPlusieursEnfants && styles.datePillBelowSwitcher]}>
        <TouchableOpacity onPress={() => selectedDate && setSelectedDate(ajouterJours(selectedDate, -1))}>
          <Ionicons name="chevron-back" size={16} color={colors.inkMuted} />
        </TouchableOpacity>
        <Text style={styles.dateText}>{selectedDate ? formaterDate(selectedDate) : ''}</Text>
        <TouchableOpacity
          onPress={() => selectedDate && setSelectedDate(ajouterJours(selectedDate, 1))}
          disabled={!peutAllerAuJourSuivant}
        >
          <Ionicons
            name="chevron-forward"
            size={16}
            color={peutAllerAuJourSuivant ? colors.inkMuted : colors.border}
          />
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!loading && !dayView && !error ? <Text style={styles.empty}>{strings['today.noEntryForDay']}</Text> : null}

      {dayView && (
        <>
          <View style={styles.scoreCard}>
            <View style={styles.scoreRow}>
              <Text style={accentStyles.scoreNumber}>{dayView.pointsTotal}</Text>
              <Text style={styles.scoreSuffix}>
                / {dayView.thresholdApplied} {strings['today.pointsSuffixLabel']}
              </Text>
            </View>
            <View style={styles.gaugeTrack}>
              <View
                style={[
                  accentStyles.gaugeFill,
                  { width: `${Math.min(100, (dayView.pointsTotal / Math.max(1, dayView.thresholdApplied)) * 100)}%` },
                ]}
              />
            </View>
            {dayView.thresholdMet ? <Text style={accentStyles.thresholdMet}>{strings['today.thresholdReached']}</Text> : null}
          </View>

          <Text style={styles.sectionTitle}>{strings['today.rulesSectionTitle']}</Text>

          <View style={styles.tileGrid}>
            {dayView.checks.map((check) => (
              <RuleTile
                key={check.ruleInstanceId}
                check={check}
                modifiable={modifiable}
                onPress={() => basculer(check.ruleInstanceId, check.etat)}
                onLongPress={() => basculerNonApplicable(check.ruleInstanceId, check.etat)}
              />
            ))}
          </View>

          {dayView.isClosed ? (
            <Text style={styles.closed}>{strings['today.dayClosed']}</Text>
          ) : !modifiable ? (
            <Text style={styles.closed}>{strings['today.dayFrozen']}</Text>
          ) : (
            <View style={styles.ctaWrap}>
              <TouchableOpacity style={accentStyles.ctaButton} onPress={confirmerCloture}>
                <Ionicons name="play" size={17} color="#fff" />
                <Text style={styles.ctaLabel}>{strings['today.startRitual']}</Text>
              </TouchableOpacity>
              <Text style={styles.ctaSubtitle}>{strings['today.startRitualSubtitle']}</Text>
            </View>
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
                <Text style={accentStyles.pendingAction}>{strings['today.markConsumed']}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

type RuleTileProps = {
  check: RuleCheckView;
  modifiable: boolean;
  onPress: () => void;
  onLongPress: () => void;
};

function RuleTile({ check, modifiable, onPress, onLongPress }: RuleTileProps) {
  const fond = check.isThematic ? colors.special : couleurCategorie(check.category);
  const nonApplicable = check.etat === 'not_applicable';
  const coche = check.etat === 'respected';
  const valeurPoints = check.isThematic ? check.bonusValue : check.points;

  return (
    <TouchableOpacity
      style={[styles.tile, { backgroundColor: fond }, nonApplicable && styles.tileNonApplicable]}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={!modifiable}
    >
      <Ionicons
        name={ICONE_PAR_CATEGORIE[check.category] ?? 'list-outline'}
        size={64}
        color="#fff"
        style={styles.tileIcon}
      />
      <View style={styles.tileEyebrowRow}>
        <Text style={styles.tileCategory}>{strings[`category.${check.category}`] ?? strings['category.organisation']}</Text>
        <Text style={styles.tilePoints}>
          +{valeurPoints} {valeurPoints > 1 ? strings['today.pointsAbbrevPlural'] : strings['today.pointsAbbrevSingular']}
        </Text>
      </View>
      {(check.isThematic || check.status === 'acquired') && (
        <View style={styles.tileBadgeRow}>
          {check.isThematic && <Ionicons name="star" size={11} color="#fff" />}
          <Text style={styles.tileBadge}>
            {check.isThematic ? strings['today.thematicBadge'] : strings['today.monthlyCheckBadge']}
          </Text>
        </View>
      )}
      <Text style={styles.tileLabel} numberOfLines={2}>
        {check.label}
      </Text>
      <View style={[styles.tileCheck, coche && styles.tileCheckOn]}>
        {coche ? <Ionicons name="checkmark" size={18} color={fond} /> : null}
      </View>
    </TouchableOpacity>
  );
}

// §1.2 : couleur choisie par enfant (« Ajoute un enfant ») — seules les
// quelques propriétés qui en dépendent sortent du StyleSheet statique.
function makeAccentStyles(accent: string, safeAreaTop: number) {
  return StyleSheet.create({
    header: {
      backgroundColor: accent,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
      paddingTop: safeAreaTop + 12,
      paddingBottom: 24,
      paddingHorizontal: 22,
    },
    scoreNumber: {
      fontFamily: fonts.bodyExtraBold,
      fontSize: 46,
      color: accent,
      lineHeight: 48,
    },
    gaugeFill: {
      height: '100%',
      borderRadius: 100,
      backgroundColor: accent,
    },
    thresholdMet: {
      marginTop: 8,
      fontFamily: fonts.bodyBold,
      color: accent,
    },
    ctaButton: {
      backgroundColor: accent,
      borderRadius: 100,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      width: '100%',
    },
    pendingAction: {
      color: accent,
      fontFamily: fonts.bodyBold,
    },
  });
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  greeting: {
    fontFamily: fonts.cursive,
    fontSize: 26,
    color: '#fff',
    lineHeight: 28,
  },
  mascotLine: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: '#fff',
    marginTop: 2,
  },
  datePill: {
    marginTop: -24,
    marginHorizontal: 22,
    backgroundColor: colors.surface,
    borderRadius: 100,
    paddingVertical: 10,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: colors.ink,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  datePillBelowSwitcher: {
    marginTop: 14,
  },
  dateText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.ink,
    textTransform: 'capitalize',
  },
  scoreCard: {
    marginTop: 14,
    marginHorizontal: 22,
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 18,
    shadowColor: colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 8,
  },
  scoreSuffix: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.inkMuted,
    flexShrink: 1,
    flexGrow: 1,
    minWidth: 0,
  },
  gaugeTrack: {
    height: 14,
    borderRadius: 100,
    backgroundColor: colors.background,
    overflow: 'hidden',
    marginTop: 10,
  },
  sectionTitle: {
    fontFamily: fonts.cursive,
    fontSize: 19,
    color: colors.ink,
    marginTop: 18,
    marginBottom: 8,
    marginHorizontal: 22,
  },
  tileGrid: {
    marginHorizontal: 22,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tile: {
    position: 'relative',
    width: '47%',
    height: 100,
    borderRadius: 20,
    padding: 12,
    overflow: 'hidden',
  },
  tileNonApplicable: {
    opacity: 0.45,
  },
  tileIcon: {
    position: 'absolute',
    right: -8,
    bottom: -8,
    opacity: 0.28,
  },
  tileEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  tileCategory: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.85)',
  },
  tilePoints: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: '#fff',
  },
  tileBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  tileBadge: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: '#fff',
  },
  tileLabel: {
    position: 'absolute',
    left: 12,
    right: 34,
    bottom: 10,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: '#fff',
    lineHeight: 17,
  },
  tileCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileCheckOn: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  ctaWrap: {
    marginTop: 18,
    marginHorizontal: 22,
    alignItems: 'center',
  },
  ctaLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: '#fff',
  },
  ctaSubtitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 6,
  },
  closed: {
    textAlign: 'center',
    color: colors.inkMuted,
    fontFamily: fonts.bodySemiBold,
    marginTop: 18,
  },
  empty: {
    textAlign: 'center',
    color: colors.inkMuted,
    fontFamily: fonts.bodySemiBold,
    marginTop: 40,
  },
  error: {
    color: colors.danger,
    textAlign: 'center',
    marginHorizontal: 22,
    marginTop: 12,
    fontFamily: fonts.bodySemiBold,
  },
  pendingSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    marginTop: 20,
    marginHorizontal: 22,
    gap: 8,
  },
  pendingTitle: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: colors.inkMuted,
  },
  pendingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pendingLabel: {
    fontSize: 16,
    fontFamily: fonts.bodyMedium,
    color: colors.ink,
  },
});
