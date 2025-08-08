// src/components/payments/monthly/MonthlyBillingOverview.tsx

import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useSettings } from '../../../contexts/SettingsContext';
import { useMonthlyBilling } from '../hooks/useMonthlyBilling';
import { useBillingActions } from '../hooks/useBillingActions';

// Components
import { BillingHeader } from './BillingHeader';
import { PatientCard } from './PatientCard';
import { EmptyState } from './EmptyState';

// Modals
import { CancelConfirmationModal } from '../modals/CancelConfirmationModal';
import { PaymentFormModal } from '../modals/PaymentFormModal';
import { BillingDetailsModal } from '../modals/BillingDetailsModal';

// Utils
import { formatCurrency } from './utils/formatters';

interface MonthlyBillingOverviewProps {
  therapistEmail: string;
  selectedYear: number;
  selectedMonth: number;
}

export const MonthlyBillingOverview: React.FC<MonthlyBillingOverviewProps> = ({
  therapistEmail,
  selectedYear,
  selectedMonth
}) => {
  const { isAutoCheckInEnabled } = useSettings();

  // Get state and functions from hooks
  const {
    loading,
    billingSummary,
    selectedPatient,
    processingPatientId,
    billingPeriodDetails,
    showPaymentForm,
    isExporting,
    paymentFormData,
    certificateStatus,
    generatingInvoices,
    generatedInvoices,
    paymentMatches,
    therapistId,
    showCancelConfirmation,
    patientToCancel,
    setSelectedPatient,
    setShowPaymentForm,
    setPaymentFormData,
    setBillingPeriodDetails,
    setShowCancelConfirmation,
    setPatientToCancel,
    setProcessingPatientId,
    setGeneratingInvoices,
    setGeneratedInvoices,
    loadBillingSummary,
    exportCSV,
  } = useMonthlyBilling({
    therapistEmail,
    selectedYear,
    selectedMonth,
  });

  // Get business logic functions from actions hook
  const {
    processCharges,
    generateInvoice,
    viewBillingPeriodDetails,
    handlePaymentButtonPress,
    recordPayment,
    voidBillingPeriod,
    cancelPayment,
  } = useBillingActions({
    therapistEmail,
    therapistId,
    selectedYear,
    selectedMonth,
    setProcessingPatientId,
    setGeneratingInvoices,
    setGeneratedInvoices,
    setBillingPeriodDetails,
    loadBillingSummary,
    paymentMatches,
    setSelectedPatient,
    setShowPaymentForm,
    setPaymentFormData,
  });

  // Handle cancel billing with modal
  const handleCancelBilling = (patient: any) => {
    setPatientToCancel(patient);
    setShowCancelConfirmation(true);
  };

  const handleCancelConfirm = async (patient: any) => {
    const closeModal = () => {
      setShowCancelConfirmation(false);
      setPatientToCancel(null);
    };
    
    await voidBillingPeriod(patient, closeModal);
  };

  const handleCancelCancel = () => {
    setShowCancelConfirmation(false);
    setPatientToCancel(null);
  };

  const handleRecordPayment = async () => {
    if (selectedPatient) {
      await recordPayment(selectedPatient, paymentFormData);
    }
  };

  const handleCancelPayment = async (paymentId: number) => {
    await cancelPayment(paymentId, billingPeriodDetails);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Carregando cobrança mensal...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        {/* Header with Export Button */}
        <BillingHeader
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          billingSummary={billingSummary}
          isAutoCheckInEnabled={isAutoCheckInEnabled}
          certificateStatus={certificateStatus}
          loading={loading}
          isExporting={isExporting}
          onExport={exportCSV}
        />

        {/* Monthly Summary Cards */}
        <View style={styles.summaryContainer}>
          {billingSummary.length > 0 ? (
            billingSummary.map(patient => (
              <PatientCard
                key={patient.patientId}
                patient={patient}
                processingPatientId={processingPatientId}
                paymentMatches={paymentMatches}
                generatedInvoices={generatedInvoices}
                certificateStatus={certificateStatus}
                generatingInvoices={generatingInvoices}
                onProcessCharges={processCharges}
                onPaymentButtonPress={handlePaymentButtonPress}
                onCancelBilling={handleCancelBilling}
                onGenerateInvoice={generateInvoice}
                onViewDetails={viewBillingPeriodDetails}
              />
            ))
          ) : (
            <EmptyState
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
            />
          )}
        </View>
      </ScrollView>

      {/* Modals */}
      <CancelConfirmationModal
        visible={showCancelConfirmation}
        patient={patientToCancel}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onCancel={handleCancelCancel}
        onConfirm={handleCancelConfirm}
        formatCurrency={formatCurrency}
      />

      <PaymentFormModal
        visible={showPaymentForm}
        patient={selectedPatient}
        paymentFormData={paymentFormData}
        onPaymentFormDataChange={setPaymentFormData}
        onCancel={() => setShowPaymentForm(false)}
        onSubmit={handleRecordPayment}
      />

      <BillingDetailsModal
        visible={!!billingPeriodDetails}
        billingPeriodDetails={billingPeriodDetails}
        onClose={() => setBillingPeriodDetails(null)}
        onCancelPayment={handleCancelPayment}
        formatCurrency={formatCurrency}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6c757d',
  },
  summaryContainer: {
    padding: 15,
  },
});