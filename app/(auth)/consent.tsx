import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { supabase } from '../../data/supabaseClient';
import { useOnboardingState } from '../../data/useOnboardingState';
import { strings } from '../../i18n/fr-FR';
import ScreenHeader from '../../components/ScreenHeader';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

const PROMESSES = [
  'onboarding.consent.promise.ritual',
  'onboarding.consent.promise.setup',
  'onboarding.consent.promise.rewards',
  'onboarding.consent.promise.tracking',
  'onboarding.consent.promise.growth',
  'onboarding.consent.promise.digest',
] as const;

type PointConformite = {
  icon: keyof typeof Ionicons.glyphMap;
  titleKey: 'onboarding.consent.dataCollected.title' | 'onboarding.consent.purpose.title' | 'onboarding.consent.hosting.title' | 'onboarding.consent.retention.title' | 'onboarding.consent.rights.title';
  shortKey: 'onboarding.consent.dataCollected.short' | 'onboarding.consent.purpose.short' | 'onboarding.consent.hosting.short' | 'onboarding.consent.retention.short' | 'onboarding.consent.rights.short';
  bodyKey: 'onboarding.consent.dataCollected.body' | 'onboarding.consent.purpose.body' | 'onboarding.consent.hosting.body' | 'onboarding.consent.retention.body' | 'onboarding.consent.rights.body';
};

const POINTS_CONFORMITE: PointConformite[] = [
  { icon: 'list-outline', titleKey: 'onboarding.consent.dataCollected.title', shortKey: 'onboarding.consent.dataCollected.short', bodyKey: 'onboarding.consent.dataCollected.body' },
  { icon: 'bulb-outline', titleKey: 'onboarding.consent.purpose.title', shortKey: 'onboarding.consent.purpose.short', bodyKey: 'onboarding.consent.purpose.body' },
  { icon: 'location-outline', titleKey: 'onboarding.consent.hosting.title', shortKey: 'onboarding.consent.hosting.short', bodyKey: 'onboarding.consent.hosting.body' },
  { icon: 'time-outline', titleKey: 'onboarding.consent.retention.title', shortKey: 'onboarding.consent.retention.short', bodyKey: 'onboarding.consent.retention.body' },
  { icon: 'shield-checkmark-outline', titleKey: 'onboarding.consent.rights.title', shortKey: 'onboarding.consent.rights.short', bodyKey: 'onboarding.consent.rights.body' },
];

function paires<T>(items: T[]): T[][] {
  const resultat: T[][] = [];
  for (let i = 0; i < items.length; i += 2) resultat.push(items.slice(i, i + 2));
  return resultat;
}

const CONSENT_POLICY_VERSION = '1.0';

function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'Europe/Paris';
  } catch {
    return 'Europe/Paris';
  }
}

export default function Consent() {
  const onboarding = useOnboardingState();
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (onboarding.status === 'signed-out') {
    return <Redirect href="/(auth)/sign-in" />;
  }
  if (
    onboarding.status === 'needs-child' ||
    onboarding.status === 'needs-rules' ||
    onboarding.status === 'needs-rewards' ||
    onboarding.status === 'needs-threshold' ||
    onboarding.status === 'ready'
  ) {
    return <Redirect href="/" />;
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    const { error: rpcError } = await supabase.rpc('complete_household_onboarding', {
      p_name: strings['onboarding.defaultHouseholdName'],
      p_timezone: deviceTimezone(),
      p_display_name: displayName,
      p_consent_version: CONSENT_POLICY_VERSION,
    });
    setSubmitting(false);
    if (rpcError) {
      setError(strings['onboarding.consent.error']);
      return;
    }
    router.replace('/');
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <ScreenHeader title={strings['onboarding.consent.title']} />

      <View style={styles.body}>
        <View style={styles.promiseCard}>
          <Text style={styles.promiseTitle}>{strings['onboarding.consent.promise.title']}</Text>
          {PROMESSES.map((cle) => (
            <View key={cle} style={styles.promiseRow}>
              <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
              <Text style={styles.promiseText}>{strings[cle]}</Text>
            </View>
          ))}
        </View>

        <View style={styles.complianceGrid}>
          {paires(POINTS_CONFORMITE).map((ligne) => (
            <View key={ligne.map((p) => p.titleKey).join('+')} style={styles.complianceRow}>
              {ligne.map((point) => (
                <CompliancePoint key={point.titleKey} point={point} />
              ))}
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder={strings['onboarding.consent.field.displayName']}
            placeholderTextColor={colors.inkMuted}
            value={displayName}
            onChangeText={setDisplayName}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={styles.button}
            onPress={handleSubmit}
            disabled={submitting || displayName.trim().length === 0}
          >
            <Text style={styles.buttonText}>{strings['onboarding.consent.submit']}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

function CompliancePoint({ point }: { point: PointConformite }) {
  const [ouvert, setOuvert] = useState(false);

  return (
    <TouchableOpacity style={styles.compliancePoint} onPress={() => setOuvert((v) => !v)} activeOpacity={0.7}>
      <View style={styles.compliancePointHeader}>
        <Ionicons name={point.icon} size={18} color={colors.accent} />
        <Text style={styles.compliancePointTitle}>{strings[point.titleKey]}</Text>
      </View>
      <Text style={styles.compliancePointShort}>{strings[point.shortKey]}</Text>
      {ouvert && <Text style={styles.compliancePointBody}>{strings[point.bodyKey]}</Text>}
      <Text style={styles.compliancePointToggle}>
        {ouvert ? strings['onboarding.consent.readLess'] : strings['onboarding.consent.readMore']}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 32,
  },
  body: {
    padding: 22,
    gap: 16,
  },
  promiseCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.accentSoft,
    padding: 18,
    gap: 12,
    shadowColor: colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  promiseTitle: {
    fontFamily: fonts.cursive,
    fontSize: 20,
    color: colors.ink,
  },
  promiseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  promiseText: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.ink,
  },
  complianceGrid: {
    gap: 10,
  },
  complianceRow: {
    flexDirection: 'row',
    gap: 10,
  },
  compliancePoint: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
    gap: 4,
    shadowColor: colors.ink,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  compliancePointHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compliancePointTitle: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.ink,
  },
  compliancePointShort: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.inkMuted,
  },
  compliancePointBody: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 2,
  },
  compliancePointToggle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.accent,
    marginTop: 2,
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
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    fontFamily: fonts.bodyMedium,
    color: colors.ink,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 100,
    padding: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontFamily: fonts.bodyBold,
  },
  error: {
    color: colors.danger,
    fontFamily: fonts.bodyMedium,
  },
});
