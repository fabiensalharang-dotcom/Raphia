import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ChildSwitcher from '../../components/ChildSwitcher';
import Confetti from '../../components/Confetti';
import Pousse from '../../components/Pousse';
import type { RuleCategory } from '../../core/referential/types';
import { useActiveChild } from '../../data/activeChild';
import {
  genererBilanDuJour,
  genererBilanHebdomadaireSiAbsent,
  regenererBilanDuJourSiModifie,
} from '../../data/repositories/bilanRepository';
import { estDernierJourDeLaSemaine, estJourModifiable, peutModifierJourCloture } from '../../core/scoring';
import type { EtatRegle } from '../../core/scoring/types';
import {
  fetchDayEntry,
  getOrCreateDayEntry,
  mettreAJourCochage,
  validerJournee,
  type DayEntryView,
  type RuleCheckView,
} from '../../data/repositories/dayEntryRepository';
import { evaluerEtCreerSuggestion, verifierControlesPonctuels } from '../../data/repositories/pilotageRepository';
import {
  fetchAvailableRewards,
  fetchRecompensesEnAttente,
  marquerConsommee,
  modifierRecompenseAttribuee,
  type PendingRewardGrant,
  type RewardInstanceOption,
} from '../../data/repositories/rewardGrantRepository';
import { creerResumeSiAbsent } from '../../data/repositories/weekSummaryRepository';
import { supabase } from '../../data/supabaseClient';
import {
  demanderAutorisationSiPremierRituel,
  programmerNotificationAnniversaire,
  programmerNotificationBilanMatin,
  programmerNotificationBilanHebdomadaire,
  programmerRappelRituelQuotidien,
} from '../../data/notifications';
import { enregistrerEvenement } from '../../data/telemetry';
import { useOnboardingState } from '../../data/useOnboardingState';
import { strings } from '../../i18n/fr-FR';
import { colors, couleurCategorie } from '../../theme/colors';
import { fonts } from '../../theme/typography';

