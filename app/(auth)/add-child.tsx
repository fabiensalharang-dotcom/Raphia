import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { supabase } from '../../data/supabaseClient';
import { useOnboardingState } from '../../data/useOnboardingState';
import { strings } from '../../i18n/fr-FR';
import { DateField } from './_DateField';

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
  if (onboarding.status === 'needs-rules' || onboarding.status === 'ready') {
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
    <View style={styles.container}>
      <Text style={styles.title}>{strings['onboarding.addChild.title']}</Text>

      <TextInput
        style={styles.input}
        placeholder={strings['onboarding.addChild.field.firstName']}
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
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
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
