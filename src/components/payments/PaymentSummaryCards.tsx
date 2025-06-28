// src/components/payments/PaymentSummaryCards.tsx

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
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
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.scrollContainer}
      contentContainerStyle={styles.container}
    >
      {/* Total Revenue Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Receita Total</Text>
        <Text style={[styles.summaryAmount, styles.totalAmount]}>
          {formatCurrency(summary.total_revenue)}
        </Text>
        <Text style={styles.summarySubtext}>
          {summary.total_sessions} sessões
        </Text>
      </View>

      {/* Paid Revenue Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>✅ Pago</Text>
        <Text style={[styles.summaryAmount, styles.paidAmount]}>
          {formatCurrency(summary.paid_revenue)}
        </Text>
        <Text style={styles.summarySubtext}>
          {summary.paid_sessions} sessões
        </Text>
      </View>

      {/* Não Cobrado Revenue Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>○ Não Cobrado</Text>
        <Text style={[styles.summaryAmount, styles.naoCobradoAmount]}>
          {formatCurrency(summary.nao_cobrado_revenue)}
        </Text>
        <Text style={styles.summarySubtext}>
          {Math.round((summary.nao_cobrado_revenue / (summary.total_revenue / summary.total_sessions)) || 0)} sessões
        </Text>
      </View>

      {/* Aguardando Revenue Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>⏳ Aguardando</Text>
        <Text style={[styles.summaryAmount, styles.aguardandoAmount]}>
          {formatCurrency(summary.aguardando_revenue)}
        </Text>
        <Text style={styles.summarySubtext}>
          {Math.round((summary.aguardando_revenue / (summary.total_revenue / summary.total_sessions)) || 0)} sessões
        </Text>
      </View>

      {/* Pendente Revenue Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>⚠️ Pendente</Text>
        <Text style={[styles.summaryAmount, styles.pendenteAmount]}>
          {formatCurrency(summary.pendente_revenue)}
        </Text>
        <Text style={styles.summarySubtext}>
          {Math.round((summary.pendente_revenue / (summary.total_revenue / summary.total_sessions)) || 0)} sessões
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    marginBottom: 15,
  },
  container: {
    flexDirection: 'row',
    paddingHorizontal: 15,
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
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
    minHeight: 80,
    minWidth: 120,
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
    fontSize: 16,
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
  totalAmount: {
    color: '#495057',
    fontSize: 18,
  },
  paidAmount: {
    color: '#28a745',
  },
  naoCobradoAmount: {
    color: '#6c757d',
  },
  aguardandoAmount: {
    color: '#fd7e14',
  },
  pendenteAmount: {
    color: '#dc3545',
  },
});