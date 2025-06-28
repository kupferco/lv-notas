// src/components/payments/SessionPaymentCard.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SessionPaymentCardProps } from '../../types/payments';
import { PaymentStatusBadge } from './PaymentStatusBadge';

export const SessionPaymentCard: React.FC<SessionPaymentCardProps> = ({
  session
}) => {
  const formatCurrency = (amount: number): string => {
    return `R$ ${amount.toFixed(2).replace('.', ',')}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getPaymentStatusDetails = () => {
    switch (session.payment_status) {
      case 'paid':
        return {
          status: 'pago' as const,
          color: '#28a745',
          text: 'Pago',
          icon: '✅'
        };
      case 'overdue':
        return {
          status: 'pendente' as const,
          color: '#dc3545',
          text: 'Pendente',
          icon: '🔔'
        };
      case 'pending':
      default:
        return {
          status: 'aguardando_pagamento' as const,
          color: '#ffc107',
          text: 'Pendente',
          icon: '⏰'
        };
    }
  };

  const statusDetails = getPaymentStatusDetails();

  const getDaysSinceSessionText = () => {
    const days = session.days_since_session;
    if (days === 0) {
      return 'Hoje';
    } else if (days === 1) {
      return 'Ontem';
    } else if (days < 7) {
      return `${days} dias atrás`;
    } else if (days < 30) {
      const weeks = Math.floor(days / 7);
      return `${weeks} semana${weeks > 1 ? 's' : ''} atrás`;
    } else {
      const months = Math.floor(days / 30);
      return `${months} mês${months > 1 ? 'es' : ''} atrás`;
    }
  };

  return (
    <View style={styles.container}>
      {/* Session Header */}
      <View style={styles.header}>
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionDate}>
            📅 {formatDate(session.session_date)}
          </Text>
          <Text style={styles.timeSince}>
            {getDaysSinceSessionText()}
          </Text>
        </View>
        <PaymentStatusBadge
          status={statusDetails.status}
          text={statusDetails.text}
          color={statusDetails.color}
        />
      </View>

      {/* Patient and Payment Info */}
      <View style={styles.content}>
        <View style={styles.patientSection}>
          <Text style={styles.patientName}>👤 {session.patient_name}</Text>
        </View>
        
        <View style={styles.paymentSection}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Valor da sessão:</Text>
            <Text style={[
              styles.price,
              { color: session.payment_status === 'paid' ? '#28a745' : '#212529' }
            ]}>
              {formatCurrency(session.session_price)}
            </Text>
          </View>
          
          {session.payment_status !== 'paid' && (
            <Text style={styles.pendingNote}>
              💡 Pagamento pendente há {session.days_since_session} dias
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#dee2e6',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 2,
  },
  timeSince: {
    fontSize: 12,
    color: '#6c757d',
  },
  content: {
    padding: 14,
  },
  patientSection: {
    marginBottom: 12,
  },
  patientName: {
    fontSize: 15,
    color: '#495057',
    fontWeight: '500',
  },
  paymentSection: {
    gap: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
    color: '#6c757d',
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  pendingNote: {
    fontSize: 12,
    color: '#856404',
    backgroundColor: '#fff3cd',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
});