export type DateFieldProps = {
  value: Date | null;
  onChange: (date: Date) => void;
  placeholder: string;
  maximumDate?: Date;
  minimumDate?: Date;
};
