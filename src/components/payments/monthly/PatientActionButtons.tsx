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
  invoiceStatuses: Map<number, any>; // Add this
  cancellingInvoices: Set<number>; // Add this
  loadingInvoiceStatus: Set<number>; // Add this
  onProcessCharges: (patient: BillingSummary) => void;
  onPaymentButtonPress: (patient: BillingSummary) => void;
  onCancelBilling: (patient: BillingSummary) => void;
  onGenerateInvoice: (patient: BillingSummary) => void;
  onCancelInvoice: (patient: BillingSummary) => void; // Add this
  onViewDetails: (billingPeriodId: number | undefined, patient?: BillingSummary) => void;
}

export const PatientActionButtons: React.FC<PatientActionButtonsProps> = ({
  patient,
  processingPatientId,
  paymentMatches,
  certificateStatus,
  generatingInvoices,
  generatedInvoices,
  invoiceStatuses,
  cancellingInvoices,
  loadingInvoiceStatus,
  onProcessCharges,
  onPaymentButtonPress,
  onCancelBilling,
  onGenerateInvoice,
  onCancelInvoice,
  onViewDetails
}) => {
  // Get invoice for this billing period if it exists
  const invoice = patient.billingPeriodId ? invoiceStatuses.get(patient.billingPeriodId) : null;
  const isLoadingInvoice = patient.billingPeriodId ? loadingInvoiceStatus.has(patient.billingPeriodId) : false;
  const isCancellingInvoice = cancellingInvoices.has(patient.patientId);
  
  // Determine invoice status
  const invoiceStatus = invoice?.invoice_status;
  const hasIssuedInvoice = invoiceStatus === 'issued';
  const hasProcessingInvoice = invoiceStatus === 'processing';
  const hasCancelledInvoice = invoiceStatus === 'cancelled';
  const hasErrorInvoice = invoiceStatus === 'error';
  
  // Helper to get invoice button style and text
  const getInvoiceButtonConfig = () => {
    if (hasIssuedInvoice) {
      return {
        style: styles.cancelInvoiceButton,
        text: isCancellingInvoice ? '🔄 Cancelando...' : '❌ Cancelar NFS-e',
        onPress: () => {
          Alert.alert(
            'Cancelar Nota Fiscal',
            `Tem certeza que deseja cancelar a NFS-e de ${patient.patientName}?`,
            [
              { text: 'Não', style: 'cancel' },
              { 
                text: 'Sim, Cancelar', 
                style: 'destructive',
                onPress: () => onCancelInvoice(patient)
              }
            ]
          );
        },
        disabled: isCancellingInvoice
      };
    }
    
    if (hasProcessingInvoice) {
      return {
        style: styles.processingInvoiceButton,
        text: '⏳ Processando NFS-e...',
        onPress: () => {},
        disabled: true
      };
    }
    
    if (hasCancelledInvoice) {
      return {
        style: styles.regenerateInvoiceButton,
        text: '🔄 Gerar Nova NFS-e',
        onPress: () => onGenerateInvoice(patient),
        disabled: generatingInvoices.has(patient.patientId)
      };
    }
    
    if (hasErrorInvoice) {
      return {
        style: styles.errorInvoiceButton,
        text: '⚠️ Erro - Tentar Novamente',
        onPress: () => {
          console.log('Retry button clicked for patient:', patient.patientName);
          console.log('Current invoice status:', invoiceStatus);
          
          // Directly call generate without the alert to see if it's working
          onGenerateInvoice(patient);
        },
        disabled: generatingInvoices.has(patient.patientId)
      };
    }
    
    // Default: generate invoice button
    return {
      style: styles.nfseButton,
      text: generatingInvoices.has(patient.patientId) ? '🔄 Gerando...' : '🧾 Gerar NFS-e',
      onPress: () => onGenerateInvoice(patient),
      disabled: generatingInvoices.has(patient.patientId)
    };
  };

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
      {patient.status === 'paid' && certificateStatus?.hasValidCertificate && (
        <>
          {isLoadingInvoice ? (
            <View style={[styles.actionButton, styles.loadingButton]}>
              <Text style={styles.loadingButtonText}>📋 Verificando...</Text>
            </View>
          ) : (
            <Pressable
              style={[styles.actionButton, getInvoiceButtonConfig().style]}
              onPress={getInvoiceButtonConfig().onPress}
              disabled={getInvoiceButtonConfig().disabled}
            >
              <Text style={styles.nfseButtonText}>
                {getInvoiceButtonConfig().text}
              </Text>
            </Pressable>
          )}
        </>
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

// Helper functions
const getInvoiceButtonConfig = () => {
  // ... existing function code
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
  cancelInvoiceButton: {
    backgroundColor: '#dc3545',
    borderColor: '#bd2130',
    borderWidth: 1,
  },
  processingInvoiceButton: {
    backgroundColor: '#6c757d',
    opacity: 0.7,
  },
  regenerateInvoiceButton: {
    backgroundColor: '#17a2b8',
    borderColor: '#138496',
    borderWidth: 1,
  },
  errorInvoiceButton: {
    backgroundColor: '#ffc107',
    borderColor: '#e0a800',
    borderWidth: 1,
  },
  loadingButton: {
    backgroundColor: '#e9ecef',
    borderColor: '#dee2e6',
    borderWidth: 1,
  },
  loadingButtonText: {
    color: '#6c757d',
    fontSize: 12,
    fontWeight: '500',
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