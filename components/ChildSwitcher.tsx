import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { useActiveChild } from '../data/activeChild';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

export default function ChildSwitcher() {
  const { children, activeChildId, setActiveChildId } = useActiveChild();

  if (children.length <= 1) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
      {children.map((enfant) => {
        const actif = enfant.id === activeChildId;
        return (
          <TouchableOpacity
            key={enfant.id}
            style={[styles.pill, actif && styles.pillActive]}
            onPress={() => setActiveChildId(enfant.id)}
          >
            <Text style={[styles.pillLabel, actif && styles.pillLabelActive]}>{enfant.firstName}</Text>
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
    borderColor: colors.accent,
    borderRadius: 100,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  pillActive: {
    backgroundColor: colors.accent,
  },
  pillLabel: {
    color: colors.accent,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  pillLabelActive: {
    color: '#fff',
  },
});
