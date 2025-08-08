// src/components/payments/monthly/PatientCard.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
  onProcessCharges: (patient: BillingSummary) => void;
  onPaymentButtonPress: (patient: BillingSummary) => void;
  onCancelBilling: (patient: BillingSummary) => void;
  onGenerateInvoice: (patient: BillingSummary) => void;
  onViewDetails: (billingPeriodId: number | undefined, patient?: BillingSummary) => void;
}

export const PatientCard: React.FC<PatientCardProps> = ({
  patient,
  processingPatientId,
  paymentMatches,
  generatedInvoices,
  certificateStatus,
  generatingInvoices,
  onProcessCharges,
  onPaymentButtonPress,
  onCancelBilling,
  onGenerateInvoice,
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
          {/* Invoice status indicator */}
          {generatedInvoices.has(patient.patientId) && (
            <View style={styles.invoiceIndicator}>
              <Text style={styles.invoiceIndicatorText}>🧾</Text>
            </View>
          )}
        </View>
      </View>

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

      {/* Action Buttons */}
      <PatientActionButtons
        patient={patient}
        processingPatientId={processingPatientId}
        paymentMatches={paymentMatches}
        certificateStatus={certificateStatus}
        generatingInvoices={generatingInvoices}
        generatedInvoices={generatedInvoices}
        onProcessCharges={onProcessCharges}
        onPaymentButtonPress={onPaymentButtonPress}
        onCancelBilling={onCancelBilling}
        onGenerateInvoice={onGenerateInvoice}
        onViewDetails={onViewDetails}
      />
    </View>
  );
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
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  invoiceIndicatorText: {
    fontSize: 12,
    color: '#1565c0',
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