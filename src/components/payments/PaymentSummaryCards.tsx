// src/components/payments/PaymentSummaryCards.tsx

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { PaymentSummaryCardsProps } from '../../types/payments';
import { isSimpleMode, isAdvancedMode } from '../../config/paymentsMode';

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

  // Calculate consolidated amounts for simple mode
  const getConsolidatedAmounts = () => {
    if (isSimpleMode()) {
      // In simple mode: combine all non-paid amounts into "pending"
      const pendingAmount = summary.nao_cobrado_revenue + summary.aguardando_revenue + summary.pendente_revenue;
      const pendingSessions = summary.pending_sessions; // This should already include all non-paid sessions
      
      return {
        totalRevenue: summary.total_revenue,
        totalSessions: summary.total_sessions,
        paidRevenue: summary.paid_revenue,
        paidSessions: summary.paid_sessions,
        pendingRevenue: pendingAmount,
        pendingSessions: pendingSessions
      };
    }
    
    // Advanced mode returns original amounts
    return {
      totalRevenue: summary.total_revenue,
      totalSessions: summary.total_sessions,
      paidRevenue: summary.paid_revenue,
      paidSessions: summary.paid_sessions,
      naoCobradoRevenue: summary.nao_cobrado_revenue,
      aguardandoRevenue: summary.aguardando_revenue,
      pendenteRevenue: summary.pendente_revenue,
      pendingRevenue: summary.nao_cobrado_revenue + summary.aguardando_revenue + summary.pendente_revenue,
      pendingSessions: summary.pending_sessions
    };
  };

  const amounts = getConsolidatedAmounts();

  const renderSimpleModeCards = () => (
    <>
      {/* Total Revenue Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Receita Total</Text>
        <Text style={[styles.summaryAmount, styles.totalAmount]}>
          {formatCurrency(amounts.totalRevenue)}
        </Text>
        <Text style={styles.summarySubtext}>
          {amounts.totalSessions} sessões
        </Text>
      </View>

      {/* Paid Revenue Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>✅ Pago</Text>
        <Text style={[styles.summaryAmount, styles.paidAmount]}>
          {formatCurrency(amounts.paidRevenue)}
        </Text>
        <Text style={styles.summarySubtext}>
          {amounts.paidSessions} sessões
        </Text>
      </View>

      {/* Pending Revenue Card (consolidated) */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>○ Pendente</Text>
        <Text style={[styles.summaryAmount, styles.pendingConsolidatedAmount]}>
          {formatCurrency(amounts.pendingRevenue)}
        </Text>
        <Text style={styles.summarySubtext}>
          {amounts.pendingSessions} sessões
        </Text>
      </View>
    </>
  );

  const renderAdvancedModeCards = () => (
    <>
      {/* Total Revenue Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Receita Total</Text>
        <Text style={[styles.summaryAmount, styles.totalAmount]}>
          {formatCurrency(amounts.totalRevenue)}
        </Text>
        <Text style={styles.summarySubtext}>
          {amounts.totalSessions} sessões
        </Text>
      </View>

      {/* Paid Revenue Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>✅ Pago</Text>
        <Text style={[styles.summaryAmount, styles.paidAmount]}>
          {formatCurrency(amounts.paidRevenue)}
        </Text>
        <Text style={styles.summarySubtext}>
          {amounts.paidSessions} sessões
        </Text>
      </View>

      {/* Não Cobrado Revenue Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>○ Não Cobrado</Text>
        <Text style={[styles.summaryAmount, styles.naoCobradoAmount]}>
          {formatCurrency(amounts.naoCobradoRevenue || 0)}
        </Text>
        <Text style={styles.summarySubtext}>
          {Math.round((amounts.naoCobradoRevenue || 0) / (amounts.totalRevenue / amounts.totalSessions) || 0)} sessões
        </Text>
      </View>

      {/* Aguardando Revenue Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>⏳ Aguardando</Text>
        <Text style={[styles.summaryAmount, styles.aguardandoAmount]}>
          {formatCurrency(amounts.aguardandoRevenue || 0)}
        </Text>
        <Text style={styles.summarySubtext}>
          {Math.round((amounts.aguardandoRevenue || 0) / (amounts.totalRevenue / amounts.totalSessions) || 0)} sessões
        </Text>
      </View>

      {/* Pendente Revenue Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>⚠️ Pendente</Text>
        <Text style={[styles.summaryAmount, styles.pendenteAmount]}>
          {formatCurrency(amounts.pendenteRevenue || 0)}
        </Text>
        <Text style={styles.summarySubtext}>
          {Math.round((amounts.pendenteRevenue || 0) / (amounts.totalRevenue / amounts.totalSessions) || 0)} sessões
        </Text>
      </View>
    </>
  );

  return (
    <View style={styles.outerContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.scrollContainer}
        contentContainerStyle={styles.container}
      >
        {isSimpleMode() ? renderSimpleModeCards() : renderAdvancedModeCards()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    marginBottom: 15,
  },
  scrollContainer: {
    flexGrow: 0,
  },
  container: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    gap: 12,
    flex: 1,
    justifyContent: 'space-between',
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
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
    minHeight: 90,
    flex: 1,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6c757d',
    marginBottom: 6,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 20,
  },
  summarySubtext: {
    fontSize: 11,
    color: '#8a8a8a',
    textAlign: 'center',
    lineHeight: 14,
  },
  totalAmount: {
    color: '#495057',
    fontSize: 18,
    fontWeight: '800',
  },
  paidAmount: {
    color: '#28a745',
    fontWeight: '700',
  },
  naoCobradoAmount: {
    color: '#6c757d',
    fontWeight: '600',
  },
  aguardandoAmount: {
    color: '#fd7e14',
    fontWeight: '600',
  },
  pendenteAmount: {
    color: '#dc3545',
    fontWeight: '700',
  },
  // New style for consolidated pending in simple mode
  pendingConsolidatedAmount: {
    color: '#dc3545', // Red color to indicate pending payment
    fontWeight: '700',
  },
});