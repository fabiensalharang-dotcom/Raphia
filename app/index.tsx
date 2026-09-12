import { Redirect } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { supabase } from '../data/supabaseClient';
import { useSession } from '../data/useSession';
import { strings } from '../i18n/fr-FR';

export default function Home() {
  const { session, loading } = useSession();

  if (loading) {
    return <View style={styles.container} />;
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{strings['app.name']}</Text>
      <TouchableOpacity onPress={() => supabase.auth.signOut()}>
        <Text style={styles.signOut}>{strings['auth.signOut']}</Text>
      </TouchableOpacity>
    </View>
  );
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
