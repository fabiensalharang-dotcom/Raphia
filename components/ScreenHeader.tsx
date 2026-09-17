import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

type ScreenHeaderProps = {
  title: string;
};

// En-tête partagé entre les écrans d'onglet (hors "Aujourd'hui", qui a son
// propre en-tête avec Pousse) — même bande courbée que la direction validée.
export default function ScreenHeader({ title }: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.accent,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 22,
  },
  title: {
    fontFamily: fonts.cursive,
    fontSize: 26,
    color: '#fff',
  },
});
