// src/components/payments/PaymentSummaryCards.tsx

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { PaymentSummaryCardsProps } from '../../types/payments';

export const PaymentSummaryCards: React.FC<PaymentSummaryCardsProps> = ({
  summary,
  loading = false
}) => {
  const formatCurrency = (amount: number): string => {
    return `R$ ${amount.toFixed(2).replace('.', ',')}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#6200ee" />
        <Text style={styles.loadingText}>Calculando receitas...</Text>
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.container}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Nenhum dado</Text>
          <Text style={styles.summaryAmount}>R$ 0,00</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Total Revenue Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Receita Total</Text>
        <Text style={styles.summaryAmount}>
          {formatCurrency(summary.total_revenue)}
        </Text>
        <Text style={styles.summarySubtext}>
          {summary.total_sessions} sessões
        </Text>
      </View>

      {/* Paid Revenue Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Pago</Text>
        <Text style={[styles.summaryAmount, styles.paidAmount]}>
          {formatCurrency(summary.paid_revenue)}
        </Text>
        <Text style={styles.summarySubtext}>
          {summary.paid_sessions} sessões
        </Text>
      </View>

      {/* Pending Revenue Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Pendente</Text>
        <Text style={[styles.summaryAmount, styles.pendingAmount]}>
          {formatCurrency(summary.pending_revenue)}
        </Text>
        <Text style={styles.summarySubtext}>
          {summary.pending_sessions} sessões
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 15,
    gap: 10,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#6c757d',
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
    minHeight: 80,
    justifyContent: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 5,
    fontWeight: '500',
    textAlign: 'center',
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    textAlign: 'center',
    marginBottom: 2,
  },
  summarySubtext: {
    fontSize: 11,
    color: '#8a8a8a',
    textAlign: 'center',
  },
  paidAmount: {
    color: '#28a745',
  },
  pendingAmount: {
    color: '#ffc107',
  },
});