import React from 'react';
import { View, Text, TextInput, TextInputProps, StyleSheet } from 'react-native';

interface Props extends TextInputProps {
  label: string;
  error?: string;
}

export default function FormInput({ label, error, ...props }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error && styles.inputError]}
        placeholderTextColor="#6B7280"
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { color: '#D1D5DB', fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: '#374151',
    color: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  inputError: { borderColor: '#EF4444' },
  error: { color: '#EF4444', fontSize: 12, marginTop: 4 },
});
