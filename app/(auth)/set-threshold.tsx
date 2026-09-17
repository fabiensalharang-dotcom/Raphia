import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { calculerSeuilPropose } from '../../core/scoring';
import { supabase } from '../../data/supabaseClient';
import { useOnboardingState } from '../../data/useOnboardingState';
import { strings } from '../../i18n/fr-FR';
import ScreenHeader from '../../components/ScreenHeader';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

export default function SetThreshold() {
  const onboarding = useOnboardingState();
  const params = useLocalSearchParams<{ childId?: string; householdId?: string }>();
  const modeAjoutSupplementaire = typeof params.childId === 'string' && typeof params.householdId === 'string';
  const [seuil, setSeuil] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const childId = modeAjoutSupplementaire
    ? (params.childId as string)
    : onboarding.status === 'needs-threshold'
      ? onboarding.childId
      : null;

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
  if (!modeAjoutSupplementaire) {
    if (onboarding.status === 'needs-consent') {
      return <Redirect href="/(auth)/consent" />;
    }
    if (onboarding.status === 'needs-child') {
      return <Redirect href="/(auth)/add-child" />;
    }
    if (onboarding.status === 'needs-rules') {
      return <Redirect href="/(auth)/propose-rules" />;
    }
    if (onboarding.status === 'needs-rewards') {
      return <Redirect href="/(auth)/propose-rewards" />;
    }
    if (onboarding.status === 'ready') {
      return <Redirect href="/" />;
    }
  }

  async function handleSubmit() {
    if (!childId || seuil === null) return;

    setError(null);
    setSubmitting(true);
    const { error: updateError } = await supabase
      .from('child')
      .update({ settings: { dailyThreshold: seuil, weeklyThreshold: 5 } })
      .eq('id', childId);
    setSubmitting(false);
    if (updateError) {
      setError(strings['onboarding.setThreshold.error']);
      return;
    }
    if (modeAjoutSupplementaire) {
      router.replace(`/(main)/today?activateChildId=${childId}`);
    } else {
      router.replace('/');
    }
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <ScreenHeader title={strings['onboarding.setThreshold.title']} />

      <View style={styles.body}>
        <View style={styles.card}>
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
            placeholderTextColor={colors.inkMuted}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={submitting || seuil === null}>
            <Text style={styles.buttonText}>{strings['onboarding.setThreshold.submit']}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
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
  explanation: {
    fontFamily: fonts.bodyMedium,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: fonts.bodyBold,
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
    textAlign: 'center',
  },
});
