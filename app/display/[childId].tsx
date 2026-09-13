import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { nomIoniconPour } from '../../components/ruleIcons';
import { fetchDisplayState, type DisplayState } from '../../data/repositories/displayStateRepository';
import { attribuerRecompense, fetchGrantForDayEntry } from '../../data/repositories/rewardGrantRepository';
import { supabase } from '../../data/supabaseClient';
import { enregistrerEvenement } from '../../data/telemetry';
import { strings } from '../../i18n/fr-FR';

// §7.2 : les 6 temps de la séquence, dans l'ordre. « threshold » et
// « streak » ne font partie du montage que lorsque leur condition est
// remplie — la séquence ne les saute pas, elle ne les construit pas.
type StepKey = 'score' | 'gauge' | 'threshold' | 'streak' | 'week' | 'reward';
type Step = { key: StepKey; duration: number };

function construireEtapes(state: DisplayState): Step[] {
  const etapes: Step[] = [
    { key: 'score', duration: 2000 },
    { key: 'gauge', duration: 3000 },
  ];
  if (state.thresholdMet) etapes.push({ key: 'threshold', duration: 2000 });
  if (state.streak) etapes.push({ key: 'streak', duration: 3000 });
  etapes.push({ key: 'week', duration: 3000 });
  if (state.thresholdMet || state.weeklyReward) etapes.push({ key: 'reward', duration: 0 });
  return etapes;
}

function delaisCumules(etapes: Step[]): number[] {
  const delais: number[] = [];
  let cumul = 0;
  for (const etape of etapes) {
    delais.push(cumul);
    cumul += etape.duration;
  }
  return delais;
}

