import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ACCENT_PALETTE, ORDRE_PALETTE, type AccentColorKey } from '../theme/accentPalette';

type ColorPickerProps = {
  value: AccentColorKey;
  onChange: (cle: AccentColorKey) => void;
};

export default function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <View style={styles.row}>
      {ORDRE_PALETTE.map((cle) => {
        const selectionnee = cle === value;
        return (
          <TouchableOpacity
            key={cle}
            style={[styles.swatch, { backgroundColor: ACCENT_PALETTE[cle].accent }]}
            onPress={() => onChange(cle)}
            accessibilityLabel={cle}
          >
            {selectionnee && <Ionicons name="checkmark" size={18} color="#fff" />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  swatch: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
