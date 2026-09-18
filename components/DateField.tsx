import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { DateFieldProps } from './DateField.types';
import { strings } from '../i18n/fr-FR';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR');
}

export function DateField({ value, onChange, placeholder, maximumDate, minimumDate }: DateFieldProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [valeurProvisoire, setValeurProvisoire] = useState<Date>(value ?? maximumDate ?? new Date(2018, 0, 1));

  function ouvrir() {
    setValeurProvisoire(value ?? maximumDate ?? new Date(2018, 0, 1));
    setShowPicker(true);
  }

  function handleChange(_event: unknown, selectedDate?: Date) {
    if (!selectedDate) return;
    // §9 : sur Android, le sélecteur natif est une boîte de dialogue qui se
    // ferme d'elle-même après un choix — sur iOS, le mode « spinner » déclenche
    // un onChange à chaque molette tournée, donc on ne ferme qu'à la
    // confirmation explicite (bouton Valider), sinon la première molette
    // touchée referme tout le sélecteur.
    if (Platform.OS === 'android') {
      setShowPicker(false);
      onChange(selectedDate);
      return;
    }
    setValeurProvisoire(selectedDate);
  }

  function valider() {
    onChange(valeurProvisoire);
    setShowPicker(false);
  }

  return (
    <>
      <TouchableOpacity style={styles.input} onPress={ouvrir}>
        <Text style={value ? styles.text : styles.placeholder}>{value ? formatDate(value) : placeholder}</Text>
      </TouchableOpacity>

      {showPicker && (
        <View>
          <DateTimePicker
            value={valeurProvisoire}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={maximumDate}
            minimumDate={minimumDate}
            onChange={handleChange}
          />
          {Platform.OS === 'ios' && (
            <TouchableOpacity style={styles.confirmButton} onPress={valider}>
              <Text style={styles.confirmButtonText}>{strings['common.confirm']}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    justifyContent: 'center',
  },
  text: {
    fontFamily: fonts.bodyMedium,
    color: colors.ink,
  },
  placeholder: {
    fontFamily: fonts.bodyMedium,
    color: colors.inkMuted,
  },
  confirmButton: {
    backgroundColor: colors.accent,
    borderRadius: 100,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontFamily: fonts.bodyBold,
  },
});
