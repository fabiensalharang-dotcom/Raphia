import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { supabase } from '../../data/supabaseClient';
import { useOnboardingState } from '../../data/useOnboardingState';
import { strings } from '../../i18n/fr-FR';
import ColorPicker from '../../components/ColorPicker';
import { DateField } from '../../components/DateField';
import ScreenHeader from '../../components/ScreenHeader';
import { accentColorsFor, DEFAULT_ACCENT_KEY, type AccentColorKey } from '../../theme/accentPalette';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

const AGE_MIN = 5;
const AGE_MAX = 11;

// §1.1 : l'app cible les enfants de 5 à 11 ans — borner le sélecteur de
// date évite qu'un enfant hors tranche soit créé sans aucune habitude
// disponible dans le référentiel pour son âge.
function bornesDateNaissance(): { minimumDate: Date; maximumDate: Date } {
  const aujourdHui = new Date();
  const minimumDate = new Date(aujourdHui);
  minimumDate.setFullYear(aujourdHui.getFullYear() - AGE_MAX);
  const maximumDate = new Date(aujourdHui);
  maximumDate.setFullYear(aujourdHui.getFullYear() - AGE_MIN);
  return { minimumDate, maximumDate };
}

export default function AddChild() {
  const onboarding = useOnboardingState();
  const params = useLocalSearchParams<{ householdId?: string }>();
  // §1.2 « Multi-enfant » : un foyer déjà « ready » peut revenir sur cet
  // écran pour un enfant supplémentaire — le foyer arrive alors en
  // paramètre de route plutôt que via la machine à états de l'inscription.
  const modeAjoutSupplementaire = typeof params.householdId === 'string';
  const [firstName, setFirstName] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [themeColor, setThemeColor] = useState<AccentColorKey>(DEFAULT_ACCENT_KEY);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const accent = accentColorsFor(themeColor).accent;

  if (onboarding.status === 'signed-out') {
    return <Redirect href="/(auth)/sign-in" />;
  }
  if (!modeAjoutSupplementaire) {
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
  }

  const householdId = modeAjoutSupplementaire
    ? (params.householdId as string)
    : onboarding.status === 'needs-child'
      ? onboarding.householdId
      : null;

  async function handleSubmit() {
    if (!householdId || !birthDate) return;

    setError(null);
    setSubmitting(true);
    const { data: inserted, error: insertError } = await supabase
      .from('child')
      .insert({
        household_id: householdId,
        first_name: firstName,
        birth_date: birthDate.toISOString().slice(0, 10),
        settings: { themeColor },
      })
      .select('id')
      .single();
    setSubmitting(false);
    if (insertError || !inserted) {
      setError(strings['onboarding.addChild.error']);
      return;
    }
    if (modeAjoutSupplementaire) {
      router.replace(`/(auth)/propose-rules?childId=${inserted.id}&householdId=${householdId}`);
    } else {
      router.replace('/');
    }
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <ScreenHeader title={strings['onboarding.addChild.title']} accentColor={accent} />

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
            minimumDate={bornesDateNaissance().minimumDate}
            maximumDate={bornesDateNaissance().maximumDate}
          />
          <Text style={styles.hint}>{strings['onboarding.addChild.ageHint']}</Text>

          <Text style={styles.colorLabel}>{strings['onboarding.addChild.colorLabel']}</Text>
          <ColorPicker value={themeColor} onChange={setThemeColor} />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: accent }]}
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
  hint: {
    color: colors.inkMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    marginTop: -4,
  },
  colorLabel: {
    color: colors.ink,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    marginTop: 4,
  },
});
