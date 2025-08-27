// src/components/payments/hooks/useBillingActions.ts

import { Alert } from 'react-native';
import { apiService } from '../../../services/api';
import { nfseService } from '../../../services/api/nfse-service';
import { whatsappService } from '../../../services/whatsapp';
import {
  BillingSummary,
  BillingPeriod,
  ProcessChargesRequest,
  RecordPaymentRequest,
} from '../../../types/calendar-only';
import { PatientPaymentSummary } from '../../../types/payments';

interface UseBillingActionsProps {
  therapistEmail: string;
  therapistId: string;
  selectedYear: number;
  selectedMonth: number;
  setProcessingPatientId: (id: number | null) => void;
  setGeneratingInvoices: React.Dispatch<React.SetStateAction<Set<number>>>;
  setGeneratedInvoices: React.Dispatch<React.SetStateAction<Set<number>>>;
  setBillingPeriodDetails: (details: BillingPeriod | null) => void;
  loadBillingSummary: () => Promise<void>;
  paymentMatches: Map<number, any>;
  setSelectedPatient: (patient: BillingSummary | null) => void;
  setShowPaymentForm: (show: boolean) => void;
  setPaymentFormData: (data: any) => void;
  checkInvoiceStatus?: (billingPeriodId: number) => Promise<void>;
}

