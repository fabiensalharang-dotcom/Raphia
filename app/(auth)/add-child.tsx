import DateTimePicker from '@react-native-community/datetimepicker';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { supabase } from '../../data/supabaseClient';
import { useOnboardingState } from '../../data/useOnboardingState';
import { strings } from '../../i18n/fr-FR';

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR');
}

export default function AddChild() {
  const onboarding = useOnboardingState();
  const [firstName, setFirstName] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (onboarding.status === 'signed-out') {
    return <Redirect href="/(auth)/sign-in" />;
  }
  if (onboarding.status === 'needs-consent') {
    return <Redirect href="/(auth)/consent" />;
  }
  if (onboarding.status === 'ready') {
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

      <TouchableOpacity style={styles.input} onPress={() => setShowPicker(true)}>
        <Text>{birthDate ? formatDate(birthDate) : strings['onboarding.addChild.field.birthDate']}</Text>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={birthDate ?? new Date(2018, 0, 1)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date()}
          onChange={(_event, selectedDate) => {
            setShowPicker(false);
            if (selectedDate) setBirthDate(selectedDate);
          }}
        />
      )}

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
