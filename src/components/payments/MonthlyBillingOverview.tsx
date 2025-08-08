// src/components/payments/MonthlyBillingOverview.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { apiService, bankingService, therapistService } from '../../services/api';
import { whatsappService } from '../../services/whatsapp';
import { nfseService, CertificateStatus } from '../../services/api/nfse-service';
import { PaymentMatchInfo } from './PaymentMatchInfo';

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
  const { user, isAuthenticated } = useAuth();
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

  // NEW: NFS-e state management
  const [certificateStatus, setCertificateStatus] = useState<CertificateStatus | null>(null);
  const [generatingInvoices, setGeneratingInvoices] = useState<Set<number>>(new Set());
  const [generatedInvoices, setGeneratedInvoices] = useState<Set<number>>(new Set());

  // NEW: Payment matching state
  const [paymentMatches, setPaymentMatches] = useState<Map<number, any>>(new Map());
  const [loadingMatches, setLoadingMatches] = useState(false);

  const [therapistId, setTherapistId] = useState<string>("1");
  const [therapistData, setTherapistData] = useState<any>(null);

  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [patientToCancel, setPatientToCancel] = useState<BillingSummary | null>(null);

  // Fetch therapist ID from email
  useEffect(() => {
    const fetchTherapistData = async () => {
      if (user?.email || therapistEmail) {
        try {
          const email = user?.email || therapistEmail;
          console.log(`🔍 Fetching therapist data for email: ${email}`);

          const therapist = await therapistService.getTherapistByEmail(email);

          if (therapist) {
            console.log(`✅ Found therapist data:`, therapist);
            setTherapistData(therapist);
            setTherapistId(therapist.id.toString());
          } else {
            console.warn('⚠️ No therapist found, using default ID');
          }
        } catch (error) {
          console.error('❌ Error fetching therapist data:', error);
          // Keep default value of "1"
        }
      }
    };

    fetchTherapistData();
  }, [user?.email, therapistEmail]);

  /// Update your existing useEffect to wait for proper authentication
  useEffect(() => {
    if (therapistEmail && user && isAuthenticated) {
      loadBillingSummary();
      loadCertificateStatus();
    }
  }, [therapistEmail, selectedYear, selectedMonth, user, isAuthenticated]);

  // NEW: Separate useEffect for payment matches that waits for billing data AND auth
  useEffect(() => {
    if (therapistId && therapistId !== "1" && billingSummary.length > 0 && isAuthenticated) {
      console.log('🔍 Auth and billing data ready, now loading payment matches...');
      loadPaymentMatches();
    }
  }, [therapistId, billingSummary.length, isAuthenticated]);

  // NEW: Load certificate status for NFS-e
  const loadCertificateStatus = async () => {
    try {
      const status = await nfseService.getCertificateStatus(therapistId);
      setCertificateStatus(status);
      console.log('📋 Certificate status loaded:', status);
    } catch (error) {
      console.error('❌ Error loading certificate status:', error);
      // Don't show error to user, just disable invoice functionality
    }
  };

  // NEW: Load payment matches for patients with unpaid periods
  const loadPaymentMatches = async () => {
    // Add authentication check
    if (!isAuthenticated || !user) {
      console.log('⚠️ Authentication not ready, skipping payment matches');
      return;
    }

    try {
      setLoadingMatches(true);
      console.log(`🔍 Loading payment matches for ${selectedYear}-${selectedMonth} with proper auth`);

      // Calculate date range for matching (look back a few months)
      const startDate = new Date(selectedYear, selectedMonth - 4, 1).toISOString().split('T')[0];
      const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];

      console.log(`📅 Payment matching date range: ${startDate} to ${endDate}`);
      console.log(`👤 Using therapist ID: ${therapistId}`);

      // Use the proper banking service
      const data = await bankingService.findPotentialMatches(therapistId, startDate, endDate, 100);

      console.log(`🎯 Payment matching API success:`, data);

      // Create a map of patientId -> match for quick lookup
      const matchMap = new Map();
      data.matches?.forEach((match: any) => {
        if (match.patient_id) {
          matchMap.set(match.patient_id, match);
          console.log(`✅ Added match for patient ${match.patient_id}: ${match.lv_reference}`);
        }
      });

      setPaymentMatches(matchMap);
      console.log(`🎯 Final payment matches loaded: ${matchMap.size} matches`);

    } catch (error) {
      console.error('❌ Error loading payment matches:', error);
    } finally {
      setLoadingMatches(false);
    }
  };

  const loadBillingSummary = async () => {
    try {
      setLoading(true);
      console.log(`📅 Loading monthly billing summary for ${selectedYear}-${selectedMonth}`);

      const response = await apiService.getMonthlyBillingSummary(
        therapistEmail,
        selectedYear,
        selectedMonth
      );

      console.log(response.summary)

      // 🎯 ENHANCED FILTERING: Include patients with sessions > 0 OR outstandingBalance > 0
      const patientsWithRelevantData = response.summary.filter((patient: BillingSummary) =>
        patient.sessionCount > 0 || patient.hasOutstandingBalance
      );

      setBillingSummary(patientsWithRelevantData);
      console.log(`✅ Enhanced filtering: ${response.summary.length} total patients -> ${patientsWithRelevantData.length} with sessions or outstanding balances`);

      // Log filtered patients for debugging
      const filteredOut = response.summary.filter((patient: BillingSummary) => patient.sessionCount === 0);
      if (filteredOut.length > 0) {
        console.log(`🚫 Filtered out ${filteredOut.length} patients with zero sessions:`,
          filteredOut.map((p: BillingSummary) => p.patientName));
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
      link.download = `cobranca-mensal-${selectedYear}-${selectedMonth.toString().padStart(2, '0')}.xlsx`;
      // link.download = `cobranca-mensal-${selectedYear}-${selectedMonth.toString().padStart(2, '0')}.csv`;

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

  // NEW: Generate NFS-e invoice for a patient
  const generateInvoice = async (patientSummary: BillingSummary) => {
    // Check certificate status first
    console.log(`🔍 Checking certificate status for NFS-e generation...`, certificateStatus?.hasValidCertificate);

    if (!certificateStatus?.hasValidCertificate) {
      const goToSettings = window.confirm(
        'Certificado Necessário\n\n' +
        'É necessário um certificado digital válido para emitir notas fiscais.\n\n' +
        'Ir para Configurações NFS-e agora?'
      );

      if (goToSettings) {
        window.location.href = '/nfse-configuracao';
      }
      return;
    }

    // Check if certificate is expired
    if (certificateStatus.status === 'expired') {
      window.alert(
        'Certificado Expirado\n\n' +
        'Seu certificado digital expirou. Faça upload de um certificado válido para continuar.'
      );
      return;
    }

    // Confirm invoice generation
    const confirmed = window.confirm(
      `Gerar nota fiscal de confirmação de pagamento para ${patientSummary.patientName}?\n\n` +
      `Período: ${selectedMonth}/${selectedYear}\n` +
      `Sessões: ${patientSummary.sessionCount}\n` +
      `Valor pago: ${formatCurrency(patientSummary.totalAmount)}\n\n` +
      `Esta NFS-e confirma o pagamento recebido.`
    );

    if (confirmed) {
      executeInvoiceGeneration(patientSummary);
    }
  };

  const executeInvoiceGeneration = async (patientSummary: BillingSummary) => {
    // 🚧 MOCK MODE - Prevent actual API calls while waiting for PlugNotas account
    const MOCK_MODE = true; // Set to false when PlugNotas is ready
    try {
      // Add patient to generating set
      setGeneratingInvoices(prev => new Set([...prev, patientSummary.patientId]));

      console.log(`🧾 Generating NFS-e for patient ${patientSummary.patientName}`);


      if (MOCK_MODE) {
        console.log('🧪 MOCK MODE: Simulating NFS-e generation...');

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Mock successful response
        const mockResult = {
          invoice: {
            invoiceId: `MOCK-${Date.now()}`,
            invoiceNumber: `NFSe-${Math.floor(Math.random() * 10000)}`,
            status: 'issued',
            pdfUrl: null, // No PDF in mock mode
            verificationCode: `MOCK-${Math.random().toString(36).substr(2, 9)}`,
          }
        };

        console.log('✅ Mock NFS-e generated successfully:', mockResult);

        // Add to generated set
        setGeneratedInvoices(prev => new Set([...prev, patientSummary.patientId]));

        // Show mock success message
        const successMessage = `🧪 NFS-e Simulada Gerada! (MODO TESTE)\n\n` +
          `Nota fiscal simulada para ${patientSummary.patientName}\n\n` +
          `Período: ${selectedMonth}/${selectedYear}\n` +
          `Número: ${mockResult.invoice.invoiceNumber}\n` +
          `Status: ${mockResult.invoice.status}\n\n` +
          `ATENÇÃO: Esta é uma simulação. Nenhuma nota fiscal real foi gerada.\n` +
          `Aguardando aprovação da conta PlugNotas.`;

        window.alert(successMessage);
        return; // Exit early in mock mode
      }

      // 🚀 REAL NFS-e GENERATION CODE - Activated when MOCK_MODE = false
      console.log('🎯 REAL MODE: Generating actual NFS-e via PlugNotas...');

      // Get full patient data from the database to get email and other details
      const patients = await apiService.getPatients(therapistEmail);
      const fullPatientInfo = patients.find(p => parseInt(p.id) === patientSummary.patientId);

      if (!fullPatientInfo) {
        throw new Error('Patient information not found in database');
      }

      console.log('📋 Found patient data:', {
        name: fullPatientInfo.name,
        email: fullPatientInfo.email,
        id: fullPatientInfo.id
      });

      // Get NFS-e settings from database
      const nfseSettings = await nfseService.getNFSeSettings(therapistId);
      console.log('📋 Found NFS-e settings:', nfseSettings.settings);

      // Prepare invoice data based on the billing period with real data
      const invoiceData = {
        sessionId: `${patientSummary.patientId}-${selectedYear}-${selectedMonth}`, // Unique session reference
        customerData: {
          name: patientSummary.patientName,
          email: fullPatientInfo.email || undefined,
          // Add document if available in patient data (CPF/CNPJ)
          // document: fullPatientInfo.document || undefined,
          // Add customer address if available
          // address: fullPatientInfo.address ? {
          //   street: fullPatientInfo.address.street,
          //   number: fullPatientInfo.address.number,
          //   complement: fullPatientInfo.address.complement,
          //   neighborhood: fullPatientInfo.address.neighborhood,
          //   city: fullPatientInfo.address.city,
          //   state: fullPatientInfo.address.state,
          //   zipCode: fullPatientInfo.address.zipCode
          // } : undefined
        },
        serviceData: {
          description: nfseSettings.settings.defaultServiceDescription || `Serviços de Psicologia - ${selectedMonth}/${selectedYear}`,
          value: patientSummary.totalAmount / 100, // Convert from cents to currency
          serviceCode: nfseSettings.settings.serviceCode || '14.01' // Use configured service code
        }
      };

      console.log('📋 Invoice data prepared for PlugNotas:', {
        sessionId: invoiceData.sessionId,
        customerName: invoiceData.customerData.name,
        serviceDescription: invoiceData.serviceData.description,
        value: invoiceData.serviceData.value,
        serviceCode: invoiceData.serviceData.serviceCode
      });

      // Generate production invoice via PlugNotas
      console.log('🔌 Calling PlugNotas API...');
      const result = await nfseService.generateProductionInvoice(therapistId, invoiceData);

      console.log('✅ Real NFS-e generated successfully via PlugNotas:', {
        invoiceId: result.invoice.invoiceId,
        invoiceNumber: result.invoice.invoiceNumber,
        status: result.invoice.status,
        hasPdf: !!result.invoice.pdfUrl
      });

      // Add to generated set
      setGeneratedInvoices(prev => new Set([...prev, patientSummary.patientId]));

      // Store invoice information in local state or refresh data if needed
      // This could trigger a refresh of the billing summary to show updated status
      console.log('💾 Invoice generation completed, updating UI state...');

      // Show real success message with web-compatible dialogs
      const successMessage = `✅ NFS-e Gerada com Sucesso!\n\n` +
        `Nota fiscal oficial gerada para ${patientSummary.patientName}\n\n` +
        `Período: ${selectedMonth}/${selectedYear}\n` +
        `Número: ${result.invoice.invoiceNumber || result.invoice.invoiceId}\n` +
        `Status: ${result.invoice.status}\n` +
        `Código de Verificação: ${result.invoice.verificationCode || 'Não disponível'}\n\n` +
        `${result.invoice.pdfUrl ? 'PDF disponível para download.' : 'PDF será disponibilizado quando a nota for processada pela Prefeitura.'}`;

      if (result.invoice.pdfUrl) {
        const openPdf = window.confirm(successMessage + '\n\nAbrir PDF da NFS-e agora?');
        if (openPdf) {
          console.log('🔗 Opening NFS-e PDF:', result.invoice.pdfUrl);
          window.open(result.invoice.pdfUrl, '_blank');
        }
      } else {
        window.alert(successMessage);
      }

      // Optionally refresh billing data to show updated status
      console.log('🔄 Considering refresh of billing data...');
      // await loadBillingSummary();

      // Log successful completion
      console.log(`🎉 NFS-e generation completed successfully for patient ${patientSummary.patientName}`);

    } catch (error: any) {
      console.error('❌ Error generating NFS-e:', error);

      let errorMessage = 'Erro desconhecido ao gerar nota fiscal.';

      if (error instanceof Error) {
        // PlugNotas specific errors
        if (error.message.includes('Certificate')) {
          errorMessage = 'Erro no certificado digital. Verifique se o certificado está válido e não expirou.';
        } else if (error.message.includes('Company')) {
          errorMessage = 'Empresa não registrada no PlugNotas. Configure sua empresa nas configurações NFS-e.';
        } else if (error.message.includes('already exists')) {
          errorMessage = 'Já existe uma nota fiscal para este período e paciente.';
        } else if (error.message.includes('Patient information not found')) {
          errorMessage = 'Informações do paciente não encontradas no banco de dados. Tente novamente.';
        } else if (error.message.includes('Authentication required')) {
          errorMessage = 'Erro de autenticação. Faça login novamente.';
        } else if (error.message.includes('Municipal registration required')) {
          errorMessage = 'Inscrição municipal necessária. Configure sua empresa com inscrição municipal válida.';
        } else if (error.message.includes('Service code invalid')) {
          errorMessage = 'Código de serviço inválido. Verifique as configurações NFS-e.';
        } else if (error.message.includes('Tax rate')) {
          errorMessage = 'Erro na alíquota de imposto. Verifique as configurações de tributos.';
        } else if (error.message.includes('network') || error.message.includes('timeout')) {
          errorMessage = 'Erro de conexão com PlugNotas. Verifique sua internet e tente novamente.';
        } else if (error.message.includes('rate limit')) {
          errorMessage = 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.';
        } else {
          errorMessage = `Erro: ${error.message}`;
        }
      }

      // Log detailed error for debugging
      console.error('🔍 Detailed error information:', {
        message: error.message,
        stack: error.stack,
        patientId: patientSummary.patientId,
        patientName: patientSummary.patientName,
        period: `${selectedMonth}/${selectedYear}`,
        mockMode: MOCK_MODE
      });

      window.alert(`Erro ao Gerar NFS-e\n\n${errorMessage}`);
    } finally {
      // Remove from generating set (cleanup always happens)
      setGeneratingInvoices(prev => {
        const newSet = new Set(prev);
        newSet.delete(patientSummary.patientId);
        return newSet;
      });

      console.log(`🧹 Cleanup completed for patient ${patientSummary.patientName}`);
    }
  };


  const viewBillingPeriodDetails = async (billingPeriodId: number | undefined, patientSummary?: BillingSummary) => {
    try {
      if (billingPeriodId && billingPeriodId > 0) {
        // Existing logic for processed payments
        console.log(`🔍 Loading billing period details: ${billingPeriodId}`);

        const details = await apiService.getBillingPeriodDetails(billingPeriodId);
        setBillingPeriodDetails(details);

        console.log(`✅ Loaded billing period details:`, details);
      } else if (patientSummary) {
        // Use the session snapshots that are already included in patientSummary
        console.log(`🔍 Creating preview for unprocessed patient: ${patientSummary.patientName}`);
        console.log(`✅ Found ${patientSummary.sessionSnapshots?.length || 0} session snapshots already formatted`);

        // Create billing period details using the pre-formatted snapshots
        const tempDetails: BillingPeriod = {
          id: 0, // Temporary ID to indicate this is unprocessed
          therapistId: 1, // Placeholder therapist ID
          patientId: patientSummary.patientId,
          billingYear: selectedYear,
          billingMonth: selectedMonth,
          sessionCount: patientSummary.sessionCount,
          totalAmount: patientSummary.totalAmount,
          status: 'processed' as const, // Use valid status for display purposes
          processedAt: new Date(),
          processedBy: 'preview',
          canBeVoided: false,
          sessionSnapshots: patientSummary.sessionSnapshots || [] // Use the pre-formatted snapshots!
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

    // NEW: Check if there's a matched payment for this patient
    const matchedPayment = paymentMatches.get(patientSummary.patientId);

    setPaymentFormData({
      amount: matchedPayment
        ? matchedPayment.transaction_amount.toFixed(2) // Pre-fill with matched amount
        : (patientSummary.totalAmount / 100).toFixed(2), // Fallback to billing amount
      paymentMethod: matchedPayment?.transaction_type === 'pix' ? 'pix' : 'pix', // Default to PIX
      paymentDate: matchedPayment
        ? matchedPayment.transaction_date.split('T')[0] // Pre-fill with transaction date
        : new Date().toISOString().split('T')[0], // Fallback to today
      referenceNumber: matchedPayment?.lv_reference || '' // Pre-fill LV reference
    });

    setShowPaymentForm(true);
  };

  const recordPayment = async () => {
    if (!selectedPatient?.billingPeriodId) {
      alert('Erro: Período de cobrança não encontrado');
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

  const handlePaymentButtonPress = (patientSummary: BillingSummary) => {
    // Check for outstanding balance blocking
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

    // No outstanding balance, proceed normally
    openPaymentForm(patientSummary);
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

  // NEW: Determine if NFS-e button should be shown for a patient
  const shouldShowNFSeButton = (patient: BillingSummary) => {
    // Only show for processed patients (who have been charged)
    if (patient.status !== 'paid') return false;

    // Only show if certificate is valid
    if (!certificateStatus?.hasValidCertificate) return false;

    // Don't show if already generated for this patient
    if (generatedInvoices.has(patient.patientId)) return false;

    return true;
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
              {certificateStatus?.hasValidCertificate && ' • 🧾 NFS-e Configurado'}
            </Text>
          </View>

          <View style={styles.headerRight}>
            <Pressable
              style={[styles.exportButton, (loading || billingSummary.length === 0 || isExporting) && styles.exportButtonDisabled]}
              onPress={exportCSV}
              disabled={loading || billingSummary.length === 0 || isExporting}
            >
              <Text style={styles.exportButtonText}>
                {isExporting ? '📊 Exportando...' : '📊 Exportar XLSX'}
                {/* {isExporting ? '📊 Exportando...' : '📊 Exportar CSV'} */}
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
                <View style={styles.statusContainer}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(patient.status || 'can_process') }]}>
                    <Text style={styles.statusText}>{getStatusText(patient.status || 'can_process')}</Text>
                  </View>
                  {/* NEW: Invoice status indicator */}
                  {generatedInvoices.has(patient.patientId) && (
                    <View style={styles.invoiceIndicator}>
                      <Text style={styles.invoiceIndicatorText}>🧾</Text>
                    </View>
                  )}
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


              {/* NEW: Outstanding balance display */}
              {patient.hasOutstandingBalance && (
                <Text style={styles.outstandingText}>
                  💰 Saldo pendente: {formatCurrency(patient.outstandingBalance)} de {patient.oldestUnpaidMonth}/{patient.oldestUnpaidYear}
                </Text>
              )}

              {/* NEW: Payment match info component */}
              {paymentMatches.has(patient.patientId) && (
                <PaymentMatchInfo match={paymentMatches.get(patient.patientId)} />
              )}

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
                      style={[
                        styles.actionButton,
                        patient.hasOutstandingBalance ? styles.paymentButtonWarning : styles.paymentButton
                      ]}
                      onPress={() => handlePaymentButtonPress(patient)}
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

                    {/* NEW: Cancel Billing Request button for processed but unpaid billing periods */}
                    {!patient.hasPayment && (
                      <Pressable
                        style={[styles.actionButton, styles.cancelBillingButton]}
                        onPress={() => {
                          console.log(`🗑️ Requesting cancellation for patient ${patient.patientName}`);
                          setPatientToCancel(patient);
                          setShowCancelConfirmation(true);
                          console.log(showCancelConfirmation);
                          console.log(patientToCancel);
                        }}
                      >
                        <Text style={styles.cancelBillingButtonText}>🗑️ Cancelar Cobrança</Text>
                      </Pressable>
                    )}
                  </>
                )}

                {/* Cancel Confirmation Modal */}
                {showCancelConfirmation && patientToCancel && (
                  <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                      <View style={styles.cancelConfirmationModal}>
                        <Text style={styles.formTitle}>⚠️ Cancelar Cobrança</Text>

                        <Text style={styles.cancelWarningText}>
                          Tem certeza que deseja cancelar a cobrança de{' '}
                          <Text style={styles.patientNameBold}>{patientToCancel.patientName}</Text>?
                        </Text>

                        <Text style={styles.cancelDetailsText}>
                          Isso irá remover o período de cobrança e permitir reprocessar as sessões.
                        </Text>

                        <View style={styles.cancelSummary}>
                          <Text style={styles.cancelSummaryText}>
                            📅 Período: {selectedMonth}/{selectedYear}
                          </Text>
                          <Text style={styles.cancelSummaryText}>
                            📊 Sessões: {patientToCancel.sessionCount}
                          </Text>
                          <Text style={styles.cancelSummaryText}>
                            💰 Valor: {formatCurrency(patientToCancel.totalAmount)}
                          </Text>
                        </View>

                        <View style={styles.cancelActions}>
                          <Pressable
                            style={[styles.actionButton, styles.cancelModalCancelButton]}
                            onPress={() => {
                              setShowCancelConfirmation(false);
                              setPatientToCancel(null);
                            }}
                          >
                            <Text style={styles.cancelModalCancelButtonText}>Não, Manter</Text>
                          </Pressable>

                          <Pressable
                            style={[styles.actionButton, styles.cancelModalConfirmButton]}
                            onPress={async () => {
                              setShowCancelConfirmation(false);
                              await voidBillingPeriod(patientToCancel);
                              setPatientToCancel(null);
                            }}
                          >
                            <Text style={styles.cancelModalConfirmButtonText}>🗑️ Sim, Cancelar</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  </View>
                )}

                {/* NEW: NFS-e button for PAID patients */}
                {patient.status === 'paid' && shouldShowNFSeButton(patient) && (
                  <Pressable
                    style={[
                      styles.actionButton,
                      styles.nfseButton,
                      generatingInvoices.has(patient.patientId) && styles.nfseButtonDisabled
                    ]}
                    onPress={() => generateInvoice(patient)}
                    disabled={generatingInvoices.has(patient.patientId)}
                  >
                    <Text style={styles.nfseButtonText}>
                      {generatingInvoices.has(patient.patientId) ? '🔄 Gerando...' : '🧾 Gerar NFS-e'}
                    </Text>
                  </Pressable>
                )}

                {/* Certificate Warning for processed patients without valid certificate */}
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
                  onPress={() => viewBillingPeriodDetails(patient.billingPeriodId, patient)}
                >
                  <Text style={styles.detailButtonText}>Ver Detalhes</Text>
                </Pressable>
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
              {(billingPeriodDetails as any).payments && Array.isArray((billingPeriodDetails as any).payments) && (billingPeriodDetails as any).payments.length > 0 && (
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
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  outstandingText: {
    fontSize: 12,
    color: '#dc3545',
    fontWeight: 'bold',
    marginBottom: 2,
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
  // NEW: Updated status container to hold both status and invoice indicator
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
  // NEW: Invoice status indicator
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
  // NEW: NFS-e button styles
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
  // NEW: Certificate warning button
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
  paymentButtonDisabled: {
    backgroundColor: '#e9ecef',
    borderColor: '#dee2e6',
    borderWidth: 1,
  },
  paymentButtonWarning: {
    backgroundColor: '#ffc107',
    borderColor: '#f0ad4e',
    borderWidth: 1,
  },
  cancelBillingButton: {
    backgroundColor: '#dc3545', // Red color for destructive action
    borderColor: '#dc3545',
  },
  cancelBillingButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  // Add these to your existing styles object
  cancelConfirmationModal: {
    padding: 24,
    alignItems: 'center',
  },
  cancelWarningText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    color: '#495057',
    lineHeight: 24,
  },
  patientNameBold: {
    fontWeight: 'bold',
    color: '#212529',
  },
  cancelDetailsText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  cancelSummary: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    width: '100%',
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  cancelSummaryText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#495057',
  },
  cancelActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },
  cancelModalCancelButton: {
    backgroundColor: '#6c757d',
    borderColor: '#6c757d',
    flex: 1,
    maxWidth: 140,
  },
  cancelModalCancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelModalConfirmButton: {
    backgroundColor: '#dc3545',
    borderColor: '#dc3545',
    flex: 1,
    maxWidth: 140,
  },
  cancelModalConfirmButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});