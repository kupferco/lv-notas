// src/components/payments/MonthlyBillingOverview.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { apiService } from '../../services/api';
import { whatsappService } from '../../services/whatsapp';

// Import types
import {
  BillingSummary,
  BillingPeriod,
  MonthlyBillingOverviewResponse,
  ProcessChargesRequest,
  RecordPaymentRequest,
  CalendarOnlyPatient
} from '../../types/calendar-only';
import { PatientPaymentSummary, WhatsAppMessageData } from '../../types/payments';

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
  const [isExporting, setIsExporting] = useState(false);
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

      // 🎯 Filter out patients with zero sessions to clean up the interface
      const patientsWithSessions = response.summary.filter(patient => patient.sessionCount > 0);

      setBillingSummary(patientsWithSessions);
      console.log(`✅ Loaded ${response.summary.length} total patients, showing ${patientsWithSessions.length} with sessions`);

      // Log filtered patients for debugging
      const filteredOut = response.summary.filter(patient => patient.sessionCount === 0);
      if (filteredOut.length > 0) {
        console.log(`🚫 Filtered out ${filteredOut.length} patients with zero sessions:`,
          filteredOut.map(p => p.patientName));
      }

    } catch (error: any) {
      console.error('❌ Error loading monthly billing summary:', error);
      Alert.alert('Erro', `Falha ao carregar resumo mensal: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 📊 CSV Export functionality
  const exportCSV = async () => {
    try {
      setIsExporting(true);
      console.log(`📊 Exporting CSV for ${selectedMonth}/${selectedYear}`);

      const csvBlob = await apiService.exportMonthlyBillingCSV(
        therapistEmail,
        selectedYear,
        selectedMonth
      );

      // Create a download link
      const url = window.URL.createObjectURL(csvBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cobranca-mensal-${selectedYear}-${selectedMonth.toString().padStart(2, '0')}.csv`;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log(`✅ CSV export completed successfully`);

      Alert.alert(
        'Exportação Concluída!',
        `Dados de cobrança de ${selectedMonth}/${selectedYear} exportados com sucesso.\n\n` +
        `Arquivo: cobranca-mensal-${selectedYear}-${selectedMonth.toString().padStart(2, '0')}.csv\n\n` +
        `O arquivo inclui apenas pacientes com sessões no período selecionado.`
      );

    } catch (error: any) {
      console.error('❌ Error exporting CSV:', error);
      Alert.alert('Erro na Exportação', `Falha ao exportar CSV: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const processCharges = async (patientSummary: BillingSummary) => {
    try {
      setProcessingPatientId(patientSummary.patientId);
      console.log(`💰 Processing charges for patient ${patientSummary.patientName}`);

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
        `Status: ${response.billingPeriod.status}\n\n` +
        `Preparando mensagem WhatsApp...`
      );

      // Refresh the summary to show updated status
      await loadBillingSummary();

      // 📱 Automatically trigger WhatsApp message after successful processing
      await sendWhatsAppMessage({
        ...patientSummary,
        status: 'processed',
        totalAmount: response.billingPeriod.totalAmount,
        sessionCount: response.billingPeriod.sessionCount,
        canProcess: false
      });

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

  // WhatsApp functionality
  const sendWhatsAppMessage = async (patientSummary: BillingSummary) => {
    try {
      console.log(`📱 Preparing WhatsApp message for ${patientSummary.patientName}`);

      // Get patient info from the API to get phone number
      const patients = await apiService.getPatients(therapistEmail);
      console.log('📱 Got patients list, searching for patient...');

      const fullPatientInfo = patients.find(p =>
        parseInt(p.id) === patientSummary.patientId
      );

      if (!fullPatientInfo) {
        console.error('❌ Patient not found in patients list');
        Alert.alert('Erro', 'Informações do paciente não encontradas');
        return;
      }

      console.log('📱 Patient found:', fullPatientInfo.name, 'Phone:', fullPatientInfo.telefone);

      // Convert BillingSummary to PatientPaymentSummary format for WhatsApp service
      const paymentSummary: PatientPaymentSummary = {
        patient_name: patientSummary.patientName,
        telefone: fullPatientInfo.telefone || '',
        total_sessions: patientSummary.sessionCount,
        total_amount: patientSummary.totalAmount / 100,
        pending_amount: patientSummary.totalAmount / 100,
        last_session_date: new Date().toISOString(),
        patient_id: patientSummary.patientId,
        paid_amount: 0,
        billing_cycle: `${selectedMonth}/${selectedYear}`,
        payment_requested: false,
        payment_count: 0,
        pendente_sessions: 0,
        aguardando_sessions: 0,
        nao_cobrado_sessions: patientSummary.sessionCount,
        paid_sessions: 0
      };

      console.log('📱 Payment summary created:', paymentSummary);

      // Generate WhatsApp message and show confirmation
      console.log('📱 Calling whatsappService.previewMessage...');
      const whatsappData = whatsappService.previewMessage(paymentSummary, 'invoice');
      console.log('📱 WhatsApp data generated:', whatsappData);

      const confirmed = window.confirm(
        `Abrir WhatsApp para enviar cobrança para ${patientSummary.patientName} (telefone:${paymentSummary.telefone})?\n\n` +
        `Sessões: ${patientSummary.sessionCount}\n` +
        `Valor: R$ ${(patientSummary.totalAmount / 100).toFixed(2).replace('.', ',')}\n\n` +
        'Prévia da mensagem:\n\n' +
        whatsappData.message.substring(0, 150) + '...'
      );

      console.log('📱 User confirmation:', confirmed);

      if (confirmed) {
        console.log('📱 Opening WhatsApp link...');
        whatsappService.openWhatsAppLink(whatsappData);
        console.log(`📱 WhatsApp opened for ${patientSummary.patientName}`);
      } else {
        console.log('📱 User cancelled WhatsApp message');
      }

    } catch (error: any) {
      console.error('❌ Error preparing WhatsApp message:', error);
      console.error('❌ Error stack:', error.stack);
      Alert.alert('Erro', `Falha ao preparar mensagem: ${error.message}`);
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
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        {/* Header with Export Button */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>💰 Cobrança Mensal</Text>
            <Text style={styles.subtitle}>
              {selectedMonth}/{selectedYear} • {billingSummary.length} pacientes com sessões
              {isAutoCheckInEnabled() && ' • ⚡ Modo Calendário Ativo'}
            </Text>
          </View>

          <View style={styles.headerRight}>
            <Pressable
              style={[styles.exportButton, (loading || billingSummary.length === 0 || isExporting) && styles.exportButtonDisabled]}
              onPress={exportCSV}
              disabled={loading || billingSummary.length === 0 || isExporting}
            >
              <Text style={styles.exportButtonText}>
                {isExporting ? '📊 Exportando...' : '📊 Exportar CSV'}
              </Text>
            </Pressable>
          </View>
        </View>

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
                Nenhum paciente com sessões para {selectedMonth}/{selectedYear}
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Pacientes sem sessões são automaticamente ocultados.
                Verifique se há sessões agendadas no Google Calendar para este período.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Payment Form Modal */}
      {showPaymentForm && selectedPatient && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
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
        </View>
      )}

      {/* Billing Period Details Modal */}
      {billingPeriodDetails && (
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
            </ScrollView>
          </View>
        </View>
      )}
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
  // Updated header styles with export button
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    marginLeft: 16,
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
  // Export button styles
  exportButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    minWidth: 140,
    alignItems: 'center',
  },
  exportButtonDisabled: {
    backgroundColor: '#6c757d',
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
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
  // Fixed modal styles
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
  paymentForm: {
    padding: 20,
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
    width: '100%',
  },
  formSelect: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    paddingHorizontal: 10,
    fontSize: 14,
    width: '100%',
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