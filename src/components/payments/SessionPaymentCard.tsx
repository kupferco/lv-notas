// src/components/payments/SessionPaymentCard.tsx

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { SessionPaymentDetail } from '../../types/payments';
import { isSimpleMode, getStatusOptions, getStatusDisplayLabel, getStatusMapping } from '../../config/paymentsMode';

interface SessionPaymentCardProps {
  session: SessionPaymentDetail;
  onStatusChange?: (sessionId: number, newStatus: string) => void;
}

export const SessionPaymentCard: React.FC<SessionPaymentCardProps> = ({
  session,
  onStatusChange
}) => {
  const formatCurrency = (amount: number): string => {
    return `R$ ${amount.toFixed(2).replace('.', ',')}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const getStatusConfig = (status: string) => {
    // In simple mode, map the status to display version
    const displayStatus = isSimpleMode() ?
      (status === 'paid' ? 'paid' : 'pending') :
      status;

    switch (displayStatus) {
      case 'paid':
        return {
          color: '#28a745',
          backgroundColor: '#d4edda',
          borderColor: '#28a745',
          label: 'Pago',
          icon: '✓'
        };
      case 'aguardando_pagamento':
        return {
          color: '#fd7e14',
          backgroundColor: '#fff3cd',
          borderColor: '#fd7e14',
          label: 'Aguardando',
          icon: '⏳'
        };
      case 'pendente':
        return {
          color: '#dc3545',
          backgroundColor: '#f8d7da',
          borderColor: '#dc3545',
          label: 'Pendente',
          icon: '⚠️'
        };
      case 'pending': // This includes the consolidated "pending" in simple mode
      default:
        if (isSimpleMode()) {
          return {
            color: '#dc3545',
            backgroundColor: '#f8d7da',
            borderColor: '#dc3545',
            label: 'Pendente',
            icon: '○'
          };
        } else {
          return {
            color: '#6c757d',
            backgroundColor: '#f8f9fa',
            borderColor: '#6c757d',
            label: 'Não Cobrado',
            icon: '○'
          };
        }
    }
  };

  // Get the current status for display purposes
  const getDisplayStatus = () => {
    if (isSimpleMode()) {
      // In simple mode, map all non-paid statuses to 'pending'
      return session.payment_status === 'paid' ? 'paid' : 'pending';
    }
    return session.payment_status;
  };

  const displayStatus = getDisplayStatus();
  const currentStatus = getStatusConfig(displayStatus);
  const statusOptions = getStatusOptions();

  const handleStatusChange = (newStatus: string) => {
    if (onStatusChange && newStatus !== session.payment_status) {
      // In simple mode, when user selects 'pending', we map it to the actual backend status
      // For now, we'll default to 'pending' (não cobrado) when they select pending in simple mode
      // The backend will still store the granular status

      let actualStatus = newStatus;

      // If in simple mode and user selected 'pending', use the original status or default to 'pending'
      if (isSimpleMode() && newStatus === 'pending') {
        // Keep the existing granular status if it's already a pending variant,
        // otherwise default to 'pending' (não cobrado)
        if (['pending', 'aguardando_pagamento', 'pendente'].includes(session.payment_status)) {
          actualStatus = session.payment_status; // Keep existing granular status
        } else {
          actualStatus = 'pending'; // Default to não cobrado
        }
      }

      onStatusChange(session.session_id, actualStatus);
    }
  };

  return (
    <View style={styles.card}>
      {/* Session Info Header */}
      <View style={styles.header}>
        <Text style={styles.patientName}>{session.patient_name}</Text>
        <Text style={styles.sessionDate}>{formatDate(session.session_date)}</Text>
      </View>

      {/* Payment Details Row */}
      <View style={styles.paymentRow}>
        {/* Amount */}
        <View style={styles.amountContainer}>
          <Text style={styles.amountLabel}>Valor:</Text>
          <Text style={styles.amount}>{formatCurrency(session.session_price)}</Text>
        </View>

        {/* Status Picker styled as Pill */}
        <View style={styles.statusPickerContainer}>
          <View style={[
            {
              backgroundColor: currentStatus.backgroundColor,
              borderColor: currentStatus.borderColor
            }
          ]}>
            <Picker
              selectedValue={displayStatus}
              onValueChange={handleStatusChange}
              style={[styles.statusPicker, { color: currentStatus.color }]}
              dropdownIconColor={currentStatus.color}
            >
              {statusOptions.map(option => (
                <Picker.Item
                  key={option.value}
                  label={option.label}
                  value={option.value}
                />
              ))}
            </Picker>
          </View>
        </View>
      </View>

      {/* Additional Info */}
      <View style={styles.additionalInfo}>
        <Text style={styles.sessionId}>Sessão #{session.session_id}</Text>
        {session.days_since_session && (
          <Text style={styles.daysInfo}>
            {session.days_since_session} dias atrás
          </Text>
        )}
        {/* Debug info - show actual status in advanced mode only */}
        {!isSimpleMode() && session.payment_status !== displayStatus && (
          <Text style={styles.debugInfo}>
            Status: {getStatusDisplayLabel(session.payment_status)}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 16,
    marginVertical: 4,
    marginHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    flex: 1,
  },
  sessionDate: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  amountContainer: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 2,
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745',
  },
  statusPickerContainer: {
    minWidth: isSimpleMode() ? 110 : 130,
  },
  statusPicker: {
    flex: 1,
    height: 32,
    fontSize: 12,
    fontWeight: 'bold',
  },
  additionalInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f4',
    flexWrap: 'wrap',
  },
  sessionId: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  daysInfo: {
    fontSize: 12,
    color: '#6c757d',
  },
  debugInfo: {
    fontSize: 10,
    color: '#6c757d',
    fontStyle: 'italic',
    marginTop: 2,
  },
});