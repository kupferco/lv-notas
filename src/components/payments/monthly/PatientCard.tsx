// src/components/payments/monthly/PatientCard.tsx

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { BillingSummary } from '../../../types/calendar-only';
import { CertificateStatus } from '../../../services/api/nfse-service';
import { PaymentMatchInfo } from '../PaymentMatchInfo';
import { PatientActionButtons } from './PatientActionButtons';
import { formatCurrency, getStatusColor, getStatusText } from './utils/formatters';

interface PatientCardProps {
  patient: BillingSummary;
  processingPatientId: number | null;
  paymentMatches: Map<number, any>;
  generatedInvoices: Set<number>;
  certificateStatus: CertificateStatus | null;
  generatingInvoices: Set<number>;
  invoiceStatuses: Map<number, any>;
  cancellingInvoices: Set<number>;
  loadingInvoiceStatus: Set<number>;
  onProcessCharges: (patient: BillingSummary) => void;
  onPaymentButtonPress: (patient: BillingSummary) => void;
  onCancelBilling: (patient: BillingSummary) => void;
  onGenerateInvoice: (patient: BillingSummary) => void;
  onCancelInvoice: (patient: BillingSummary) => void;
  onViewDetails: (billingPeriodId: number | undefined, patient?: BillingSummary) => void;
}

