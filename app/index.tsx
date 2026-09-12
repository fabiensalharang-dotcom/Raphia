import { StyleSheet, Text, View } from 'react-native';

import { strings } from '../i18n/fr-FR';

export default function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{strings['app.name']}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
});