// §8.5 : route dédiée, alimentée par un seul DisplayState sérialisable,
// aucune dépendance à l'état de navigation de l'app, aucune interaction
// avec le reste de l'application — prête à devenir une page web autonome
// en V1.5 sans réécriture.
export default function Display() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const [state, setState] = useState<DisplayState | null>(null);
  const [error, setError] = useState(false);
  const [revealed, setRevealed] = useState(0);
  const [householdId, setHouseholdId] = useState<string | null>(null);

  const compteurAnim = useRef(new Animated.Value(0)).current;
  const [compteurAffiche, setCompteurAffiche] = useState(0);
  const gaugeAnim = useRef(new Animated.Value(0)).current;
  const franchissement = useRef(new Animated.Value(1)).current;
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const etapesRef = useRef<Step[]>([]);

  useEffect(() => {
    // Le verrouillage d'orientation n'a de sens que sur un vrai appareil
    // (§9.2) — l'API web du navigateur n'est pas fiable selon les
    // contextes (aperçu de développement compris) et n'est de toute façon
    // pas ce que vise cette exigence.
    if (Platform.OS === 'web') return;

    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (!childId) return;
    let cancelled = false;

    fetchDisplayState(childId).then(
      (result) => {
        if (!cancelled) setState(result);
      },
      () => {
        if (!cancelled) setError(true);
      }
    );

    // §10.2 : identifiant nécessaire pour la télémétrie (reward_chosen),
    // ne fait pas partie du DisplayState sérialisable de l'écran (§8.5).
    supabase
      .from('child')
      .select('household_id')
      .eq('id', childId)
      .single()
      .then(({ data }) => {
        if (!cancelled && data) setHouseholdId(data.household_id);
      });

    return () => {
      cancelled = true;
    };
  }, [childId]);

  // §7.2 : joue la séquence une seule fois par arrivée sur l'écran, dans
  // l'ordre, puis s'arrête sur la dernière étape construite (libre si
  // récompense, sinon la bande de la semaine).
  useEffect(() => {
    if (!state) return;
    const etapes = construireEtapes(state);
    etapesRef.current = etapes;
    const delais = delaisCumules(etapes);

    compteurAnim.setValue(0);
    const listenerId = compteurAnim.addListener(({ value }) => setCompteurAffiche(Math.round(value)));
    Animated.timing(compteurAnim, { toValue: state.score, duration: 1800, useNativeDriver: false }).start();

    const proportion = state.thresholdApplied > 0 ? Math.min(1, state.score / state.thresholdApplied) : 0;
    gaugeAnim.setValue(0);
    Animated.timing(gaugeAnim, {
      toValue: proportion,
      duration: 2500,
      delay: delais[etapes.findIndex((e) => e.key === 'gauge')] ?? 0,
      useNativeDriver: false,
    }).start();

    if (state.thresholdMet) {
      const delaiFranchissement = delais[etapes.findIndex((e) => e.key === 'threshold')] ?? 0;
      franchissement.setValue(1);
      setTimeout(() => {
        Animated.sequence([
          Animated.timing(franchissement, { toValue: 1.15, duration: 300, useNativeDriver: true }),
          Animated.timing(franchissement, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();
      }, delaiFranchissement);
    }

    setRevealed(1);
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < etapes.length - 1; i++) {
      const revealCount = i + 2;
      timers.push(setTimeout(() => setRevealed((r) => Math.max(r, revealCount)), delais[i + 1]));
    }
    timersRef.current = timers;

    return () => {
      timers.forEach(clearTimeout);
      compteurAnim.removeListener(listenerId);
    };
    // Ne joue la séquence qu'une fois par chargement de l'écran — un choix
    // de récompense met à jour `state` mais ne doit jamais la relancer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.dayEntryId]);

  function passerLaSuite() {
    if (!state) return;
    const etapes = etapesRef.current;
    if (revealed >= etapes.length) return;

    timersRef.current.forEach(clearTimeout);
    compteurAnim.stopAnimation();
    setCompteurAffiche(state.score);
    const proportion = state.thresholdApplied > 0 ? Math.min(1, state.score / state.thresholdApplied) : 0;
    gaugeAnim.stopAnimation();
    gaugeAnim.setValue(proportion);
    franchissement.setValue(1);
    setRevealed(etapes.length);
  }

  async function choisir(tier: 'daily' | 'weekly', rewardInstanceId: string) {
    if (!state || !state.dayEntryId) return;
    const weekSummaryId = tier === 'weekly' ? state.weeklyReward?.weekSummaryId : undefined;
    await attribuerRecompense(childId, state.dayEntryId, rewardInstanceId, tier, weekSummaryId);
    if (householdId) enregistrerEvenement(householdId, 'reward_chosen', { tier });
    const grant = await fetchGrantForDayEntry(state.dayEntryId, tier);
    setState((prev) => {
      if (!prev) return prev;
      if (tier === 'daily') return { ...prev, dailyReward: { grant, options: [] } };
      return prev.weeklyReward ? { ...prev, weeklyReward: { ...prev.weeklyReward, grant, options: [] } } : prev;
    });
  }

  if (error) {
    return (
      <View style={[styles.scroll, styles.container]}>
        <Text style={styles.errorText}>{strings['display.error']}</Text>
      </View>
    );
  }

  if (!state) {
    return <View style={styles.scroll} />;
  }

  const etapes = construireEtapes(state);
  const visibles = new Set(etapes.slice(0, revealed).map((e) => e.key));

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
    <Pressable style={styles.pressable} onPress={passerLaSuite}>
      <View style={styles.header}>
        <Text style={styles.childName}>{state.childFirstName}</Text>
        <Animated.Text style={[styles.score, { transform: [{ scale: franchissement }] }]}>
          {compteurAffiche}
        </Animated.Text>
      </View>

      <View style={styles.gaugeTrack}>
        {visibles.has('gauge') && (
          <Animated.View
            style={[
              styles.gaugeFill,
              {
                width: gaugeAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              },
            ]}
          />
        )}
      </View>

      <View style={styles.rulesRow}>
        {state.rules.map((rule) => (
          <View
            key={rule.shortLabel}
            style={[
              styles.ruleCard,
              rule.isThematic && styles.ruleCardThematic,
              rule.etat === 'not_applicable' && styles.ruleCardMuted,
            ]}
          >
            <Ionicons
              name={nomIoniconPour(rule.icon)}
              size={40}
              color={rule.etat === 'respected' ? '#4ADE80' : '#6B7280'}
            />
            <Text style={styles.ruleLabel}>{rule.shortLabel}</Text>
          </View>
        ))}
      </View>

      {state.acquiredRules.length > 0 && (
        <View style={styles.acquiredRow}>
          <Text style={styles.acquiredTitle}>{strings['display.acquired']}</Text>
          <View style={styles.acquiredIcons}>
            {state.acquiredRules.map((rule) => (
              <Ionicons key={rule.shortLabel} name={nomIoniconPour(rule.icon)} size={20} color="#9CA3AF" />
            ))}
          </View>
        </View>
      )}

      {visibles.has('streak') && state.streak && (
        <View style={styles.streakBadge}>
          <Ionicons name={nomIoniconPour(state.streak.icon)} size={28} color="#FBBF24" />
          <Text style={styles.streakDays}>{state.streak.days}</Text>
        </View>
      )}

      {visibles.has('week') && (
        <View style={styles.weekStrip}>
          {state.weekStrip.map((jour) => (
            <View
              key={jour.date}
              style={[
                styles.weekDot,
                jour.thresholdMet === true && styles.weekDotMet,
                jour.thresholdMet === false && styles.weekDotNotMet,
              ]}
            />
          ))}
        </View>
      )}

      {visibles.has('reward') && (state.dailyReward.grant || state.dailyReward.options.length > 0) && (
        <View style={styles.rewardSection}>
          <View style={styles.rewardTagRow}>
            <Text style={styles.rewardTag}>{strings['display.daily']}</Text>
          </View>
          {state.dailyReward.grant ? (
            <Text style={styles.rewardChosen}>{state.dailyReward.grant.label}</Text>
          ) : (
            <>
              <Text style={styles.rewardPrompt}>{strings['display.chooseReward']}</Text>
              <View style={styles.rewardOptions}>
                {state.dailyReward.options.map((option) => (
                  <Pressable
                    key={option.id}
                    style={styles.rewardOption}
                    onPress={() => choisir('daily', option.id)}
                  >
                    <Text style={styles.rewardOptionLabel}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </View>
      )}

      {visibles.has('reward') && state.weeklyReward && (state.weeklyReward.grant || state.weeklyReward.options.length > 0) && (
        <View style={styles.rewardSection}>
          <View style={styles.rewardTagRow}>
            <Text style={styles.rewardTag}>{strings['display.weekly']}</Text>
          </View>
          {state.weeklyReward.grant ? (
            <Text style={styles.rewardChosen}>{state.weeklyReward.grant.label}</Text>
          ) : (
            <>
              <Text style={styles.rewardPrompt}>{strings['display.chooseReward']}</Text>
              <View style={styles.rewardOptions}>
                {state.weeklyReward.options.map((option) => (
                  <Pressable
                    key={option.id}
                    style={styles.rewardOption}
                    onPress={() => choisir('weekly', option.id)}
                  >
                    <Text style={styles.rewardOptionLabel}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </View>
      )}
    </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#111827',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: '5%',
    paddingVertical: '5%',
    justifyContent: 'space-between',
    gap: 16,
  },
  pressable: {
    flexGrow: 1,
    justifyContent: 'space-between',
    gap: 16,
  },
  header: {
    alignItems: 'center',
  },
  childName: {
    color: '#E5E7EB',
    fontSize: 28,
    fontWeight: '600',
  },
  score: {
    color: '#FFFFFF',
    fontSize: 160,
    fontWeight: '800',
    lineHeight: 180,
  },
  gaugeTrack: {
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1F2937',
    overflow: 'hidden',
  },
  gaugeFill: {
    height: '100%',
    backgroundColor: '#4ADE80',
  },
  rulesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  ruleCard: {
    alignItems: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#374151',
    minWidth: 120,
  },
  ruleCardThematic: {
    borderColor: '#60A5FA',
  },
  ruleCardMuted: {
    opacity: 0.5,
  },
  ruleLabel: {
    color: '#E5E7EB',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  acquiredRow: {
    alignItems: 'center',
    gap: 4,
  },
  acquiredTitle: {
    color: '#6B7280',
    fontSize: 14,
  },
  acquiredIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  streakBadge: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1F2937',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  streakDays: {
    color: '#FBBF24',
    fontSize: 24,
    fontWeight: '800',
  },
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  weekDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#374151',
  },
  weekDotMet: {
    backgroundColor: '#4ADE80',
  },
  weekDotNotMet: {
    backgroundColor: '#4B5563',
  },
  rewardSection: {
    alignItems: 'center',
    gap: 8,
  },
  rewardTagRow: {
    flexDirection: 'row',
  },
  rewardTag: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  rewardPrompt: {
    color: '#E5E7EB',
    fontSize: 20,
    fontWeight: '600',
  },
  rewardChosen: {
    color: '#4ADE80',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  rewardOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  rewardOption: {
    borderWidth: 2,
    borderColor: '#4ADE80',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rewardOptionLabel: {
    color: '#4ADE80',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#E5E7EB',
    fontSize: 24,
    textAlign: 'center',
    marginTop: 40,
  },
});
