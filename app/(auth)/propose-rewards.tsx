import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { calculerAge } from '../../core/referential';
import { proposerRecompensesInitiales } from '../../core/rewards';
import type { RewardTemplate } from '../../core/rewards/types';
import { fetchRewardTemplates } from '../../data/repositories/rewardTemplateRepository';
import { supabase } from '../../data/supabaseClient';
import { useOnboardingState } from '../../data/useOnboardingState';
import { strings } from '../../i18n/fr-FR';
import ScreenHeader from '../../components/ScreenHeader';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

export default function ProposeRewards() {
  const onboarding = useOnboardingState();
  const [quotidiennes, setQuotidiennes] = useState<RewardTemplate[] | null>(null);
  const [hebdomadaires, setHebdomadaires] = useState<RewardTemplate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const childId = onboarding.status === 'needs-rewards' ? onboarding.childId : null;

  useEffect(() => {
    if (!childId) return;
    let cancelled = false;

    async function load() {
      const [{ data: child, error: childError }, templates] = await Promise.all([
        supabase.from('child').select('birth_date').eq('id', childId as string).single(),
        fetchRewardTemplates(),
      ]);
      if (cancelled) return;
      if (childError || !child) {
        setError(strings['onboarding.proposeRewards.error']);
        return;
      }

      const age = calculerAge(child.birth_date);
      const adaptees = templates.filter((t) => t.ageMin <= age && age <= t.ageMax);
      const proposition = proposerRecompensesInitiales(
        adaptees.filter((t) => t.tier === 'daily'),
        adaptees.filter((t) => t.tier === 'weekly')
      );
      setQuotidiennes(proposition.quotidiennes);
      setHebdomadaires(proposition.hebdomadaires);
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
  if (onboarding.status === 'needs-threshold' || onboarding.status === 'ready') {
    return <Redirect href="/" />;
  }

  async function handleSubmit() {
    if (onboarding.status !== 'needs-rewards' || !quotidiennes || !hebdomadaires) return;

    setError(null);
    setSubmitting(true);
    const lignes = [
      ...quotidiennes.map((r, index) => ({
        child_id: onboarding.childId,
        template_id: r.id,
        label: r.label,
        category: r.category,
        tier: 'daily' as const,
        display_order: index,
      })),
      ...hebdomadaires.map((r, index) => ({
        child_id: onboarding.childId,
        template_id: r.id,
        label: r.label,
        category: r.category,
        tier: 'weekly' as const,
        display_order: index,
      })),
    ];
    const { error: insertError } = await supabase.from('reward_instance').insert(lignes);
    setSubmitting(false);
    if (insertError) {
      setError(strings['onboarding.proposeRewards.error']);
      return;
    }
    router.replace('/');
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <ScreenHeader title={strings['onboarding.proposeRewards.title']} />

      <View style={styles.body}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{strings['onboarding.proposeRewards.dailyTitle']}</Text>
          {(quotidiennes ?? []).map((r) => (
            <View key={r.id} style={styles.rewardCard}>
              <Text style={styles.rewardLabel}>{r.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{strings['onboarding.proposeRewards.weeklyTitle']}</Text>
          {(hebdomadaires ?? []).map((r) => (
            <View key={r.id} style={styles.rewardCard}>
              <Text style={styles.rewardLabel}>{r.label}</Text>
            </View>
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={styles.button}
          onPress={handleSubmit}
          disabled={submitting || !quotidiennes || !hebdomadaires}
        >
          <Text style={styles.buttonText}>{strings['onboarding.proposeRewards.submit']}</Text>
        </TouchableOpacity>
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
    gap: 10,
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
  rewardCard: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
  },
  rewardLabel: {
    fontSize: 15,
    fontFamily: fonts.bodyMedium,
    color: colors.ink,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 100,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
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
