import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

type ScreenHeaderProps = {
  title: string;
  accentColor?: string;
};

// En-tête partagé entre les écrans d'onglet (hors "Aujourd'hui", qui a son
// propre en-tête avec Pousse) — même bande courbée que la direction validée.
// accentColor est optionnel : les écrans sans enfant actif (inscription,
// connexion) gardent la couleur par défaut.
export default function ScreenHeader({ title, accentColor }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }, accentColor ? { backgroundColor: accentColor } : null]}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.accent,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: 20,
    paddingHorizontal: 22,
  },
  title: {
    fontFamily: fonts.cursive,
    fontSize: 26,
    color: '#fff',
  },
});