export const PatientCard: React.FC<PatientCardProps> = ({
  patient,
  processingPatientId,
  paymentMatches,
  generatedInvoices,
  certificateStatus,
  generatingInvoices,
  invoiceStatuses,        // ADD THIS
  cancellingInvoices,     // ADD THIS
  loadingInvoiceStatus,   // ADD THIS
  onProcessCharges,
  onPaymentButtonPress,
  onCancelBilling,
  onGenerateInvoice,
  onCancelInvoice,        // ADD THIS
  onViewDetails
}) => {
  return (
    <View style={styles.patientCard}>
      {/* Patient Header */}
      <View style={styles.patientHeader}>
        <Text style={styles.patientName}>{patient.patientName}</Text>
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(patient.status || 'can_process') }]}>
            <Text style={styles.statusText}>{getStatusText(patient.status || 'can_process')}</Text>
          </View>

          {/* Invoice status indicator - ONLY for final states (success/error), not processing */}
          {patient.billingPeriodId && invoiceStatuses.has(patient.billingPeriodId) && (() => {
            const invoice = invoiceStatuses.get(patient.billingPeriodId!);
            const status = invoice?.invoice_status;

            // Only show indicator for final states, not processing
            const shouldShowIndicator = status && ['issued', 'error', 'cancelled'].includes(status);

            if (!shouldShowIndicator) return null;

            return (
              <Pressable
                style={[
                  styles.invoiceIndicator,
                  getInvoiceIndicatorStyle(status)
                ]}
                onPress={() => {
                  if (status === 'issued') {
                    // If issued and has PDF, open it
                    if (invoice?.pdf_url) {
                      window.open(invoice.pdf_url, '_blank');
                    } else {
                      alert(
                        `✅ NFS-e Emitida\n\nNota fiscal emitida com sucesso.\n\nReferência: ${invoice?.internal_ref || 'N/A'}\nNúmero: ${invoice?.invoice_number || 'Pendente'}\nData: ${invoice?.issue_date || 'N/A'}\n\nPDF será disponibilizado em breve.`
                      );
                    }
                  } else if (status === 'error') {
                    // Show error details
                    const errorMsg = invoice?.error_message || 'Erro desconhecido ao gerar nota fiscal';
                    alert(
                      `❌ Erro na NFS-e\n\nReferência: ${invoice?.internal_ref || 'N/A'}\n\nDetalhes do erro:\n${errorMsg}\n\nClique em "Gerar NFS-e" para tentar novamente.`
                    );
                  } else if (status === 'cancelled') {
                    // Show cancellation info
                    alert(
                      `⚪ NFS-e Cancelada\n\nReferência: ${invoice?.internal_ref || 'N/A'}\n\nMotivo: ${invoice?.cancellation_reason || 'Cancelamento solicitado'}\n\nClique em "Gerar Nova NFS-e" para emitir uma nova nota fiscal.`
                    );
                  }
                }}
              >
                <Text style={styles.invoiceIndicatorText}>
                  {getInvoiceIndicatorText(status)}
                </Text>
              </Pressable>
            );
          })()}
        </View>
      </View>

      {/* DEBUG: Show invoice status */}
      {patient.billingPeriodId && (
        <Text style={{ fontSize: 10, color: '#666', marginVertical: 4 }}>
          Debug: Billing Period ID: {patient.billingPeriodId} |
          Has Invoice: {invoiceStatuses.has(patient.billingPeriodId) ? 'Yes' : 'No'} |
          Invoice Status: {invoiceStatuses.get(patient.billingPeriodId)?.invoice_status || 'N/A'}
        </Text>
      )}

      {/* Patient Details */}
      <View style={styles.patientDetails}>
        <Text style={styles.detailText}>
          Sessões: {patient.sessionCount} • Valor: {formatCurrency(patient.totalAmount)}
        </Text>
        {patient.hasPayment && (
          <Text style={styles.paidIndicator}>💳 Pagamento registrado</Text>
        )}
      </View>

      {/* Outstanding balance display */}
      {patient.hasOutstandingBalance && (
        <Text style={styles.outstandingText}>
          💰 Saldo pendente: {formatCurrency(patient.outstandingBalance)} de {patient.oldestUnpaidMonth}/{patient.oldestUnpaidYear}
        </Text>
      )}

      {/* Payment match info component */}
      {paymentMatches.has(patient.patientId) && (
        <PaymentMatchInfo match={paymentMatches.get(patient.patientId)} />
      )}

      {/* Action Buttons - PASS ALL PROPS */}
      <PatientActionButtons
        patient={patient}
        processingPatientId={processingPatientId}
        paymentMatches={paymentMatches}
        certificateStatus={certificateStatus}
        generatingInvoices={generatingInvoices}
        generatedInvoices={generatedInvoices}
        invoiceStatuses={invoiceStatuses}           // PASS THIS
        cancellingInvoices={cancellingInvoices}     // PASS THIS
        loadingInvoiceStatus={loadingInvoiceStatus} // PASS THIS
        onProcessCharges={onProcessCharges}
        onPaymentButtonPress={onPaymentButtonPress}
        onCancelBilling={onCancelBilling}
        onGenerateInvoice={onGenerateInvoice}
        onCancelInvoice={onCancelInvoice}           // PASS THIS
        onViewDetails={onViewDetails}
      />
    </View>
  );
};

// Helper functions for invoice indicator
const getInvoiceIndicatorStyle = (status: string) => {
  switch (status) {
    case 'issued':
      return { backgroundColor: '#d4edda', borderColor: '#28a745' };
    case 'cancelled':
      return { backgroundColor: '#f8d7da', borderColor: '#dc3545' };
    case 'error':
      return { backgroundColor: '#fff3cd', borderColor: '#ffc107' };
    default:
      return {};
  }
};

const getInvoiceIndicatorText = (status: string) => {
  switch (status) {
    case 'issued':
      return '📄 Ver PDF';
    case 'cancelled':
      return '⚪ Cancelada';
    case 'error':
      return '⚠️ Ver Erro';
    default:
      return 'NFS-e';
  }
};

const styles = StyleSheet.create({
  patientCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  patientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  invoiceIndicator: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    cursor: 'pointer',  // Shows it's clickable on web
  },
  invoiceIndicatorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#212529',
    // textDecorationLine: 'underline',  // Visual cue that it's clickable
  },
  patientDetails: {
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 2,
  },
  paidIndicator: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: 'bold',
  },
  outstandingText: {
    fontSize: 12,
    color: '#dc3545',
    fontWeight: 'bold',
    marginBottom: 2,
  },
});