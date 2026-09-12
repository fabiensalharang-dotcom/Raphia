import { Redirect } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { supabase } from '../data/supabaseClient';
import { useOnboardingState } from '../data/useOnboardingState';
import { strings } from '../i18n/fr-FR';

export default function Home() {
  const onboarding = useOnboardingState();

  switch (onboarding.status) {
    case 'loading':
      return <View style={styles.container} />;
    case 'signed-out':
      return <Redirect href="/(auth)/sign-in" />;
    case 'needs-consent':
      return <Redirect href="/(auth)/consent" />;
    case 'needs-child':
      return <Redirect href="/(auth)/add-child" />;
    case 'ready':
      return (
        <View style={styles.container}>
          <Text style={styles.title}>{strings['app.name']}</Text>
          <TouchableOpacity onPress={() => supabase.auth.signOut()}>
            <Text style={styles.signOut}>{strings['auth.signOut']}</Text>
          </TouchableOpacity>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  signOut: {
    color: '#208AEF',
  },
});
