// src/components/payments/PatientPaymentCard.tsx

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { PatientPaymentCardProps, PaymentStatusDetails } from '../../types/payments';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { PaymentActionButton } from './PaymentActionButton';

export const PatientPaymentCard: React.FC<PatientPaymentCardProps> = ({
  patient,
  onSendPaymentRequest,
  onChasePayment,
  onStatusChange
}) => {
  const formatCurrency = (amount: number): string => {
    return `R$ ${amount.toFixed(2).replace('.', ',')}`;
  };

  const getPaymentStatusDetails = (): PaymentStatusDetails => {
    const PENDING_THRESHOLD_DAYS = 7;

    // If everything is paid
    if (patient.pending_amount === 0 && patient.paid_amount > 0) {
      return {
        status: 'pago',
        color: '#28a745',
        text: 'Pago',
        showButton: false,
        buttonText: '',
        buttonType: '',
        displayAmount: formatCurrency(patient.paid_amount),
        amountLabel: 'Pago'
      };
    }

    // If partially paid
    if (patient.paid_amount > 0 && patient.pending_amount > 0) {
      const daysSinceRequest = patient.payment_request_date
        ? Math.floor((new Date().getTime() - new Date(patient.payment_request_date).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      if (!patient.payment_requested) {
        return {
          status: 'parcialmente_pago',
          color: '#ffc107',
          text: 'Parcialmente Pago',
          showButton: true,
          buttonText: '💰 Cobrar Restante',
          buttonType: 'invoice',
          displayAmount: formatCurrency(patient.pending_amount),
          amountLabel: 'Restante'
        };
      } else if (daysSinceRequest >= PENDING_THRESHOLD_DAYS) {
        return {
          status: 'parcialmente_pago_pendente',
          color: '#dc3545',
          text: 'Parcialmente Pago - Pendente',
          showButton: true,
          buttonText: '📝 Lembrete Restante',
          buttonType: 'reminder',
          displayAmount: formatCurrency(patient.pending_amount),
          amountLabel: 'Pendente'
        };
      } else {
        return {
          status: 'parcialmente_pago_aguardando',
          color: '#17a2b8',
          text: 'Parcialmente Pago - Aguardando',
          showButton: false,
          buttonText: '',
          buttonType: '',
          displayAmount: formatCurrency(patient.pending_amount),
          amountLabel: 'Aguardando'
        };
      }
    }

    // If nothing paid yet
    if (!patient.payment_requested) {
      return {
        status: 'nao_cobrado',
        color: '#6c757d',
        text: 'Não Cobrado',
        showButton: true,
        buttonText: '💰 Cobrar',
        buttonType: 'invoice',
        displayAmount: formatCurrency(patient.pending_amount),
        amountLabel: 'A Cobrar'
      };
    }

    // Payment requested but nothing paid yet
    const daysSinceRequest = patient.payment_request_date
      ? Math.floor((new Date().getTime() - new Date(patient.payment_request_date).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    if (daysSinceRequest >= PENDING_THRESHOLD_DAYS) {
      return {
        status: 'pendente',
        color: '#dc3545',
        text: 'Pendente',
        showButton: true,
        buttonText: '📝 Enviar Lembrete',
        buttonType: 'reminder',
        displayAmount: formatCurrency(patient.pending_amount),
        amountLabel: 'Pendente'
      };
    } else {
      return {
        status: 'aguardando_pagamento',
        color: '#ffc107',
        text: 'Aguardando Pagamento',
        showButton: false,
        buttonText: '',
        buttonType: '',
        displayAmount: formatCurrency(patient.pending_amount),
        amountLabel: 'Aguardando'
      };
    }
  };

  const statusDetails = getPaymentStatusDetails();

  const handleActionButtonPress = async () => {
    if (statusDetails.buttonType === 'invoice') {
      await onSendPaymentRequest(patient);
    } else if (statusDetails.buttonType === 'reminder') {
      await onChasePayment(patient);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  function onViewPaymentDetails(patient_id: number): void {
    alert('Função não implementada.');
  }

  return (
    <View style={styles.container}>
      {/* Patient Header */}
      <View style={styles.header}>
        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>{patient.patient_name}</Text>
          <Text style={styles.sessionCount}>📅 {patient.total_sessions} sessões</Text>
          <Text style={styles.lastSession}>
            Última sessão: {formatDate(patient.last_session_date)}
          </Text>
        </View>
        <PaymentStatusBadge
          status={statusDetails.status}
          text={statusDetails.text}
          color={statusDetails.color}
        />
      </View>

      {/* Payment Summary */}
      <View style={styles.paymentSummary}>
        <View style={styles.paymentRow}>
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentTotal}>
              Total: {formatCurrency(patient.total_amount)}
            </Text>
            {patient.paid_amount > 0 && (
              <Text style={styles.paymentPaid}>
                Pago: {formatCurrency(patient.paid_amount)}
              </Text>
            )}
            {/* Add payment date information */}
            {patient.last_payment_date && (
              <Text style={styles.paymentDate}>
                💳 Último pagamento: {formatDate(patient.last_payment_date)}
              </Text>
            )}
            {patient.payment_methods && (
              <Text style={styles.paymentMethod}>
                📄 Método: {patient.payment_methods}
              </Text>
            )}
          </View>
          {patient.pending_amount > 0 && (
            <View style={styles.pendingAmountContainer}>
              <Text style={styles.pendingLabel}>{statusDetails.amountLabel}:</Text>
              <Text style={[styles.pendingAmount, { color: statusDetails.color }]}>
                {statusDetails.displayAmount}
              </Text>
            </View>
          )}
        </View>

        {/* Show request date if payment was requested */}
        {patient.payment_requested && patient.payment_request_date && (
          <Text style={styles.requestDate}>
            Cobrança enviada em: {formatDate(patient.payment_request_date)}
          </Text>
        )}
      </View>

      {/* Action Section */}
      <View style={styles.actionSection}>
        <Text style={styles.actionLabel}>Gerenciar pagamento:</Text>
        <View style={styles.actionRow}>
          {/* Status Dropdown */}
          <View style={styles.dropdownContainer}>
            <Picker
              style={styles.statusDropdown}
              selectedValue={statusDetails.status}
              onValueChange={(value) => onStatusChange(patient.patient_id, value)}
            >
              <Picker.Item label="✅ Pago" value="pago" />
              <Picker.Item label="📄 Não Cobrado" value="nao_cobrado" />
              <Picker.Item label="⏰ Aguardando Pagamento" value="aguardando_pagamento" />
              <Picker.Item label="🔔 Pendente" value="pendente" />
              <Picker.Item label="💰 Parcialmente Pago" value="parcialmente_pago" />
            </Picker>
          </View>

          {/* Action Button */}
          <PaymentActionButton
            showButton={statusDetails.showButton}
            buttonText={statusDetails.buttonText}
            buttonType={statusDetails.buttonType}
            onPress={handleActionButtonPress}
          />

          {/* Details Button - always show if there are payments */}
          {(patient.payment_count > 0 || patient.total_sessions > 0) && (
            <Pressable
              style={styles.detailsButton}
              onPress={() => onViewPaymentDetails(patient.patient_id)}
            >
              <Text style={styles.detailsButtonText}>📋 Ver Detalhes</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View >
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  patientInfo: {
    flex: 1,
    marginRight: 12,
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  sessionCount: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 2,
  },
  lastSession: {
    fontSize: 12,
    color: '#6c757d',
  },
  paymentSummary: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 2,
  },
  paymentPaid: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '500',
  },
  pendingAmountContainer: {
    alignItems: 'flex-end',
  },
  pendingLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 2,
  },
  pendingAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  requestDate: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 8,
    fontStyle: 'italic',
  },
  actionSection: {
    padding: 16,
  },
  actionLabel: {
    fontSize: 13,
    color: '#6c757d',
    marginBottom: 8,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dropdownContainer: {
    flex: 1,
    maxWidth: 180,
  },
  statusDropdown: {
    fontSize: 13,
    minHeight: 40,
  },
  paymentDate: {
    fontSize: 12,
    color: '#28a745',
    marginTop: 2,
  },
  paymentMethod: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  detailsButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  detailsButtonText: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '500',
  },
});