// src/components/payments/MonthlyBillingOverview.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { apiService } from '../../services/api';

// Import types
import {
  BillingSummary,
  BillingPeriod,
  MonthlyBillingOverviewResponse,
  ProcessChargesRequest,
  RecordPaymentRequest,
  CalendarOnlyPatient
} from '../../types/calendar-only';

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
  const { user } = useAuth();
  const { isAutoCheckInEnabled } = useSettings();

  // State management
  const [loading, setLoading] = useState(true);
  const [billingSummary, setBillingSummary] = useState<BillingSummary[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<BillingSummary | null>(null);
  const [processingPatientId, setProcessingPatientId] = useState<number | null>(null);
  const [billingPeriodDetails, setBillingPeriodDetails] = useState<BillingPeriod | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    paymentMethod: 'pix' as 'pix' | 'transferencia' | 'dinheiro' | 'cartao',
    paymentDate: new Date().toISOString().split('T')[0],
    referenceNumber: ''
  });

  // Load billing summary on component mount and when month/year changes
  useEffect(() => {
    if (therapistEmail) {
      loadBillingSummary();
    }
  }, [therapistEmail, selectedYear, selectedMonth]);

  const loadBillingSummary = async () => {
    try {
      setLoading(true);
      console.log(`📅 Loading monthly billing summary for ${selectedYear}-${selectedMonth}`);

      const response = await apiService.getMonthlyBillingSummary(
        therapistEmail,
        selectedYear,
        selectedMonth
      );

      setBillingSummary(response.summary);
      console.log(`✅ Loaded ${response.summary.length} patient billing summaries`);

    } catch (error: any) {
      console.error('❌ Error loading monthly billing summary:', error);
      Alert.alert('Erro', `Falha ao carregar resumo mensal: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const processCharges = async (patientSummary: BillingSummary) => {
    try {
      setProcessingPatientId(patientSummary.patientId);
      console.log(`💰 Processing charges for patient ${patientSummary.patientName}`);

      // Show confirmation dialog
      // const confirmed = window.confirm(
      //   `Processar cobrança mensal para ${patientSummary.patientName}?\n\n` +
      //   `Período: ${selectedMonth}/${selectedYear}\n` +
      //   `Sessões esperadas: Será calculado a partir do Google Calendar\n` +
      //   `Valor estimado: R$ ${(patientSummary.totalAmount / 100).toFixed(2).replace('.', ',')}\n\n` +
      //   `Esta ação criará um período de cobrança com snapshot das sessões do calendário.`
      // );

      // if (!confirmed) {
      //   setProcessingPatientId(null);
      //   return;
      // }

      const request: ProcessChargesRequest = {
        therapistEmail,
        patientId: patientSummary.patientId,
        year: selectedYear,
        month: selectedMonth
      };

      const response = await apiService.processMonthlyCharges(request);

      console.log(`✅ Monthly charges processed successfully:`, response.billingPeriod);

      Alert.alert(
        'Sucesso!',
        `Cobrança processada para ${patientSummary.patientName}\n\n` +
        `Sessões: ${response.billingPeriod.sessionCount}\n` +
        `Valor total: R$ ${(response.billingPeriod.totalAmount / 100).toFixed(2).replace('.', ',')}\n` +
        `Status: ${response.billingPeriod.status}`
      );

      // Refresh the summary to show updated status
      await loadBillingSummary();

    } catch (error: any) {
      console.error('❌ Error processing monthly charges:', error);
      Alert.alert('Erro', `Falha ao processar cobrança: ${error.message}`);
    } finally {
      setProcessingPatientId(null);
    }
  };

  const viewBillingPeriodDetails = async (billingPeriodId: number | undefined) => {
    if (!billingPeriodId) {
      Alert.alert('Erro', 'ID do período de cobrança não encontrado');
      return;
    }

    try {
      console.log(`🔍 Loading billing period details: ${billingPeriodId}`);

      const details = await apiService.getBillingPeriodDetails(billingPeriodId);
      setBillingPeriodDetails(details);

      console.log(`✅ Loaded billing period details:`, details);

    } catch (error: any) {
      console.error('❌ Error loading billing period details:', error);
      Alert.alert('Erro', `Falha ao carregar detalhes: ${error.message}`);
    }
  };

  const openPaymentForm = (patientSummary: BillingSummary) => {
    setSelectedPatient(patientSummary);
    setPaymentFormData({
      amount: (patientSummary.totalAmount / 100).toFixed(2),
      paymentMethod: 'pix',
      paymentDate: new Date().toISOString().split('T')[0],
      referenceNumber: ''
    });
    setShowPaymentForm(true);
  };

  const recordPayment = async () => {
    if (!selectedPatient?.billingPeriodId) {
      Alert.alert('Erro', 'Período de cobrança não encontrado');
      return;
    }

    try {
      console.log(`💳 Recording payment for billing period ${selectedPatient.billingPeriodId}`);

      const paymentRequest: RecordPaymentRequest = {
        amount: Math.round(parseFloat(paymentFormData.amount) * 100), // Convert to cents
        paymentMethod: paymentFormData.paymentMethod,
        paymentDate: paymentFormData.paymentDate,
        therapistEmail,
        referenceNumber: paymentFormData.referenceNumber || undefined
      };

      await apiService.recordBillingPeriodPayment(
        selectedPatient.billingPeriodId,
        paymentRequest
      );

      console.log(`✅ Payment recorded successfully`);

      Alert.alert(
        'Pagamento Registrado!',
        `Pagamento de R$ ${paymentFormData.amount} registrado para ${selectedPatient.patientName}\n\n` +
        `Método: ${paymentFormData.paymentMethod.toUpperCase()}\n` +
        `Data: ${paymentFormData.paymentDate}\n\n` +
        `O período de cobrança agora está protegido e não pode ser cancelado.`
      );

      // Close form and refresh data
      setShowPaymentForm(false);
      setSelectedPatient(null);
      await loadBillingSummary();

    } catch (error: any) {
      console.error('❌ Error recording payment:', error);
      Alert.alert('Erro', `Falha ao registrar pagamento: ${error.message}`);
    }
  };

  const voidBillingPeriod = async (patientSummary: BillingSummary) => {
    if (!patientSummary.billingPeriodId) {
      Alert.alert('Erro', 'Período de cobrança não encontrado');
      return;
    }

    try {
      // const confirmed = window.confirm(
      //   `Cancelar período de cobrança para ${patientSummary.patientName}?\n\n` +
      //   `Período: ${selectedMonth}/${selectedYear}\n` +
      //   `Valor: R$ ${(patientSummary.totalAmount / 100).toFixed(2).replace('.', ',')}\n\n` +
      //   `Esta ação não pode ser desfeita. O período poderá ser reprocessado posteriormente.`
      // );

      // if (!confirmed) return;

      console.log(`🗑️ Voiding billing period ${patientSummary.billingPeriodId}`);

      await apiService.voidBillingPeriod(
        patientSummary.billingPeriodId,
        therapistEmail,
        'Cancelado pelo terapeuta via interface'
      );

      console.log(`✅ Billing period voided successfully`);

      Alert.alert('Sucesso!', `Período de cobrança cancelado para ${patientSummary.patientName}`);

      // Refresh the summary
      await loadBillingSummary();

    } catch (error: any) {
      console.error('❌ Error voiding billing period:', error);
      Alert.alert('Erro', `Falha ao cancelar período: ${error.message}`);
    }
  };

  const cancelPayment = async (paymentId: number) => {
    try {
      const confirmed = window.confirm(
        'Cancelar este pagamento?\n\n' +
        'Esta ação irá remover o registro de pagamento.\n\n' +
        'Esta ação não pode ser desfeita.'
      );

      if (!confirmed) return;

      console.log(`🗑️ Canceling payment ${paymentId}`);

      await apiService.deleteBillingPeriodPayment(paymentId);

      console.log(`✅ Payment canceled successfully`);

      Alert.alert('Sucesso!', 'Pagamento cancelado com sucesso');

      // Refresh the data
      if (billingPeriodDetails) {
        await viewBillingPeriodDetails(billingPeriodDetails.id);
      }
      await loadBillingSummary();

    } catch (error: any) {
      console.error('❌ Error canceling payment:', error);
      Alert.alert('Erro', `Falha ao cancelar pagamento: ${error.message}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'can_process': return '#007bff';
      case 'processed': return '#ffc107';
      case 'paid': return '#28a745';
      case 'void': return '#6c757d';
      default: return '#495057';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'can_process': return 'Pode Processar';
      case 'processed': return 'Processado';
      case 'paid': return 'Pago';
      case 'void': return 'Cancelado';
      default: return status;
    }
  };

  const formatCurrency = (amountInCents: number): string => {
    return `R$ ${(amountInCents / 100).toFixed(2).replace('.', ',')}`;
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
    <ScrollView style={styles.container}>
      {/* Header
      <View style={styles.header}>
        <Text style={styles.title}>💰 Cobrança Mensal</Text>
        <Text style={styles.subtitle}>
          {selectedMonth}/{selectedYear} • {billingSummary.length} pacientes
          {isAutoCheckInEnabled() && ' • ⚡ Modo Calendário Ativo'}
        </Text>
      </View> */}

      {/* Monthly Summary Cards */}
      <View style={styles.summaryContainer}>
        {billingSummary.map(patient => (
          <View key={patient.patientId} style={styles.patientCard}>
            <View style={styles.patientHeader}>
              <Text style={styles.patientName}>{patient.patientName}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(patient.status) }]}>
                <Text style={styles.statusText}>{getStatusText(patient.status)}</Text>
              </View>
            </View>

            <View style={styles.patientDetails}>
              <Text style={styles.detailText}>
                Sessões: {patient.sessionCount} • Valor: {formatCurrency(patient.totalAmount)}
              </Text>
              {patient.hasPayment && (
                <Text style={styles.paidIndicator}>💳 Pagamento registrado</Text>
              )}
            </View>

            <View style={styles.actionButtons}>
              {patient.canProcess && (
                <Pressable
                  style={[styles.actionButton, styles.processButton]}
                  onPress={() => processCharges(patient)}
                  disabled={processingPatientId === patient.patientId}
                >
                  <Text style={styles.processButtonText}>
                    {processingPatientId === patient.patientId ? 'Processando...' : 'Processar Cobrança'}
                  </Text>
                </Pressable>
              )}

              {patient.status === 'processed' && (
                <>
                  <Pressable
                    style={[styles.actionButton, styles.paymentButton]}
                    onPress={() => openPaymentForm(patient)}
                  >
                    <Text style={styles.paymentButtonText}>Registrar Pagamento</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.actionButton, styles.voidButton]}
                    onPress={() => voidBillingPeriod(patient)}
                  >
                    <Text style={styles.voidButtonText}>Cancelar</Text>
                  </Pressable>
                </>
              )}

              {patient.billingPeriodId && (
                <Pressable
                  style={[styles.actionButton, styles.detailButton]}
                  onPress={() => viewBillingPeriodDetails(patient.billingPeriodId)}
                >
                  <Text style={styles.detailButtonText}>Ver Detalhes</Text>
                </Pressable>
              )}
            </View>
          </View>
        ))}

        {billingSummary.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Nenhum paciente encontrado para {selectedMonth}/{selectedYear}
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Verifique se há sessões agendadas no Google Calendar para este período
            </Text>
          </View>
        )}
      </View>

      {/* Payment Form Modal */}
      {showPaymentForm && selectedPatient && (
        <View style={styles.modalOverlay}>
          <View style={styles.paymentForm}>
            <Text style={styles.formTitle}>
              Registrar Pagamento - {selectedPatient.patientName}
            </Text>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Valor (R$)</Text>
              <input
                type="number"
                step="0.01"
                value={paymentFormData.amount}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                style={styles.formInput as any}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Método de Pagamento</Text>
              <select
                value={paymentFormData.paymentMethod}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentMethod: e.target.value as any })}
                style={styles.formSelect as any}
              >
                <option value="pix">PIX</option>
                <option value="transferencia">Transferência</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="cartao">Cartão</option>
              </select>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Data do Pagamento</Text>
              <input
                type="date"
                value={paymentFormData.paymentDate}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })}
                style={styles.formInput as any}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Referência (opcional)</Text>
              <input
                type="text"
                placeholder="ID da transação, número do comprovante..."
                value={paymentFormData.referenceNumber}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, referenceNumber: e.target.value })}
                style={styles.formInput as any}
              />
            </View>

            <View style={styles.formActions}>
              <Pressable
                style={[styles.actionButton, styles.cancelFormButton]}
                onPress={() => setShowPaymentForm(false)}
              >
                <Text style={styles.cancelFormButtonText}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={[styles.actionButton, styles.saveFormButton]}
                onPress={recordPayment}
              >
                <Text style={styles.saveFormButtonText}>Registrar Pagamento</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Billing Period Details Modal */}
      {billingPeriodDetails && (
        <View style={styles.modalOverlay}>
          <View style={styles.detailsModal}>
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
            {billingPeriodDetails.payments && Array.isArray(billingPeriodDetails.payments) && billingPeriodDetails.payments.length > 0 && (
              <>
                <Text style={[styles.detailsText, { marginTop: 16, fontWeight: 'bold' }]}>
                  💳 Pagamento Registrado:
                </Text>
                {billingPeriodDetails.payments.map((payment: any, index: number) => (
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
                      style={[styles.actionButton, { backgroundColor: '#dc3545', marginTop: 8 }]}
                      onPress={() => cancelPayment(payment.id)}
                    >
                      <Text style={[styles.buttonText, { color: '#fff', fontSize: 12 }]}>
                        Cancelar Pagamento
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </>
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
              onPress={() => setBillingPeriodDetails(null)}
            >
              <Text style={styles.closeDetailsButtonText}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  summaryContainer: {
    padding: 15,
  },
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
  paymentButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  voidButton: {
    backgroundColor: '#dc3545',
  },
  voidButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  detailButton: {
    backgroundColor: '#6c757d',
  },
  detailButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  paymentForm: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    width: '90%',
    maxWidth: 400,
  },
  detailsModal: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 16,
  },
  formField: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 4,
  },
  formInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    paddingHorizontal: 10,
    fontSize: 14,
  },
  formSelect: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    paddingHorizontal: 10,
    fontSize: 14,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelFormButton: {
    backgroundColor: '#6c757d',
    flex: 1,
    marginRight: 8,
  },
  cancelFormButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  saveFormButton: {
    backgroundColor: '#28a745',
    flex: 1,
    marginLeft: 8,
  },
  saveFormButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
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
  closeDetailsButton: {
    backgroundColor: '#007bff',
    marginTop: 16,
  },
  closeDetailsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});