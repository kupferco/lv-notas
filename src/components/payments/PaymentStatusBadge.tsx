// src/components/payments/PaymentStatusBadge.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PaymentStatusBadgeProps } from '../../types/payments';

export const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({
  status,
  text,
  color
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'pago':
        return '✅';
      case 'nao_cobrado':
        return '📄';
      case 'aguardando_pagamento':
        return '⏰';
      case 'pendente':
        return '🔔';
      default:
        return '📋';
    }
  };

  const getBackgroundColor = () => {
    // Lighter version of the main color for background
    switch (status) {
      case 'pago':
        return '#d4edda'; // Light green
      case 'nao_cobrado':
        return '#e2e3e5'; // Light gray
      case 'aguardando_pagamento':
        return '#fff3cd'; // Light yellow
      case 'pendente':
        return '#f8d7da'; // Light red
      default:
        return '#e9ecef';
    }
  };

  return (
    <View style={[
      styles.container,
      { 
        backgroundColor: getBackgroundColor(),
        borderColor: color
      }
    ]}>
      <Text style={styles.icon}>{getStatusIcon()}</Text>
      <Text style={[styles.text, { color }]}>
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  icon: {
    fontSize: 12,
    marginRight: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});