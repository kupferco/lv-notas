// src/components/payments/PatientPaymentCard.tsx

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { PatientPaymentCardProps, PaymentStatusDetails } from '../../types/payments';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { PaymentActionButton } from './PaymentActionButton';
import { isSimpleMode, getStatusDisplayLabel } from '../../config/paymentsMode';

export const PatientPaymentCard: React.FC<PatientPaymentCardProps> = ({
  patient,
  onSendPaymentRequest,
  onChasePayment,
  onStatusChange,
  onViewDetails
}) => {
  const formatCurrency = (amount: number): string => {
    return `R$ ${amount.toFixed(2).replace('.', ',')}`;
  };

  const getPaymentStatusDetails = (): PaymentStatusDetails => {
    if (isSimpleMode()) {
      return getSimpleModeStatusDetails();
    } else {
      return getAdvancedModeStatusDetails();
    }
  };

  const getSimpleModeStatusDetails = (): PaymentStatusDetails => {
    // Simple mode logic: Only "Paid" or "Pending"

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
      return {
        status: 'parcialmente_pago_pendente',
        color: '#dc3545',
        text: 'Parcialmente Pago',
        showButton: true,
        buttonText: '💰 Cobrar Restante',
        buttonType: 'invoice',
        displayAmount: formatCurrency(patient.pending_amount),
        amountLabel: 'Pendente'
      };
    }

    // If nothing paid yet - all pending
    return {
      status: 'pendente',
      color: '#dc3545',
      text: 'Pendente',
      showButton: true,
      buttonText: '💰 Cobrar',
      buttonType: 'invoice',
      displayAmount: formatCurrency(patient.pending_amount),
      amountLabel: 'Pendente'
    };
  };

  const getAdvancedModeStatusDetails = (): PaymentStatusDetails => {
    // Advanced mode logic: Full granular status priority
    const hasPendingSessions = patient.pendente_sessions > 0;
    const hasAwaitingSessions = patient.aguardando_sessions > 0;

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
      // Priority 1: If any session is pendente
      if (hasPendingSessions) {
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
      }

      // Priority 2: If any session is aguardando
      if (hasAwaitingSessions) {
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

      // Priority 3: Only não cobrado sessions remain
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
    }

    // If nothing paid yet - apply same priority logic
    if (hasPendingSessions) {
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
    }

    if (hasAwaitingSessions) {
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

    // Default: não cobrado
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
  };

  const statusDetails = getPaymentStatusDetails();

  const handleActionButtonPress = async () => {
    // Check if the functions exist before calling them
    if (statusDetails.buttonType === 'invoice' && onSendPaymentRequest) {
      await onSendPaymentRequest(patient);
    } else if (statusDetails.buttonType === 'reminder' && onChasePayment) {
      await onChasePayment(patient);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  function handleViewPatientDetails(): void {
    if (onViewDetails) {
      onViewDetails(patient.patient_id);
    } else {
      alert('Função não implementada.');
    }
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

        {/* Show request date if payment was requested - only in advanced mode or if relevant */}
        {(!isSimpleMode() || statusDetails.status.includes('aguardando')) &&
          patient.payment_requested &&
          patient.payment_request_date && (
            <Text style={styles.requestDate}>
              Cobrança enviada em: {formatDate(patient.payment_request_date)}
            </Text>
          )}
      </View>

      {/* Action Section */}
      <View style={styles.actionSection}>
        {(() => {
          // Debug logging outside JSX
          console.log('🔍 DEBUG Action Section:', {
            patientName: patient.patient_name,
            hasOnSendPaymentRequest: !!onSendPaymentRequest,
            hasOnChasePayment: !!onChasePayment,
            showButton: statusDetails.showButton,
            buttonText: statusDetails.buttonText,
            buttonType: statusDetails.buttonType,
            statusDetailsStatus: statusDetails.status
          });

          const shouldShowActionButton = (onSendPaymentRequest || onChasePayment) && statusDetails.showButton;

          if (shouldShowActionButton) {
            console.log('✅ Should render PaymentActionButton');
          } else {
            console.log('❌ NOT rendering PaymentActionButton:', {
              hasHandlers: !!(onSendPaymentRequest || onChasePayment),
              showButton: statusDetails.showButton
            });
          }

          return null; // IIFE returns null, doesn't render anything
        })()}

        {/* Action Button - Only show if functions are available */}
        {(onSendPaymentRequest || onChasePayment) && statusDetails.showButton && (
          <PaymentActionButton
            showButton={statusDetails.showButton}
            buttonText={statusDetails.buttonText}
            buttonType={statusDetails.buttonType}
            onPress={handleActionButtonPress}
          />
        )}

        {/* Details Button - always show */}
        <Pressable
          style={styles.detailsButton}
          onPress={handleViewPatientDetails}
        >
          <Text style={styles.detailsButtonText}>📋 Ver Detalhes</Text>
        </Pressable>
      </View>

      {/* Debug info for mode switching - only show in advanced mode */}
      {!isSimpleMode() && (
        <View style={styles.debugSection}>
          <Text style={styles.debugText}>
            Modo: Avançado | Pendente: {patient.pendente_sessions} | Aguardando: {patient.aguardando_sessions}
          </Text>
        </View>
      )}

      {/* Simple mode indicator */}
      {isSimpleMode() && (
        <View style={styles.debugSection}>
          <Text style={styles.debugText}>
            Modo: Simples | Total não pago: {patient.pending_amount > 0 ? formatCurrency(patient.pending_amount) : 'R$ 0,00'}
          </Text>
        </View>
      )}
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
  actionSection: {
    padding: 16,
    alignItems: 'flex-end',    // Right align all buttons
  },

  detailsButton: {
    paddingVertical: 2,        // Very small padding
    paddingHorizontal: 6,      // Very small padding  
    borderRadius: 8,           // Small pill
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 28,              // Very narrow - just for emoji
  },

  detailsButtonText: {
    fontSize: 12,              // Just show emoji clearly
    color: '#495057',
    fontWeight: '600',
  },
  debugSection: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  debugText: {
    fontSize: 10,
    color: '#6c757d',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});