import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { supabase } from '../../data/supabaseClient';
import { useOnboardingState } from '../../data/useOnboardingState';
import { strings } from '../../i18n/fr-FR';

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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{strings['onboarding.consent.title']}</Text>

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

      <TextInput
        style={styles.input}
        placeholder={strings['onboarding.consent.field.displayName']}
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
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  section: {
    gap: 4,
  },
  sectionTitle: {
    fontWeight: '600',
  },
  sectionBody: {
    color: '#444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  error: {
    color: '#B00020',
  },
});
