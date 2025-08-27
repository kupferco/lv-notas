// src/components/payments/hooks/useMonthlyBilling.ts

import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { apiService, bankingService, therapistService } from '../../../services/api';
import { nfseService, CertificateStatus } from '../../../services/api/nfse-service';
import { whatsappService } from '../../../services/whatsapp';
import {
  BillingSummary,
  BillingPeriod,
  ProcessChargesRequest,
  RecordPaymentRequest,
} from '../../../types/calendar-only';
import { PatientPaymentSummary } from '../../../types/payments';
import { createExportFilename, downloadBlob } from '../monthly/utils/billingHelpers';

interface UseMonthlyBillingProps {
  therapistEmail: string;
  selectedYear: number;
  selectedMonth: number;
}

export const useMonthlyBilling = ({
  therapistEmail,
  selectedYear,
  selectedMonth
}: UseMonthlyBillingProps) => {
  const { user, isAuthenticated } = useAuth();

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

  // NFS-e state management
  const [certificateStatus, setCertificateStatus] = useState<CertificateStatus | null>(null);
  const [generatingInvoices, setGeneratingInvoices] = useState<Set<number>>(new Set());
  const [generatedInvoices, setGeneratedInvoices] = useState<Set<number>>(new Set());

  // Payment matching state
  const [paymentMatches, setPaymentMatches] = useState<Map<number, any>>(new Map());
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Therapist data
  const [therapistId, setTherapistId] = useState<string>("1");
  const [therapistData, setTherapistData] = useState<any>(null);

  // Cancel confirmation state
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [patientToCancel, setPatientToCancel] = useState<BillingSummary | null>(null);

  // Invoicing
  const [invoiceStatuses, setInvoiceStatuses] = useState<Map<number, any>>(new Map());
  const [cancellingInvoices, setCancellingInvoices] = useState<Set<number>>(new Set());
  const [loadingInvoiceStatus, setLoadingInvoiceStatus] = useState<Set<number>>(new Set());

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
        }
      }
    };

    fetchTherapistData();
  }, [user?.email, therapistEmail]);

  // Load billing summary when auth is ready
  useEffect(() => {
    if (therapistEmail && user && isAuthenticated) {
      loadBillingSummary();
      loadCertificateStatus();
    }
  }, [therapistEmail, selectedYear, selectedMonth, user, isAuthenticated]);

  // Load payment matches when billing data is ready
  useEffect(() => {
    if (therapistId && therapistId !== "1" && billingSummary.length > 0 && isAuthenticated) {
      console.log('🔍 Auth and billing data ready, now loading payment matches...');
      loadPaymentMatches();
    }
  }, [therapistId, billingSummary.length, isAuthenticated]);

  useEffect(() => {
    if (billingSummary.length > 0 && isAuthenticated) {
      loadAllInvoiceStatuses();
    }
  }, [billingSummary, isAuthenticated]);

  const loadCertificateStatus = async () => {
    try {
      const status = await nfseService.getCertificateStatus(therapistId);
      setCertificateStatus(status);
      console.log('📋 Certificate status loaded:', status);
    } catch (error) {
      console.error('❌ Error loading certificate status:', error);
    }
  };

  const loadPaymentMatches = async () => {
    if (!isAuthenticated || !user) {
      console.log('⚠️ Authentication not ready, skipping payment matches');
      return;
    }

    try {
      setLoadingMatches(true);
      console.log(`🔍 Loading payment matches for ${selectedYear}-${selectedMonth} with proper auth`);

      const startDate = new Date(selectedYear, selectedMonth - 4, 1).toISOString().split('T')[0];
      const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];

      console.log(`📅 Payment matching date range: ${startDate} to ${endDate}`);
      console.log(`👤 Using therapist ID: ${therapistId}`);

      const data = await bankingService.findPotentialMatches(therapistId, startDate, endDate, 100);

      console.log(`🎯 Payment matching API success:`, data);

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

      console.log(response.summary);

      const patientsWithRelevantData = response.summary.filter((patient: BillingSummary) =>
        patient.sessionCount > 0 || patient.hasOutstandingBalance
      );

      setBillingSummary(patientsWithRelevantData);
      console.log(`✅ Enhanced filtering: ${response.summary.length} total patients -> ${patientsWithRelevantData.length} with sessions or outstanding balances`);

      const filteredOut = response.summary.filter((patient: BillingSummary) => patient.sessionCount === 0);
      if (filteredOut.length > 0) {
        console.log(`🚫 Filtered out ${filteredOut.length} patients with zero sessions:`,
          filteredOut.map((p: BillingSummary) => p.patientName));
      }

    } catch (error: any) {
      console.error('❌ Error loading monthly billing summary:', error);
      console.log('Erro', `Falha ao carregar resumo mensal: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to check invoice status for a billing period
  const checkInvoiceStatus = async (billingPeriodId: number) => {
    try {
      setLoadingInvoiceStatus(prev => new Set(prev).add(billingPeriodId));

      const invoice = await nfseService.getInvoiceForBillingPeriod(billingPeriodId);

      if (invoice) {
        console.log(`📄 Found invoice for billing period ${billingPeriodId}:`, invoice);
        setInvoiceStatuses(prev => new Map(prev).set(billingPeriodId, invoice));

        // If invoice exists and is issued/processing, add to generatedInvoices
        if (invoice.invoice_status === 'issued' || invoice.invoice_status === 'processing') {
          const patient = billingSummary.find(p => p.billingPeriodId === billingPeriodId);
          if (patient) {
            setGeneratedInvoices(prev => new Set(prev).add(patient.patientId));
          }
        }
      }
    } catch (error) {
      console.error(`Error checking invoice status for billing period ${billingPeriodId}:`, error);
    } finally {
      setLoadingInvoiceStatus(prev => {
        const newSet = new Set(prev);
        newSet.delete(billingPeriodId);
        return newSet;
      });
    }
  };

  // Function to cancel an invoice
  const cancelInvoice = async (patient: BillingSummary, reason?: string) => {
    if (!patient.billingPeriodId) {
      Alert.alert('Erro', 'Período de cobrança não encontrado');
      return;
    }

    const invoice = invoiceStatuses.get(patient.billingPeriodId);
    if (!invoice) {
      Alert.alert('Erro', 'Nota fiscal não encontrada');
      return;
    }

    try {
      setCancellingInvoices(prev => new Set(prev).add(patient.patientId));

      const result = await nfseService.cancelInvoice(invoice.id.toString(), reason);
      console.log('✅ Invoice cancelled successfully:', result);

      // Update the invoice status in our state
      setInvoiceStatuses(prev => {
        const newMap = new Map(prev);
        newMap.set(patient.billingPeriodId!, { ...invoice, invoice_status: 'cancelled' });
        return newMap;
      });

      // Remove from generatedInvoices set
      setGeneratedInvoices(prev => {
        const newSet = new Set(prev);
        newSet.delete(patient.patientId);
        return newSet;
      });

      Alert.alert('Sucesso', 'Nota fiscal cancelada com sucesso');

      // Reload billing summary to reflect changes
      await loadBillingSummary();

    } catch (error: any) {
      console.error('Error cancelling invoice:', error);
      Alert.alert('Erro', `Erro ao cancelar nota fiscal: ${error.message}`);
    } finally {
      setCancellingInvoices(prev => {
        const newSet = new Set(prev);
        newSet.delete(patient.patientId);
        return newSet;
      });
    }
  };

  // Load all invoice statuses for paid billing periods
  const loadAllInvoiceStatuses = async () => {
    console.log('📋 Loading invoice statuses for all paid billing periods');

    const paidPatients = billingSummary.filter(p =>
      p.status === 'paid' && p.billingPeriodId
    );

    for (const patient of paidPatients) {
      if (patient.billingPeriodId) {
        await checkInvoiceStatus(patient.billingPeriodId);
      }
    }
  };

  const exportCSV = async () => {
    try {
      setIsExporting(true);
      console.log(`📊 Exporting CSV for ${selectedMonth}/${selectedYear}`);

      const csvBlob = await apiService.exportMonthlyBillingCSV(
        therapistEmail,
        selectedYear,
        selectedMonth
      );

      const filename = createExportFilename(selectedYear, selectedMonth);
      downloadBlob(csvBlob, filename);

      console.log(`✅ CSV export completed successfully`);

      console.log(
        'Exportação Concluída!',
        `Dados de cobrança de ${selectedMonth}/${selectedYear} exportados com sucesso.\n\n` +
        `Arquivo: ${filename}\n\n` +
        `O arquivo inclui apenas pacientes com sessões no período selecionado.`
      );

    } catch (error: any) {
      console.error('❌ Error exporting CSV:', error);
      console.log('Erro na Exportação', `Falha ao exportar CSV: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Return all the state and functions that components need
  return {
    // State
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
    loadingMatches,
    therapistId,
    therapistData,
    showCancelConfirmation,
    patientToCancel,

    // Invoice-related state
    invoiceStatuses,
    cancellingInvoices,
    loadingInvoiceStatus,

    // Setters
    setSelectedPatient,
    setShowPaymentForm,
    setPaymentFormData,
    setBillingPeriodDetails,
    setShowCancelConfirmation,
    setPatientToCancel,
    setProcessingPatientId,
    setGeneratingInvoices,
    setGeneratedInvoices,

    // Functions
    loadBillingSummary,
    exportCSV,
    checkInvoiceStatus,
    cancelInvoice,
  };
};