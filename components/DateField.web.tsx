import type { DateFieldProps } from './DateField.types';

// Variante web : @react-native-community/datetimepicker n'a aucun support
// web (vérifié dans son code source, aucun fichier .web.*). Metro résout
// automatiquement ce fichier à la place de DateField.tsx quand la cible
// est le web — le natif iOS/Android n'est pas concerné.
export function DateField({ value, onChange, placeholder, maximumDate }: DateFieldProps) {
  return (
    <input
      type="date"
      value={value ? value.toISOString().slice(0, 10) : ''}
      max={maximumDate ? maximumDate.toISOString().slice(0, 10) : undefined}
      placeholder={placeholder}
      onChange={(event) => {
        const raw = event.target.value;
        if (raw) onChange(new Date(`${raw}T00:00:00`));
      }}
      style={{
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        fontFamily: 'inherit',
      }}
    />
  );
}
