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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{strings['onboarding.proposeRewards.title']}</Text>

      <Text style={styles.sectionTitle}>{strings['onboarding.proposeRewards.dailyTitle']}</Text>
      {(quotidiennes ?? []).map((r) => (
        <View key={r.id} style={styles.rewardCard}>
          <Text style={styles.rewardLabel}>{r.label}</Text>
        </View>
      ))}

      <Text style={styles.sectionTitle}>{strings['onboarding.proposeRewards.weeklyTitle']}</Text>
      {(hebdomadaires ?? []).map((r) => (
        <View key={r.id} style={styles.rewardCard}>
          <Text style={styles.rewardLabel}>{r.label}</Text>
        </View>
      ))}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={styles.button}
        onPress={handleSubmit}
        disabled={submitting || !quotidiennes || !hebdomadaires}
      >
        <Text style={styles.buttonText}>{strings['onboarding.proposeRewards.submit']}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  rewardCard: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 14,
  },
  rewardLabel: {
    fontSize: 16,
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
