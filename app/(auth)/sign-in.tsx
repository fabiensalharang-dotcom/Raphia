import { Link, Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { supabase } from '../../data/supabaseClient';
import { useSession } from '../../data/useSession';
import { strings } from '../../i18n/fr-FR';
import { authErrorMessage } from './_authErrors';

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
    <View style={styles.container}>
      <Text style={styles.title}>{strings['auth.signIn.title']}</Text>

      <TextInput
        style={styles.input}
        placeholder={strings['auth.field.email']}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder={strings['auth.field.password']}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={submitting}>
        <Text style={styles.buttonText}>{strings['auth.signIn.submit']}</Text>
      </TouchableOpacity>

      <Link href="/(auth)/sign-up" style={styles.link}>
        {strings['auth.signIn.switchToSignUp']}
      </Link>
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
  link: {
    marginTop: 16,
    textAlign: 'center',
  },
});