function dateDuJourDansFuseau(timezone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

function remplir(gabarit: string, slots: Record<string, unknown>): string {
  return gabarit.replace(/\{(\w+)\}/g, (_, nom: string) => String(slots[nom] ?? ''));
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
  const [validationEnCours, setValidationEnCours] = useState(false);
  const [validationErreur, setValidationErreur] = useState(false);
  const [changementId, setChangementId] = useState<string | null>(null);
  const [optionsChangement, setOptionsChangement] = useState<RewardInstanceOption[]>([]);
  const [afficherConfetti, setAfficherConfetti] = useState(false);
  const seuilAtteintPrecedent = useRef<boolean | null>(null);
  const [aideOuverte, setAideOuverte] = useState(false);
  const [seuilHebdoAide, setSeuilHebdoAide] = useState<number | null>(null);

  function ouvrirAide() {
    setAideOuverte(true);
    if (childId && seuilHebdoAide === null) {
      supabase
        .from('child')
        .select('settings')
        .eq('id', childId)
        .single()
        .then(({ data }) => {
          setSeuilHebdoAide((data?.settings as { weeklyThreshold?: number } | null)?.weeklyThreshold ?? 5);
        });
    }
  }

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

  // §9.2 : « un état franchi visuellement spectaculaire » — déclenché
  // uniquement sur la transition non atteint → atteint, jamais au premier
  // chargement d'une journée déjà réussie.
  useEffect(() => {
    if (!dayView) return;
    const precedent = seuilAtteintPrecedent.current;
    seuilAtteintPrecedent.current = dayView.thresholdMet;
    if (dayView.thresholdMet && precedent === false) {
      setAfficherConfetti(true);
      const t = setTimeout(() => setAfficherConfetti(false), 1800);
      return () => clearTimeout(t);
    }
  }, [dayView?.thresholdMet]);

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
  // §5.5 (nouvelle direction) : plus de clôture manuelle qui change la
  // fenêtre de modification — une seule règle, qu'on ait validé ou non :
  // aujourd'hui, ou la veille jusqu'à midi (estJourModifiable).
  const modifiable = dayView !== null && timezone !== null && estJourModifiable(dayView.date, new Date(), timezone);

  async function regenererBilanSiDejaValide(vue: DayEntryView) {
    // Une case cochée/décochée après une validation (jusqu'à midi le
    // lendemain) change le score : le bilan déjà produit ne doit pas rester
    // désaligné.
    if (!vue.isClosed || !childId || !timezone) return;
    try {
      await regenererBilanDuJourSiModifie(childId, vue.dayEntryId, timezone);
    } catch {
      // Couche secondaire : une erreur ici ne doit jamais bloquer le
      // cochage, déjà acté localement et côté serveur.
    }
  }

  async function basculer(ruleInstanceId: string, etatActuel: EtatRegle) {
    if (!dayView || !modifiable) return;
    const nouvelEtat = suivantEtat(etatActuel);
    const nouvelleVue = await mettreAJourCochage(dayView, ruleInstanceId, nouvelEtat);
    setDayView(nouvelleVue);
    regenererBilanSiDejaValide(nouvelleVue);
  }

  async function basculerNonApplicable(ruleInstanceId: string, etatActuel: EtatRegle) {
    if (!dayView || !modifiable) return;
    const nouvelEtat: EtatRegle = etatActuel === 'not_applicable' ? 'not_respected' : 'not_applicable';
    const nouvelleVue = await mettreAJourCochage(dayView, ruleInstanceId, nouvelEtat);
    setDayView(nouvelleVue);
    regenererBilanSiDejaValide(nouvelleVue);
  }

  // §5.5, §7.10, §8.7 (nouvelle direction) : il n'y a plus de bouton qui
  // fige la journée — elle cesse d'être modifiable toute seule (voir
  // `modifiable` ci-dessus). Valider sert uniquement à distinguer un jour
  // réellement passé en revue par le parent (même à 0 point) d'un jour
  // jamais ouvert : sans ce geste, aucun bilan n'est produit et aucune
  // notification n'est envoyée (silence total, garde-fou #16 étendu).
  // Rejouable autant de fois que voulu tant que `modifiable` reste vrai.
  async function valider() {
    if (!dayView || !modifiable) return;
    setValidationEnCours(true);
    setValidationErreur(false);
    let nouvelleVue: DayEntryView;
    try {
      nouvelleVue = await validerJournee(dayView);
    } catch {
      setValidationEnCours(false);
      setValidationErreur(true);
      return;
    }
    setDayView(nouvelleVue);
    if (householdId) enregistrerEvenement(householdId, 'day_validated', { thresholdMet: nouvelleVue.thresholdMet });

    // §6.2 : corrige le statut d'une règle en contrôle ponctuel avant
    // d'évaluer les déclencheurs, pour ne pas suggérer sur une base fausse.
    if (childId && timezone) {
      try {
        await verifierControlesPonctuels(nouvelleVue.dayEntryId);
        await evaluerEtCreerSuggestion(childId, timezone);
        await genererBilanDuJour(childId, nouvelleVue.dayEntryId, timezone);
        await demanderAutorisationSiPremierRituel(childId);
        await programmerNotificationBilanMatin(nouvelleVue.childId, nouvelleVue.date);
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
        // ici ne doit jamais bloquer la validation, déjà actée localement
        // et côté serveur.
      }
    }

    setValidationEnCours(false);
  }

  // §7.2, §8.5 (nouvelle direction) : le Mode Affichage n'est plus déclenché
  // par la clôture — un bouton dédié le lance à tout moment, pour permettre
  // de projeter avant, pendant ou après le cochage. La route reste un
  // instantané en lecture seule (aucune dépendance à l'état de navigation,
  // garde-fou #9) : revenir cocher puis relancer le mode Affichage rafraîchit
  // l'instantané.
  function lancerModeAffichage() {
    if (childId) router.push(`/display/${childId}`);
  }

  async function consommer(grantId: string) {
    await marquerConsommee(grantId);
    rafraichirRecompensesEnAttente();
  }

  async function ouvrirChangement(reward: PendingRewardGrant) {
    if (!childId) return;
    setChangementId(reward.grantId);
    setOptionsChangement(await fetchAvailableRewards(childId, reward.tier));
  }

  function fermerChangement() {
    setChangementId(null);
    setOptionsChangement([]);
  }

  async function choisirNouvelleRecompense(grantId: string, rewardInstanceId: string) {
    await modifierRecompenseAttribuee(grantId, rewardInstanceId);
    fermerChangement();
    rafraichirRecompensesEnAttente();
  }

  function peutEncoreChanger(grantedAt: string): boolean {
    if (!timezone) return false;
    const dateGrant = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(grantedAt));
    return peutModifierJourCloture(dateGrant, new Date(), timezone);
  }

  const defiCheck = dayView?.checks.find((c) => c.isThematic) ?? null;

  return (
    <>
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
            {afficherConfetti && <Confetti />}
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

          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>{strings['today.rulesSectionTitle']}</Text>
            <TouchableOpacity style={styles.helpButton} onPress={ouvrirAide}>
              <Text style={styles.helpButtonLabel}>?</Text>
            </TouchableOpacity>
          </View>

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

          {!modifiable ? (
            <Text style={styles.closed}>
              {dayView.isClosed ? strings['today.dayClosed'] : strings['today.dayFrozen']}
            </Text>
          ) : (
            <View style={styles.ctaWrap}>
              {validationErreur ? <Text style={styles.error}>{strings['today.validateError']}</Text> : null}
              <TouchableOpacity
                style={[accentStyles.ctaButton, validationEnCours && styles.ctaButtonDisabled]}
                onPress={valider}
                disabled={validationEnCours}
              >
                {!validationEnCours && <Ionicons name="checkmark" size={17} color="#fff" />}
                <Text style={styles.ctaLabel}>
                  {validationEnCours
                    ? strings['today.validatingInProgress']
                    : dayView.isClosed
                      ? strings['today.revalidate']
                      : strings['today.validate']}
                </Text>
              </TouchableOpacity>
              <Text style={styles.ctaSubtitle}>
                {dayView.isClosed ? strings['today.validatedSubtitle'] : strings['today.validateSubtitle']}
              </Text>
              {dayView.isClosed && (
                <View style={styles.editableNoteRow}>
                  <Ionicons name="lock-open-outline" size={13} color={colors.inkMuted} />
                  <Text style={styles.editableNote}>{strings['today.editableUntilNoon']}</Text>
                </View>
              )}
            </View>
          )}

          {selectedDate === aujourdHui && (
            <TouchableOpacity style={accentStyles.displayButton} onPress={lancerModeAffichage}>
              <Ionicons name="tv-outline" size={17} color={activeAccent.accent} />
              <Text style={accentStyles.displayButtonLabel}>{strings['today.launchDisplay']}</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {pendingRewards.length > 0 && (
        <View style={styles.pendingSection}>
          <Text style={styles.pendingTitle}>{strings['today.pendingRewardsTitle']}</Text>
          {pendingRewards.map((reward) => (
            <View key={reward.grantId} style={styles.pendingItem}>
              <View style={styles.pendingRow}>
                <Text style={styles.pendingLabel}>{reward.label}</Text>
                <View style={styles.pendingActions}>
                  {peutEncoreChanger(reward.grantedAt) && (
                    <TouchableOpacity onPress={() => ouvrirChangement(reward)}>
                      <Text style={accentStyles.pendingAction}>{strings['today.changeReward']}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => consommer(reward.grantId)}>
                    <Text style={accentStyles.pendingAction}>{strings['today.markConsumed']}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {changementId === reward.grantId && (
                <View style={styles.changeOptions}>
                  {optionsChangement.map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={styles.changeOptionRow}
                      onPress={() => choisirNouvelleRecompense(reward.grantId, option.id)}
                    >
                      <Text style={styles.changeOptionLabel}>{option.label}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity onPress={fermerChangement}>
                    <Text style={styles.changeCancel}>{strings['referentiel.editCancel']}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>

    <Modal visible={aideOuverte} transparent animationType="fade" onRequestClose={() => setAideOuverte(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{strings['today.howItWorksTitle']}</Text>
          <View style={[styles.modalRow, { backgroundColor: '#FFF3E6' }]}>
            <Text style={styles.modalIcon}>✅</Text>
            <Text style={styles.modalLine}>
              {strings['today.howItWorksRulePrefix']}{' '}
              <Text style={styles.modalLineBold}>{strings['today.howItWorksRuleBold']}</Text>
              {strings['today.howItWorksRuleSuffix']}
            </Text>
          </View>
          {defiCheck && (
            <View style={[styles.modalRow, { backgroundColor: '#FFF7DE' }]}>
              <Text style={styles.modalIcon}>⭐</Text>
              <Text style={styles.modalLine}>
                {strings['today.howItWorksDefiPrefix']}{' '}
                <Text style={styles.modalLineBold}>
                  {remplir(strings['today.howItWorksDefiBold'], { points: defiCheck.bonusValue })}
                </Text>{' '}
                {defiCheck.thematicBlocking
                  ? strings['today.howItWorksDefiBlockingSuffix']
                  : strings['today.howItWorksDefiSuffix']}
              </Text>
            </View>
          )}
          {dayView && (
            <View style={[styles.modalRow, { backgroundColor: '#EFE9FB' }]}>
              <Text style={styles.modalIcon}>🎯</Text>
              <Text style={styles.modalLine}>
                {strings['today.howItWorksThresholdPrefix']}{' '}
                <Text style={styles.modalLineBold}>
                  {remplir(strings['today.howItWorksThresholdBold'], { seuil: dayView.thresholdApplied })}
                </Text>{' '}
                {strings['today.howItWorksThresholdSuffix']}
              </Text>
            </View>
          )}
          {seuilHebdoAide !== null && (
            <View style={[styles.modalRow, { backgroundColor: '#E7F8F1' }]}>
              <Text style={styles.modalIcon}>📅</Text>
              <Text style={styles.modalLine}>
                {strings['today.howItWorksWeeklyPrefix']}{' '}
                <Text style={styles.modalLineBold}>
                  {remplir(strings['today.howItWorksWeeklyBold'], { jours: seuilHebdoAide })}
                </Text>{' '}
                {strings['today.howItWorksWeeklySuffix']}
              </Text>
            </View>
          )}
          <TouchableOpacity style={accentStyles.modalCloseButton} onPress={() => setAideOuverte(false)}>
            <Text style={styles.modalCloseLabel}>{strings['today.howItWorksClose']}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    </>
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
  const contenu = coche ? '#fff' : fond;
  const valeurPoints = check.isThematic ? check.bonusValue : check.points;

  return (
    <TouchableOpacity
      style={[
        styles.tile,
        check.isThematic && styles.tileDefi,
        { backgroundColor: coche ? fond : colors.surface, borderColor: fond },
        nonApplicable && styles.tileNonApplicable,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={!modifiable}
    >
      <View style={styles.tileEyebrowRow}>
        <Text style={[styles.tileCategory, { color: contenu, opacity: coche ? 0.85 : 0.7 }]}>
          {strings[`category.${check.category}`] ?? strings['category.organisation']}
        </Text>
      </View>
      {(check.isThematic || check.status === 'acquired') && (
        <View style={[styles.tileBadgeRow, check.isThematic && styles.tileBadgeRowDefi]}>
          {check.isThematic && <Ionicons name="star" size={check.isThematic ? 15 : 11} color={contenu} />}
          <Text style={[styles.tileBadge, check.isThematic && styles.tileBadgeDefi, { color: contenu }]}>
            {check.isThematic ? strings['today.thematicBadge'] : strings['today.monthlyCheckBadge']}
          </Text>
        </View>
      )}
      <Text style={[styles.tileLabel, { color: contenu }]}>{check.label}</Text>
      <Text style={[styles.tileFiligrane, { color: contenu, opacity: coche ? 0.24 : 0.18 }]}>+{valeurPoints}</Text>
      <View style={[styles.tileCheck, { borderColor: coche ? '#fff' : fond }, coche && styles.tileCheckOn]}>
        {coche ? <Ionicons name="checkmark" size={16} color={fond} /> : null}
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
      lineHeight: 58,
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
    modalCloseButton: {
      backgroundColor: accent,
      borderRadius: 100,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 16,
    },
    displayButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1.5,
      borderColor: accent,
      borderRadius: 100,
      paddingVertical: 12,
      marginTop: 14,
      marginHorizontal: 22,
    },
    displayButtonLabel: {
      color: accent,
      fontFamily: fonts.bodyBold,
      fontSize: 14,
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
    position: 'relative',
    marginTop: 14,
    marginHorizontal: 22,
    backgroundColor: colors.surface,
    borderRadius: 22,
    paddingTop: 26,
    paddingBottom: 14,
    paddingHorizontal: 18,
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
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    marginBottom: 8,
    marginHorizontal: 22,
  },
  sectionTitle: {
    fontFamily: fonts.cursive,
    fontSize: 19,
    color: colors.ink,
  },
  helpButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.inkMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpButtonLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.inkMuted,
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
    minHeight: 100,
    borderRadius: 20,
    borderWidth: 2.5,
    padding: 12,
    overflow: 'hidden',
  },
  tileDefi: {
    width: '100%',
  },
  tileNonApplicable: {
    opacity: 0.45,
  },
  tileIcon: {
    position: 'absolute',
    right: -8,
    bottom: -8,
  },
  tileEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    paddingRight: 26,
  },
  tileCategory: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tileBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  tileBadgeRowDefi: {
    marginTop: 4,
    gap: 6,
  },
  tileBadge: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
  },
  tileBadgeDefi: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tileLabel: {
    marginTop: 8,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    lineHeight: 17,
  },
  tileFiligrane: {
    position: 'absolute',
    right: 10,
    bottom: 2,
    textAlign: 'right',
    fontFamily: fonts.bodyExtraBold,
    fontSize: 26,
    lineHeight: 28,
  },
  tileCheck: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
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
  editableNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  editableNote: {
    color: colors.inkMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  ctaButtonDisabled: {
    opacity: 0.7,
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
  pendingItem: {
    gap: 8,
  },
  pendingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  changeOptions: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  changeOptionRow: {
    paddingVertical: 6,
  },
  changeOptionLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.ink,
  },
  changeCancel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.inkMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(58,46,42,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 20,
    gap: 10,
  },
  modalTitle: {
    fontFamily: fonts.cursive,
    fontSize: 22,
    color: colors.ink,
    marginBottom: 4,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 14,
    padding: 10,
  },
  modalIcon: {
    fontSize: 17,
  },
  modalLine: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.ink,
    lineHeight: 19,
  },
  modalLineBold: {
    fontFamily: fonts.bodyBold,
  },
  modalCloseLabel: {
    color: '#fff',
    fontFamily: fonts.bodyBold,
  },
});
