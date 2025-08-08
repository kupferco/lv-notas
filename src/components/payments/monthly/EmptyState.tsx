// src/components/payments/monthly/EmptyState.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface EmptyStateProps {
  selectedMonth: number;
  selectedYear: number;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  selectedMonth,
  selectedYear
}) => {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>
        Nenhum paciente com sessões para {selectedMonth}/{selectedYear}
      </Text>
      <Text style={styles.emptyStateSubtext}>
        Pacientes sem sessões são automaticamente ocultados.
        Verifique se há sessões agendadas no Google Calendar para este período.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
  },
});