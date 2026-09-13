import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { fetchProgressView, type ProgressView } from '../../data/repositories/progressRepository';
import { supabase } from '../../data/supabaseClient';
import { useOnboardingState } from '../../data/useOnboardingState';
import { strings } from '../../i18n/fr-FR';

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

  const householdId = onboarding.status === 'ready' ? onboarding.householdId : null;
  const childId = onboarding.status === 'ready' ? onboarding.childId : null;

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
    return <View style={{ flex: 1 }} />;
  }
  if (onboarding.status !== 'ready') {
    return <Redirect href="/" />;
  }

  const pointsConnus = (vue?.dailyPoints ?? []).filter((jour) => jour.pointsTotal !== null);
  const maxPoints = Math.max(1, ...pointsConnus.map((jour) => jour.pointsTotal as number));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/(main)/today'))}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{strings['progress.title']}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.windowRow}>
        {FENETRES.map((valeur) => (
          <TouchableOpacity
            key={valeur}
            style={[styles.windowButton, fenetre === valeur && styles.windowButtonSelected]}
            onPress={() => setFenetre(valeur)}
          >
            <Text style={[styles.windowButtonLabel, fenetre === valeur && styles.windowButtonLabelSelected]}>
              {LIBELLE_FENETRE[valeur]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? <Text style={styles.error}>{strings['progress.error']}</Text> : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{strings['progress.pointsTitle']}</Text>
        {vue && pointsConnus.length === 0 ? (
          <Text style={styles.empty}>{strings['progress.pointsEmpty']}</Text>
        ) : (
          vue && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.pointsChart}>
                {vue.dailyPoints.map((jour) => {
                  const hauteur =
                    jour.pointsTotal === null ? 3 : Math.max(3, (jour.pointsTotal / maxPoints) * 100);
                  return (
                    <View
                      key={jour.date}
                      style={[styles.pointsBar, { height: hauteur }, jour.pointsTotal === null && styles.pointsBarVide]}
                    />
                  );
                })}
              </View>
            </ScrollView>
          )
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{strings['progress.ruleRatesTitle']}</Text>
        {vue && vue.ruleSuccessRates.length === 0 ? (
          <Text style={styles.empty}>{strings['progress.ruleRatesEmpty']}</Text>
        ) : (
          vue?.ruleSuccessRates.map((regle) => (
            <View key={regle.ruleInstanceId} style={styles.ruleRateRow}>
              <View style={styles.ruleRateHeader}>
                <Text style={styles.ruleRateLabel}>{regle.label}</Text>
                <Text style={styles.ruleRatePercent}>{Math.round(regle.tauxReussite * 100)} %</Text>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${regle.tauxReussite * 100}%` }]} />
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
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
                <View style={[styles.barFill, { width: `${(semaine.daysThresholdMet / 7) * 100}%` }]} />
              </View>
              <Text style={styles.weekCount}>
                {semaine.daysThresholdMet}{' '}
                {semaine.daysThresholdMet === 1 ? strings['progress.dayOutOfSeven'] : strings['progress.daysOutOfSeven']}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backArrow: {
    fontSize: 28,
    paddingHorizontal: 16,
  },
  headerSpacer: {
    width: 28,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  windowRow: {
    flexDirection: 'row',
    gap: 8,
  },
  windowButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#208AEF',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  windowButtonSelected: {
    backgroundColor: '#208AEF',
  },
  windowButtonLabel: {
    color: '#208AEF',
    fontWeight: '600',
  },
  windowButtonLabelSelected: {
    color: '#fff',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  empty: {
    color: '#444',
  },
  error: {
    color: '#B00020',
    textAlign: 'center',
  },
  pointsChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 100,
  },
  pointsBar: {
    width: 6,
    borderRadius: 3,
    backgroundColor: '#208AEF',
  },
  pointsBarVide: {
    backgroundColor: '#ddd',
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
  ruleRateLabel: {
    fontSize: 15,
    flexShrink: 1,
  },
  ruleRatePercent: {
    fontSize: 15,
    fontWeight: '600',
    color: '#208AEF',
    flexShrink: 0,
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#eee',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#208AEF',
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  weekLabel: {
    fontSize: 14,
    width: 72,
  },
  weekCount: {
    fontSize: 13,
    color: '#444',
    width: 90,
  },
});
