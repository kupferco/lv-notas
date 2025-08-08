// src/components/payments/modals/BillingDetailsModal.tsx

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { BillingPeriod } from '../../../types/calendar-only';
import { getStatusText } from '../monthly/utils/formatters';

interface BillingDetailsModalProps {
  visible: boolean;
  billingPeriodDetails: BillingPeriod | null;
  onClose: () => void;
  onCancelPayment: (paymentId: number) => void;
  formatCurrency: (amountInCents: number) => string;
}

export const BillingDetailsModal: React.FC<BillingDetailsModalProps> = ({
  visible,
  billingPeriodDetails,
  onClose,
  onCancelPayment,
  formatCurrency
}) => {
  if (!visible || !billingPeriodDetails) return null;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <ScrollView style={styles.detailsModal}>
          <Text style={styles.formTitle}>Detalhes do Período de Cobrança</Text>

          <Text style={styles.detailsText}>
            Período: {billingPeriodDetails.billingMonth}/{billingPeriodDetails.billingYear}
          </Text>
          <Text style={styles.detailsText}>
            Sessões: {billingPeriodDetails.sessionCount}
          </Text>
          <Text style={styles.detailsText}>
            Valor Total: {formatCurrency(billingPeriodDetails.totalAmount)}
          </Text>
          <Text style={styles.detailsText}>
            Status: {getStatusText(billingPeriodDetails.status)}
          </Text>
          <Text style={styles.detailsText}>
            Processado em: {new Date(billingPeriodDetails.processedAt).toLocaleString('pt-BR')}
          </Text>

          {/* Payment Information */}
          {(billingPeriodDetails as any).payments && 
           Array.isArray((billingPeriodDetails as any).payments) && 
           (billingPeriodDetails as any).payments.length > 0 && (
            <>
              <Text style={[styles.detailsText, { marginTop: 16, fontWeight: 'bold' }]}>
                💳 Pagamento Registrado:
              </Text>
              {(billingPeriodDetails as any).payments.map((payment: any, index: number) => (
                <View key={index}>
                  <Text style={styles.detailsText}>
                    Método: {payment.payment_method?.toUpperCase() || 'N/A'}
                  </Text>
                  <Text style={styles.detailsText}>
                    Data: {new Date(payment.payment_date).toLocaleDateString('pt-BR')}
                  </Text>
                  {payment.reference_number && (
                    <Text style={styles.detailsText}>
                      Referência: {payment.reference_number}
                    </Text>
                  )}
                  <Pressable
                    style={[styles.actionButton, styles.cancelPaymentButton]}
                    onPress={() => onCancelPayment(payment.id)}
                  >
                    <Text style={styles.cancelPaymentButtonText}>
                      Cancelar Pagamento
                    </Text>
                  </Pressable>
                </View>
              ))}
            </>
          )}

          {/* Show message for unprocessed billing periods */}
          {billingPeriodDetails.id === 0 && (
            <Text style={[styles.detailsText, { marginTop: 16, fontStyle: 'italic', color: '#6c757d' }]}>
              ℹ️ Esta é uma prévia dos dados. Para ver detalhes completos e registrar pagamentos,
              primeiro processe a cobrança clicando em "Processar Cobrança".
            </Text>
          )}

          <View style={styles.sessionSnapshots}>
            <Text style={styles.snapshotsTitle}>Snapshot das Sessões:</Text>
            {billingPeriodDetails.sessionSnapshots.map((snapshot, index) => (
              <Text key={index} style={styles.snapshotText}>
                📅 {snapshot.date} às {snapshot.time} - {snapshot.patientName}
                {snapshot.googleEventId && ` (${snapshot.googleEventId.substring(0, 8)}...)`}
              </Text>
            ))}
          </View>

          <Pressable
            style={[styles.actionButton, styles.closeDetailsButton]}
            onPress={onClose}
          >
            <Text style={styles.closeDetailsButtonText}>Fechar</Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    width: '90%',
    maxWidth: 500,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  detailsModal: {
    padding: 20,
    maxHeight: '100%',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 16,
  },
  detailsText: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 8,
  },
  sessionSnapshots: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
  },
  snapshotsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 8,
  },
  snapshotText: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelPaymentButton: {
    backgroundColor: '#dc3545',
  },
  cancelPaymentButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  closeDetailsButton: {
    backgroundColor: '#007bff',
    marginTop: 16,
  },
  closeDetailsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});