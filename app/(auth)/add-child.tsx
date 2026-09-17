import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { supabase } from '../../data/supabaseClient';
import { useOnboardingState } from '../../data/useOnboardingState';
import { strings } from '../../i18n/fr-FR';
import { DateField } from '../../components/DateField';
import ScreenHeader from '../../components/ScreenHeader';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

export default function AddChild() {
  const onboarding = useOnboardingState();
  const [firstName, setFirstName] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (onboarding.status === 'signed-out') {
    return <Redirect href="/(auth)/sign-in" />;
  }
  if (onboarding.status === 'needs-consent') {
    return <Redirect href="/(auth)/consent" />;
  }
  if (
    onboarding.status === 'needs-rules' ||
    onboarding.status === 'needs-rewards' ||
    onboarding.status === 'needs-threshold' ||
    onboarding.status === 'ready'
  ) {
    return <Redirect href="/" />;
  }

  async function handleSubmit() {
    if (onboarding.status !== 'needs-child' || !birthDate) return;

    setError(null);
    setSubmitting(true);
    const { error: insertError } = await supabase.from('child').insert({
      household_id: onboarding.householdId,
      first_name: firstName,
      birth_date: birthDate.toISOString().slice(0, 10),
    });
    setSubmitting(false);
    if (insertError) {
      setError(strings['onboarding.addChild.error']);
      return;
    }
    router.replace('/');
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <ScreenHeader title={strings['onboarding.addChild.title']} />

      <View style={styles.body}>
        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder={strings['onboarding.addChild.field.firstName']}
            placeholderTextColor={colors.inkMuted}
            value={firstName}
            onChangeText={setFirstName}
          />

          <DateField
            value={birthDate}
            onChange={setBirthDate}
            placeholder={strings['onboarding.addChild.field.birthDate']}
            maximumDate={new Date()}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={styles.button}
            onPress={handleSubmit}
            disabled={submitting || firstName.trim().length === 0 || !birthDate}
          >
            <Text style={styles.buttonText}>{strings['onboarding.addChild.submit']}</Text>
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