export const useBillingActions = ({
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
  checkInvoiceStatus,
}: UseBillingActionsProps) => {

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

      await loadBillingSummary();

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

  // In your useBillingActions hook, update the generateInvoice function with better error handling:

  const generateInvoice = async (patient: BillingSummary) => {
    if (!therapistId || !patient.billingPeriodId) {
      console.error('Missing therapist ID or billing period ID');
      return;
    }

    try {
      setGeneratingInvoices(prev => new Set(prev).add(patient.patientId));
      console.log(`🧾 Generating invoice for ${patient.patientName}`);

      // Since the patient data might not be available via getPatients API,
      // let's try to generate the invoice directly with what we have
      // The backend should have the patient data already

      console.log(`Attempting to generate invoice with basic data for patient ${patient.patientId}`);

      try {
        // Call the NFS-e generation API with minimal data
        // The backend should look up the patient data itself
        const result = await nfseService.generateNFSeInvoice(
          parseInt(therapistId),
          patient.patientId,
          selectedYear,
          selectedMonth
          // Don't pass customerData - let backend handle it
        );

        console.log('Invoice generation result:', result);

        // Mark as generated
        setGeneratedInvoices(prev => new Set(prev).add(patient.patientId));

        // Check/refresh the invoice status immediately after generation
        if (patient.billingPeriodId && checkInvoiceStatus) {
          console.log('🔄 Refreshing invoice status for billing period:', patient.billingPeriodId);
          await checkInvoiceStatus(patient.billingPeriodId);
        }

        Alert.alert(
          'Sucesso',
          `NFS-e gerada com sucesso para ${patient.patientName}`,
          [{ text: 'OK' }]
        );

        // Refresh the billing summary to get updated status
        await loadBillingSummary();

      } catch (error: any) {
        console.error('Error generating invoice:', error);

        // Store error status in invoice statuses if we have a billing period ID
        if (patient.billingPeriodId && checkInvoiceStatus) {
          // This will fetch the error status from the backend
          await checkInvoiceStatus(patient.billingPeriodId);
        }

        // Show user-friendly error message
        const errorMessage = error.message || 'Erro desconhecido';
        const isDataError = errorMessage.includes('Dados incompletos');

        Alert.alert(
          isDataError ? '📋 Cadastro Incompleto' : '❌ Erro ao Gerar NFS-e',
          errorMessage,
          [
            { text: 'Fechar', style: 'cancel' },
            isDataError && {
              text: 'Editar Paciente',
              onPress: () => {
                // Navigate to patient edit screen
                // You might want to implement this navigation
                console.log('Navigate to edit patient:', patient.patientId);
              }
            }
          ].filter(Boolean)
        );
      } finally {
        setGeneratingInvoices(prev => {
          const newSet = new Set(prev);
          newSet.delete(patient.patientId);
          return newSet;
        });
      }
    } catch (error: any) {
    }
  };

  const viewBillingPeriodDetails = async (billingPeriodId: number | undefined, patientSummary?: BillingSummary) => {
    try {
      if (billingPeriodId && billingPeriodId > 0) {
        console.log(`🔍 Loading billing period details: ${billingPeriodId}`);

        const details = await apiService.getBillingPeriodDetails(billingPeriodId);
        setBillingPeriodDetails(details);

        console.log(`✅ Loaded billing period details:`, details);
      } else if (patientSummary) {
        console.log(`🔍 Creating preview for unprocessed patient: ${patientSummary.patientName}`);

        const tempDetails: BillingPeriod = {
          id: 0,
          therapistId: 1,
          patientId: patientSummary.patientId,
          billingYear: selectedYear,
          billingMonth: selectedMonth,
          sessionCount: patientSummary.sessionCount,
          totalAmount: patientSummary.totalAmount,
          status: 'processed' as const,
          processedAt: new Date(),
          processedBy: 'preview',
          canBeVoided: false,
          sessionSnapshots: patientSummary.sessionSnapshots || []
        };

        setBillingPeriodDetails(tempDetails);
        console.log(`✅ Created preview with ${tempDetails.sessionSnapshots.length} session snapshots`);
      } else {
        Alert.alert('Erro', 'Não foi possível carregar os detalhes - dados insuficientes');
        return;
      }
    } catch (error: any) {
      console.error('❌ Error loading details:', error);
      Alert.alert('Erro', `Falha ao carregar detalhes: ${error.message}`);
    }
  };

  const openPaymentForm = (patientSummary: BillingSummary) => {
    setSelectedPatient(patientSummary);

    const matchedPayment = paymentMatches.get(patientSummary.patientId);

    setPaymentFormData({
      amount: matchedPayment
        ? matchedPayment.transaction_amount.toFixed(2)
        : (patientSummary.totalAmount / 100).toFixed(2),
      paymentMethod: matchedPayment?.transaction_type === 'pix' ? 'pix' : 'pix',
      paymentDate: matchedPayment
        ? matchedPayment.transaction_date.split('T')[0]
        : new Date().toISOString().split('T')[0],
      referenceNumber: matchedPayment?.lv_reference || ''
    });

    setShowPaymentForm(true);
  };

  const recordPayment = async (selectedPatient: BillingSummary, paymentFormData: any) => {
    if (!selectedPatient?.billingPeriodId) {
      alert('Erro: Período de cobrança não encontrado');
      return;
    }

    try {
      console.log(`💳 Recording payment for billing period ${selectedPatient.billingPeriodId}`);

      const paymentRequest: RecordPaymentRequest = {
        amount: Math.round(parseFloat(paymentFormData.amount) * 100),
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

      setShowPaymentForm(false);
      setSelectedPatient(null);
      await loadBillingSummary();

    } catch (error: any) {
      console.error('❌ Error recording payment:', error);
      Alert.alert('Erro', `Falha ao registrar pagamento: ${error.message}`);
    }
  };

  const handlePaymentButtonPress = (patientSummary: BillingSummary) => {
    if (patientSummary.hasOutstandingBalance) {
      window.alert(
        `Saldo Pendente\n\n` +
        `Este paciente possui saldo pendente de R$ ${(patientSummary.outstandingBalance / 100).toFixed(2).replace('.', ',')} ` +
        `de ${patientSummary.oldestUnpaidMonth}/${patientSummary.oldestUnpaidYear}.\n\n` +
        `Para manter a ordem cronológica dos pagamentos, reconcilie primeiro o mês anterior antes de registrar ` +
        `pagamentos do mês atual.\n\n` +
        `Vá para a aba "${patientSummary.oldestUnpaidMonth}/${patientSummary.oldestUnpaidYear}" para reconciliar o pagamento pendente.`
      );
      return;
    }

    openPaymentForm(patientSummary);
  };

  const voidBillingPeriod = async (patientSummary: BillingSummary, onModalClose?: () => void) => {
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

      // Close the modal first
      if (onModalClose) {
        onModalClose();
      }

      // Then refresh the summary
      await loadBillingSummary();

    } catch (error: any) {
      console.error('❌ Error voiding billing period:', error);
      Alert.alert('Erro', `Falha ao cancelar período: ${error.message}`);
    }
  };

  const cancelPayment = async (paymentId: number, currentBillingPeriodDetails: BillingPeriod | null) => {
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

      // Refresh both the main billing summary and the details modal
      await loadBillingSummary();

      // If there are billing period details open, refresh them
      if (currentBillingPeriodDetails && currentBillingPeriodDetails.id > 0) {
        try {
          const refreshedDetails = await apiService.getBillingPeriodDetails(currentBillingPeriodDetails.id);
          setBillingPeriodDetails(refreshedDetails);
          console.log(`✅ Refreshed billing period details after payment cancellation`);
        } catch (error) {
          console.error('❌ Error refreshing billing period details:', error);
          // If refresh fails, just close the modal
          setBillingPeriodDetails(null);
        }
      }

    } catch (error: any) {
      console.error('❌ Error canceling payment:', error);
      Alert.alert('Erro', `Falha ao cancelar pagamento: ${error.message}`);
    }
  };

  const sendWhatsAppMessage = async (patientSummary: BillingSummary) => {
    try {
      console.log(`📱 Preparing WhatsApp message for ${patientSummary.patientName}`);

      const patients = await apiService.getPatients(therapistEmail);
      const fullPatientInfo = patients.find(p => parseInt(p.id) === patientSummary.patientId);

      if (!fullPatientInfo) {
        Alert.alert('Erro', 'Informações do paciente não encontradas');
        return;
      }

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

      const whatsappData = whatsappService.previewMessage(paymentSummary, 'invoice');

      const confirmed = window.confirm(
        `Abrir WhatsApp para enviar cobrança para ${patientSummary.patientName} (telefone:${paymentSummary.telefone})?\n\n` +
        `Sessões: ${patientSummary.sessionCount}\n` +
        `Valor: R$ ${(patientSummary.totalAmount / 100).toFixed(2).replace('.', ',')}\n\n` +
        'Prévia da mensagem:\n\n' +
        whatsappData.message.substring(0, 150) + '...'
      );

      if (confirmed) {
        whatsappService.openWhatsAppLink(whatsappData);
      }

    } catch (error: any) {
      console.error('❌ Error preparing WhatsApp message:', error);
      Alert.alert('Erro', `Falha ao preparar mensagem: ${error.message}`);
    }
  };

  return {
    processCharges,
    generateInvoice,
    viewBillingPeriodDetails,
    handlePaymentButtonPress,
    recordPayment,
    voidBillingPeriod,
    cancelPayment,
  };
};