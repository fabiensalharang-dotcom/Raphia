import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { useActiveChild } from '../data/activeChild';
import { accentColorsFor } from '../theme/accentPalette';
import { fonts } from '../theme/typography';

export default function ChildSwitcher() {
  const { children, activeChildId, setActiveChildId } = useActiveChild();

  if (children.length <= 1) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
      {children.map((enfant) => {
        const actif = enfant.id === activeChildId;
        const { accent } = accentColorsFor(enfant.themeColor);
        return (
          <TouchableOpacity
            key={enfant.id}
            style={[styles.pill, { borderColor: accent }, actif && { backgroundColor: accent }]}
            onPress={() => setActiveChildId(enfant.id)}
          >
            <Text style={[styles.pillLabel, { color: actif ? '#fff' : accent }]}>{enfant.firstName}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 22,
    paddingTop: 14,
  },
  pill: {
    borderWidth: 1.5,
    borderRadius: 100,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  pillLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
});
