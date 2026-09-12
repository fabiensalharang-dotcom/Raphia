import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity } from 'react-native';

import type { DateFieldProps } from './_DateField.types';

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR');
}

export function DateField({ value, onChange, placeholder, maximumDate }: DateFieldProps) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <>
      <TouchableOpacity style={styles.input} onPress={() => setShowPicker(true)}>
        <Text>{value ? formatDate(value) : placeholder}</Text>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={value ?? new Date(2018, 0, 1)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={maximumDate}
          onChange={(_event, selectedDate) => {
            setShowPicker(false);
            if (selectedDate) onChange(selectedDate);
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
  },
});
