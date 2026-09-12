import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { calculerSeuilPropose } from '../../core/scoring';
import { supabase } from '../../data/supabaseClient';
import { useOnboardingState } from '../../data/useOnboardingState';
import { strings } from '../../i18n/fr-FR';

export default function SetThreshold() {
  const onboarding = useOnboardingState();
  const [seuil, setSeuil] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const childId = onboarding.status === 'needs-threshold' ? onboarding.childId : null;

  useEffect(() => {
    if (!childId) return;

    let cancelled = false;

    async function load() {
      const { data: regles, error: reglesError } = await supabase
        .from('rule_instance')
        .select('points, is_thematic, bonus_value')
        .eq('child_id', childId as string)
        .eq('status', 'active');

      if (cancelled) return;
      if (reglesError || !regles) {
        setError(strings['onboarding.setThreshold.error']);
        return;
      }

      const thematique = regles.find((r) => r.is_thematic);
      const seuilPropose = calculerSeuilPropose(
        regles.map((r) => r.points),
        thematique?.bonus_value ?? 0
      );
      setSeuil(seuilPropose);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [childId]);

  if (onboarding.status === 'signed-out') {
    return <Redirect href="/(auth)/sign-in" />;
  }
  if (onboarding.status === 'needs-consent') {
    return <Redirect href="/(auth)/consent" />;
  }
  if (onboarding.status === 'needs-child') {
    return <Redirect href="/(auth)/add-child" />;
  }
  if (onboarding.status === 'needs-rules') {
    return <Redirect href="/(auth)/propose-rules" />;
  }
  if (onboarding.status === 'ready') {
    return <Redirect href="/" />;
  }

  async function handleSubmit() {
    if (onboarding.status !== 'needs-threshold' || seuil === null) return;

    setError(null);
    setSubmitting(true);
    const { error: updateError } = await supabase
      .from('child')
      .update({ settings: { dailyThreshold: seuil, weeklyThreshold: 5 } })
      .eq('id', onboarding.childId);
    setSubmitting(false);
    if (updateError) {
      setError(strings['onboarding.setThreshold.error']);
      return;
    }
    router.replace('/');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{strings['onboarding.setThreshold.title']}</Text>
      <Text style={styles.explanation}>{strings['onboarding.setThreshold.explanation']}</Text>

      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        value={seuil === null ? '' : String(seuil)}
        onChangeText={(text) => {
          const parsed = parseInt(text, 10);
          setSeuil(Number.isNaN(parsed) ? 0 : parsed);
        }}
        placeholder={strings['onboarding.setThreshold.field']}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={submitting || seuil === null}>
        <Text style={styles.buttonText}>{strings['onboarding.setThreshold.submit']}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  explanation: {
    color: '#444',
    textAlign: 'center',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    textAlign: 'center',
    fontSize: 18,
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
