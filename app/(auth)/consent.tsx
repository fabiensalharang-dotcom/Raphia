import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { supabase } from '../../data/supabaseClient';
import { useOnboardingState } from '../../data/useOnboardingState';
import { strings } from '../../i18n/fr-FR';
import ScreenHeader from '../../components/ScreenHeader';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

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
        <Section
          title={strings['onboarding.consent.dataCollected.title']}
          body={strings['onboarding.consent.dataCollected.body']}
        />
        <Section
          title={strings['onboarding.consent.purpose.title']}
          body={strings['onboarding.consent.purpose.body']}
        />
        <Section
          title={strings['onboarding.consent.hosting.title']}
          body={strings['onboarding.consent.hosting.body']}
        />
        <Section
          title={strings['onboarding.consent.retention.title']}
          body={strings['onboarding.consent.retention.body']}
        />
        <Section
          title={strings['onboarding.consent.rights.title']}
          body={strings['onboarding.consent.rights.body']}
        />

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

function Section({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{body}</Text>
    </View>
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
  section: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 18,
    gap: 6,
    shadowColor: colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.ink,
  },
  sectionBody: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.inkMuted,
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
