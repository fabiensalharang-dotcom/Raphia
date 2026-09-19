import { useEffect, useMemo, useState } from 'react';
import { Redirect } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import ChildSwitcher from '../../components/ChildSwitcher';
import ScreenHeader from '../../components/ScreenHeader';
import { useActiveChild } from '../../data/activeChild';
import { fetchProgressView, type ProgressView } from '../../data/repositories/progressRepository';
import { supabase } from '../../data/supabaseClient';
import { useOnboardingState } from '../../data/useOnboardingState';
import { strings } from '../../i18n/fr-FR';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

function remplir(gabarit: string, slots: Record<string, unknown>): string {
  return gabarit.replace(/\{(\w+)\}/g, (_, nom: string) => String(slots[nom] ?? ''));
}

const FENETRES = [4, 8, 12] as const;
type Fenetre = (typeof FENETRES)[number];

const LIBELLE_FENETRE: Record<Fenetre, string> = {
  4: strings['progress.window4'],
  8: strings['progress.window8'],
  12: strings['progress.window12'],
};

export default function Progress() {
  const onboarding = useOnboardingState();
  const [timezone, setTimezone] = useState<string | null>(null);
  const [fenetre, setFenetre] = useState<Fenetre>(4);
  const [vue, setVue] = useState<ProgressView | null>(null);
  const [error, setError] = useState(false);
  const [seuilActuel, setSeuilActuel] = useState<number | null>(null);

  const householdId = onboarding.status === 'ready' ? onboarding.householdId : null;
  const { activeChildId, activeAccent } = useActiveChild();
  const childId = activeChildId;
  const accentStyles = useMemo(() => makeAccentStyles(activeAccent.accent), [activeAccent.accent]);

  useEffect(() => {
    if (!householdId) return;
    let cancelled = false;
    supabase
      .from('household')
      .select('timezone')
      .eq('id', householdId)
      .single()
      .then(({ data, error: householdError }) => {
        if (cancelled) return;
        if (householdError || !data) {
          setError(true);
          return;
        }
        setTimezone(data.timezone);
      });
    return () => {
      cancelled = true;
    };
  }, [householdId]);

  useEffect(() => {
    if (!childId) return;
    let cancelled = false;
    supabase
      .from('child')
      .select('settings')
      .eq('id', childId)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        setSeuilActuel((data?.settings as { dailyThreshold?: number } | null)?.dailyThreshold ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [childId]);

  useEffect(() => {
    if (!childId || !timezone) return;
    let cancelled = false;
    fetchProgressView(childId, timezone, fenetre).then(
      (resultat) => {
        if (!cancelled) setVue(resultat);
      },
      () => {
        if (!cancelled) setError(true);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [childId, timezone, fenetre]);

  if (onboarding.status === 'loading') {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }
  if (onboarding.status !== 'ready') {
    return <Redirect href="/" />;
  }

  const pointsConnus = (vue?.dailyPoints ?? []).filter((jour) => jour.pointsTotal !== null);
  const maxPoints = Math.max(1, ...pointsConnus.map((jour) => jour.pointsTotal as number), seuilActuel ?? 0);

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <ScreenHeader title={strings['progress.title']} accentColor={activeAccent.accent} />
      <ChildSwitcher />

      <View style={styles.body}>
        <View style={styles.windowRow}>
          {FENETRES.map((valeur) => (
            <TouchableOpacity
              key={valeur}
              style={[accentStyles.windowButton, fenetre === valeur && accentStyles.windowButtonSelected]}
              onPress={() => setFenetre(valeur)}
            >
              <Text style={[accentStyles.windowButtonLabel, fenetre === valeur && styles.windowButtonLabelSelected]}>
                {LIBELLE_FENETRE[valeur]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {error ? <Text style={styles.error}>{strings['progress.error']}</Text> : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{strings['progress.pointsTitle']}</Text>
          {vue && pointsConnus.length === 0 ? (
            <Text style={styles.empty}>{strings['progress.pointsEmpty']}</Text>
          ) : (
            vue && (
              <View style={styles.chartRow}>
                <View style={styles.yAxis}>
                  <Text style={styles.yAxisLabel}>{maxPoints}</Text>
                  <Text style={styles.yAxisLabel}>{Math.round(maxPoints / 2)}</Text>
                  <Text style={styles.yAxisLabel}>0</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScroll}>
                  <View style={styles.pointsChartWrap}>
                    {seuilActuel !== null && seuilActuel > 0 && (
                      <View style={[styles.thresholdLine, { bottom: `${(seuilActuel / maxPoints) * 100}%` }]}>
                        <Text style={styles.thresholdLabel}>
                          {remplir(strings['progress.thresholdLine'], { seuil: seuilActuel })}
                        </Text>
                      </View>
                    )}
                    <View style={styles.pointsChart}>
                      {vue.dailyPoints.map((jour) => {
                        const hauteur =
                          jour.pointsTotal === null ? 3 : Math.max(3, (jour.pointsTotal / maxPoints) * 100);
                        return (
                          <View
                            key={jour.date}
                            style={[
                              accentStyles.pointsBar,
                              { height: `${hauteur}%` },
                              jour.pointsTotal === null && styles.pointsBarVide,
                            ]}
                          />
                        );
                      })}
                    </View>
                  </View>
                </ScrollView>
              </View>
            )
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{strings['progress.ruleRatesTitle']}</Text>
          {vue && vue.ruleSuccessRates.length === 0 ? (
            <Text style={styles.empty}>{strings['progress.ruleRatesEmpty']}</Text>
          ) : (
            vue?.ruleSuccessRates.map((regle) => (
              <View key={regle.ruleInstanceId} style={styles.ruleRateRow}>
                <View style={styles.ruleRateHeader}>
                  <View style={styles.ruleRateNameWrap}>
                    <Text style={styles.ruleRateLabel}>{regle.label}</Text>
                    <Text style={styles.ruleRateUsage}>
                      {remplir(strings[regle.joursApplicables === 1 ? 'progress.usageCount' : 'progress.usageCountPlural'], {
                        count: regle.joursApplicables,
                      })}
                    </Text>
                  </View>
                  <Text style={accentStyles.ruleRatePercent}>{Math.round(regle.tauxReussite * 100)} %</Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[accentStyles.barFill, { width: `${regle.tauxReussite * 100}%` }]} />
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{strings['progress.weeklyThresholdsTitle']}</Text>
          {vue && vue.weeklyThresholds.length === 0 ? (
            <Text style={styles.empty}>{strings['progress.weeklyThresholdsEmpty']}</Text>
          ) : (
            vue?.weeklyThresholds.map((semaine) => (
              <View key={`${semaine.isoYear}-${semaine.isoWeek}`} style={styles.weekRow}>
                <Text style={styles.weekLabel}>
                  S{semaine.isoWeek} · {semaine.isoYear}
                </Text>
                <View style={styles.barTrack}>
                  <View style={[accentStyles.barFill, { width: `${(semaine.daysThresholdMet / 7) * 100}%` }]} />
                </View>
                <Text style={styles.weekCount}>
                  {semaine.daysThresholdMet}{' '}
                  {semaine.daysThresholdMet === 1 ? strings['progress.dayOutOfSeven'] : strings['progress.daysOutOfSeven']}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function makeAccentStyles(accent: string) {
  return StyleSheet.create({
    windowButton: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: accent,
      borderRadius: 100,
      paddingVertical: 10,
      alignItems: 'center',
    },
    windowButtonSelected: {
      backgroundColor: accent,
    },
    windowButtonLabel: {
      color: accent,
      fontFamily: fonts.bodyBold,
    },
    pointsBar: {
      width: 6,
      borderRadius: 3,
      backgroundColor: accent,
    },
    ruleRatePercent: {
      fontSize: 15,
      fontFamily: fonts.bodyBold,
      color: accent,
      flexShrink: 0,
    },
    barFill: {
      height: '100%',
      backgroundColor: accent,
    },
  });
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 32,
  },
  body: {
    padding: 22,
    gap: 18,
  },
  windowRow: {
    flexDirection: 'row',
    gap: 8,
  },
  windowButtonLabelSelected: {
    color: '#fff',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 18,
    gap: 12,
    shadowColor: colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionTitle: {
    fontFamily: fonts.cursive,
    fontSize: 19,
    color: colors.ink,
  },
  empty: {
    color: colors.inkMuted,
    fontFamily: fonts.bodyMedium,
  },
  error: {
    color: colors.danger,
    textAlign: 'center',
    fontFamily: fonts.bodySemiBold,
  },
  chartRow: {
    flexDirection: 'row',
    gap: 8,
  },
  yAxis: {
    height: 100,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  yAxisLabel: {
    fontSize: 10,
    fontFamily: fonts.bodySemiBold,
    color: colors.inkMuted,
  },
  chartScroll: {
    flex: 1,
  },
  pointsChartWrap: {
    position: 'relative',
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingLeft: 6,
  },
  thresholdLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 2,
    borderTopColor: colors.special,
    borderStyle: 'dashed',
  },
  thresholdLabel: {
    position: 'absolute',
    right: 2,
    top: -14,
    fontSize: 9,
    fontFamily: fonts.bodyBold,
    color: colors.special,
  },
  pointsChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 100,
  },
  pointsBarVide: {
    backgroundColor: colors.border,
  },
  ruleRateRow: {
    gap: 6,
  },
  ruleRateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  ruleRateNameWrap: {
    flexShrink: 1,
    gap: 2,
  },
  ruleRateLabel: {
    fontSize: 15,
    fontFamily: fonts.bodyMedium,
    color: colors.ink,
  },
  ruleRateUsage: {
    fontSize: 11,
    fontFamily: fonts.bodyMedium,
    color: colors.inkMuted,
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  weekLabel: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: colors.ink,
    width: 72,
  },
  weekCount: {
    fontSize: 13,
    fontFamily: fonts.bodyMedium,
    color: colors.inkMuted,
    width: 90,
  },
});
