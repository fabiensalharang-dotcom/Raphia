import { Link, Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { supabase } from '../../data/supabaseClient';
import { useSession } from '../../data/useSession';
import { strings } from '../../i18n/fr-FR';
import { authErrorMessage } from '../../components/authErrors';
import ScreenHeader from '../../components/ScreenHeader';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

export default function SignIn() {
  const { session } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (session) {
    return <Redirect href="/" />;
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (signInError) {
      setError(authErrorMessage(signInError));
      return;
    }
    router.replace('/');
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <ScreenHeader title={strings['auth.signIn.title']} />

      <View style={styles.body}>
        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder={strings['auth.field.email']}
            placeholderTextColor={colors.inkMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder={strings['auth.field.password']}
            placeholderTextColor={colors.inkMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={submitting}>
            <Text style={styles.buttonText}>{strings['auth.signIn.submit']}</Text>
          </TouchableOpacity>
        </View>

        <Link href="/(auth)/sign-up" style={styles.link}>
          {strings['auth.signIn.switchToSignUp']}
        </Link>
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
  link: {
    fontFamily: fonts.bodySemiBold,
    color: colors.accent,
    textAlign: 'center',
  },
});
