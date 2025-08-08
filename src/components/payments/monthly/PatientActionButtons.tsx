// src/components/payments/monthly/PatientActionButtons.tsx

import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { BillingSummary } from '../../../types/calendar-only';
import { CertificateStatus } from '../../../services/api/nfse-service';
import { shouldShowNFSeButton } from './utils/billingHelpers';

interface PatientActionButtonsProps {
  patient: BillingSummary;
  processingPatientId: number | null;
  paymentMatches: Map<number, any>;
  certificateStatus: CertificateStatus | null;
  generatingInvoices: Set<number>;
  generatedInvoices: Set<number>;
  onProcessCharges: (patient: BillingSummary) => void;
  onPaymentButtonPress: (patient: BillingSummary) => void;
  onCancelBilling: (patient: BillingSummary) => void;
  onGenerateInvoice: (patient: BillingSummary) => void;
  onViewDetails: (billingPeriodId: number | undefined, patient?: BillingSummary) => void;
}

export const PatientActionButtons: React.FC<PatientActionButtonsProps> = ({
  patient,
  processingPatientId,
  paymentMatches,
  certificateStatus,
  generatingInvoices,
  generatedInvoices,
  onProcessCharges,
  onPaymentButtonPress,
  onCancelBilling,
  onGenerateInvoice,
  onViewDetails
}) => {
  return (
    <View style={styles.actionButtons}>
      {/* Process Charges Button */}
      {patient.canProcess && (
        <Pressable
          style={[styles.actionButton, styles.processButton]}
          onPress={() => onProcessCharges(patient)}
          disabled={processingPatientId === patient.patientId}
        >
          <Text style={styles.processButtonText}>
            {processingPatientId === patient.patientId ? 'Processando...' : 'Processar Cobrança'}
          </Text>
        </Pressable>
      )}

      {/* Payment and Cancel Buttons for Processed Status */}
      {patient.status === 'processed' && (
        <>
          <Pressable
            style={[
              styles.actionButton,
              patient.hasOutstandingBalance ? styles.paymentButtonWarning : styles.paymentButton
            ]}
            onPress={() => onPaymentButtonPress(patient)}
          >
            <Text style={styles.paymentButtonText}>
              {patient.hasOutstandingBalance
                ? '⚠️ Reconciliar Primeiro'
                : paymentMatches.has(patient.patientId)
                  ? '✅ Confirmar Pagamento'
                  : 'Registrar Pagamento'
              }
            </Text>
          </Pressable>

          {/* Cancel Billing Request button for processed but unpaid billing periods */}
          {!patient.hasPayment && (
            <Pressable
              style={[styles.actionButton, styles.cancelBillingButton]}
              onPress={() => onCancelBilling(patient)}
            >
              <Text style={styles.cancelBillingButtonText}>🗑️ Cancelar Cobrança</Text>
            </Pressable>
          )}
        </>
      )}

      {/* NFS-e button for PAID patients */}
      {patient.status === 'paid' && shouldShowNFSeButton(patient, certificateStatus, generatedInvoices) && (
        <Pressable
          style={[
            styles.actionButton,
            styles.nfseButton,
            generatingInvoices.has(patient.patientId) && styles.nfseButtonDisabled
          ]}
          onPress={() => onGenerateInvoice(patient)}
          disabled={generatingInvoices.has(patient.patientId)}
        >
          <Text style={styles.nfseButtonText}>
            {generatingInvoices.has(patient.patientId) ? '🔄 Gerando...' : '🧾 Gerar NFS-e'}
          </Text>
        </Pressable>
      )}

      {/* Certificate Warning for paid patients without valid certificate */}
      {patient.status === 'paid' && !certificateStatus?.hasValidCertificate && (
        <Pressable
          style={[styles.actionButton, styles.certificateWarning]}
          onPress={() => {
            Alert.alert(
              'Certificado Necessário',
              'Configure seu certificado digital para emitir notas fiscais.',
              [
                { text: 'Cancelar' },
                { text: 'Configurar', onPress: () => window.location.href = '/nfse-configuracao' }
              ]
            );
          }}
        >
          <Text style={styles.certificateWarningText}>⚠️ Certificado</Text>
        </Pressable>
      )}

      {/* Always show "Ver Detalhes" button for all payment states */}
      <Pressable
        style={[styles.actionButton, styles.detailButton]}
        onPress={() => onViewDetails(patient.billingPeriodId, patient)}
      >
        <Text style={styles.detailButtonText}>Ver Detalhes</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  processButton: {
    backgroundColor: '#007bff',
  },
  processButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  paymentButton: {
    backgroundColor: '#28a745',
  },
  paymentButtonWarning: {
    backgroundColor: '#ffc107',
    borderColor: '#f0ad4e',
    borderWidth: 1,
  },
  paymentButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cancelBillingButton: {
    backgroundColor: '#dc3545',
    borderColor: '#dc3545',
  },
  cancelBillingButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  nfseButton: {
    backgroundColor: '#007bff',
    borderColor: '#0056b3',
    borderWidth: 1,
  },
  nfseButtonDisabled: {
    backgroundColor: '#6c757d',
    borderColor: '#6c757d',
  },
  nfseButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  certificateWarning: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
    borderWidth: 1,
  },
  certificateWarningText: {
    color: '#856404',
    fontSize: 11,
    fontWeight: '500',
  },
  detailButton: {
    backgroundColor: '#6c757d',
  },
  detailButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});