import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';

import { nomIoniconPour } from '../../components/ruleIcons';
import { fetchDisplayState, type DisplayState } from '../../data/repositories/displayStateRepository';
import { strings } from '../../i18n/fr-FR';

// §8.5 : route dédiée, alimentée par un seul DisplayState sérialisable,
// aucune dépendance à l'état de navigation de l'app, aucune interaction —
// prête à devenir une page web autonome en V1.5 sans réécriture.
export default function Display() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const [state, setState] = useState<DisplayState | null>(null);
  const [error, setError] = useState(false);
  const franchissement = useRef(new Animated.Value(1)).current;

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

    return () => {
      cancelled = true;
    };
  }, [childId]);

  useEffect(() => {
    if (!state?.thresholdMet) return;
    // §9.2 : une seule animation, celle du franchissement du seuil.
    Animated.sequence([
      Animated.timing(franchissement, { toValue: 1.15, duration: 300, useNativeDriver: true }),
      Animated.timing(franchissement, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [state?.thresholdMet, franchissement]);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{strings['display.error']}</Text>
      </View>
    );
  }

  if (!state) {
    return <View style={styles.container} />;
  }

  const proportion = state.thresholdApplied > 0 ? Math.min(1, state.score / state.thresholdApplied) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.childName}>{state.childFirstName}</Text>
        <Animated.Text style={[styles.score, { transform: [{ scale: franchissement }] }]}>
          {state.score}
        </Animated.Text>
      </View>

      <View style={styles.gaugeTrack}>
        <View style={[styles.gaugeFill, { width: `${proportion * 100}%` }]} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    paddingHorizontal: '5%',
    paddingVertical: '5%',
    justifyContent: 'space-between',
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
  errorText: {
    color: '#E5E7EB',
    fontSize: 24,
    textAlign: 'center',
    marginTop: 40,
  },
});
