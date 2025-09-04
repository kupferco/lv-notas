// src/services/api/nfse-service.ts - NFS-e API Service

import { baseApiService } from './base-service';
import { NFSeSettings } from '../../components/nfse/types'

// Type definitions for NFS-e API
export interface CertificateStatus {
  hasValidCertificate: boolean;
  status: 'not_uploaded' | 'uploaded' | 'expired' | 'invalid';
  expiresAt?: string;
  expiresIn30Days?: boolean;
  certificateInfo?: {
    commonName: string;
    issuer: string;
    cnpj: string;
  };
  validationStatus?: string;
}

// export interface NFSeSettings {
//   serviceCode: string;
//   taxRate: number;
//   serviceDescription: string;
//   issWithholding: boolean;
//   additionalInfo?: string;
//   isConfigured?: boolean;
// }

export interface CompanyData {
  cnpj: string;
  companyName: string;
  tradeName?: string;
  email: string;
  phone?: string;
  municipalRegistration?: string;
  stateRegistration?: string;
  taxRegime?: string;
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

export interface InvoiceData {
  patientId: string;
  year: number;
  month: number;
  customerData?: {
    document?: string;
    address?: {
      street: string;
      number: string;
      complement?: string;
      neighborhood: string;
      city: string;
      state: string;
      zipCode: string;
      cityCode?: string;
    };
  };
}

export interface InvoiceResult {
  invoiceId: string;
  invoiceNumber?: string;
  status: string;
  pdfUrl?: string;
  xmlUrl?: string;
  verificationCode?: string;
  accessKey?: string;
  issueDate?: Date;
  error?: string;
}

export interface ConnectionStatus {
  connected: boolean;
  provider: string;
  environment: string;
  error?: string;
}

export interface ServiceCode {
  code: string;
  description: string;
}

export interface Invoice {
  id: number;
  therapistId: number;
  sessionId: number;
  providerInvoiceId: string;
  invoiceNumber?: string;
  invoiceAmount: number;
  invoiceStatus: string;
  pdfUrl?: string;
  xmlUrl?: string;
  isTest: boolean;
  createdAt: string;
  sessionDate: string;
  patientName: string;
}

interface BillingPeriodInfo {
  billing_period_id: number;
  patient_id: number;
  year: number;
  month: number;
  session_count: number;
  total_amount: number;
  patient_name: string;
  patient_document?: string;
}

const { makeApiCall, canMakeAuthenticatedCall, handleApiError } = baseApiService;

export const nfseService = {
  // ==========================================
  // CERTIFICATE MANAGEMENT
  // ==========================================

  async uploadCertificate(therapistId: string, certificateFile: any, password: string): Promise<any> {  // Change return type
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for certificate operations");
    }

    try {
      const headers = await baseApiService.getAuthHeaders();

      const formData = new FormData();

      // Handle the file properly for React Native Web
      if (certificateFile.uri) {
        // For React Native, create a proper File object
        const response = await fetch(certificateFile.uri);
        const blob = await response.blob();
        formData.append('certificate', blob, certificateFile.name);
      } else if (certificateFile instanceof File) {
        // For web, use the File directly
        formData.append('certificate', certificateFile);
      } else {
        throw new Error('Invalid certificate file format');
      }

      formData.append('password', password);
      formData.append('therapistId', therapistId);

      // Create headers without Content-Type (let browser set it for FormData)
      const uploadHeaders = { ...headers };
      delete uploadHeaders['Content-Type'];

      const response = await fetch(`${baseApiService.API_URL}/api/nfse/certificate`, {
        method: "POST",
        headers: uploadHeaders,
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload certificate");
      }

      const data = await response.json();  // ADD THIS
      console.log("✅ Certificate uploaded successfully");
      return data;  // ADD THIS

    } catch (error) {
      return handleApiError(error as Error, 'uploadCertificate');
    }
  },

  async getCertificateStatus(therapistId: string): Promise<CertificateStatus> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for certificate operations");
    }

    try {
      console.log("📞 getCertificateStatus API call for therapist:", therapistId);
      return await makeApiCall<CertificateStatus>(`/api/nfse/certificate/status/${therapistId}`);
    } catch (error) {
      return handleApiError(error as Error, 'getCertificateStatus');
    }
  },

  // ==========================================
  // COMPANY REGISTRATION
  // ==========================================

  async registerNFSeCompany(therapistId: string, companyData: CompanyData): Promise<void> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for company registration");
    }

    try {
      console.log("📞 registerNFSeCompany API call for therapist:", therapistId);
      await makeApiCall(`/api/nfse/company/register`, {
        method: "POST",
        body: JSON.stringify({ therapistId, companyData }),
      });
      console.log("✅ Company registered successfully");
    } catch (error) {
      return handleApiError(error as Error, 'registerNFSeCompany');
    }
  },

  // ==========================================
  // INVOICE GENERATION
  // ==========================================

  // Add these methods to your nfse-service.ts file in the INVOICE MANAGEMENT section

  async getInvoiceForBillingPeriod(billingPeriodId: number): Promise<any> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for invoice operations");
    }

    try {
      console.log("📞 getInvoiceForBillingPeriod API call for billing period:", billingPeriodId);
      const response = await makeApiCall<any>(`/api/nfse/billing-period/${billingPeriodId}/invoice`);
      return response.invoice;
    } catch (error) {
      return handleApiError(error as Error, 'getInvoiceForBillingPeriod');
    }
  },

  async getInvoiceStatusFromDatabase(invoiceId: number): Promise<any> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for invoice operations");
    }

    try {
      console.log("📞 getInvoiceStatusFromDatabase API call for invoice:", invoiceId);
      return await makeApiCall<any>(`/api/nfse/invoice/${invoiceId}/status`);
    } catch (error) {
      return handleApiError(error as Error, 'getInvoiceStatusFromDatabase');
    }
  },

  async cancelInvoice(invoiceId: string, reason?: string): Promise<any> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for invoice operations");
    }

    try {
      console.log("📞 cancelInvoice API call for invoice:", invoiceId);
      return await makeApiCall(`/api/nfse/invoice/${invoiceId}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: reason || 'Cancelamento solicitado pelo usuário' }),
      });
    } catch (error) {
      return handleApiError(error as Error, 'cancelInvoice');
    }
  },

  async generateNFSeInvoice(therapistId: number, patientId: number, year: number, month: number, customerData?: any): Promise<any> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for invoice generation");
    }

    try {
      console.log("📞 generateNFSeInvoice API call", { therapistId, patientId, year, month });
      const response = await makeApiCall<any>(`/api/nfse/invoice/generate`, {
        method: "POST",
        body: JSON.stringify({
          therapistId,
          patientId,
          year,
          month,
          customerData,
          testMode: false
        }),
      });
      console.log("✅ NFS-e invoice generated successfully", response);
      return response;
    } catch (error) {
      return handleApiError(error as Error, 'generateNFSeInvoice');
    }
  },

  async generateInvoice(therapistId: string, invoiceData: InvoiceData): Promise<{ invoice: InvoiceResult; invoiceRecord: any }> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for invoice generation");
    }

    try {
      console.log("📞 generateInvoice API call for therapist:", therapistId);
      return await makeApiCall<{ invoice: InvoiceResult; invoiceRecord: any }>(`/api/nfse/invoice/generate`, {
        method: "POST",
        body: JSON.stringify({ therapistId, ...invoiceData }),
      });
    } catch (error) {
      return handleApiError(error as Error, 'generateInvoice');
    }
  },

  async getFirstAvailableBillingPeriod(therapistId: string): Promise<BillingPeriodInfo> {
    return await makeApiCall<BillingPeriodInfo>(`/api/nfse/billing/first-available/${therapistId}`);
  },

  // ==========================================
  // INVOICE MANAGEMENT
  // ==========================================

  async getTherapistInvoices(
    therapistId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: string;
      isTest?: boolean;
    }
  ): Promise<{ invoices: Invoice[]; pagination: any }> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for invoice operations");
    }

    try {
      const queryParams = new URLSearchParams();
      if (options?.limit) queryParams.append('limit', options.limit.toString());
      if (options?.offset) queryParams.append('offset', options.offset.toString());
      if (options?.status) queryParams.append('status', options.status);
      if (options?.isTest !== undefined) queryParams.append('isTest', options.isTest.toString());

      console.log("📞 getTherapistInvoices API call for therapist:", therapistId);
      return await makeApiCall<{ invoices: Invoice[]; pagination: any }>(`/api/nfse/invoices/${therapistId}?${queryParams}`);
    } catch (error) {
      return handleApiError(error as Error, 'getTherapistInvoices');
    }
  },

  async getInvoiceStatus(invoiceId: string): Promise<InvoiceResult> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for invoice operations");
    }

    try {
      console.log("📞 getInvoiceStatus API call for invoice:", invoiceId);
      return await makeApiCall<InvoiceResult>(`/api/nfse/invoice/${invoiceId}/status`);
    } catch (error) {
      return handleApiError(error as Error, 'getInvoiceStatus');
    }
  },

  // ==========================================
  // SETTINGS MANAGEMENT
  // ==========================================

  async updateNFSeSettings(therapistId: string, settings: NFSeSettings): Promise<void> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for settings operations");
    }

    try {
      console.log("📞 updateNFSeSettings API call for therapist:", therapistId);
      const result = await makeApiCall(`/api/nfse/settings`, {
        method: "PUT",
        body: JSON.stringify({ therapistId, settings }),
      });
      console.log("✅ NFS-e settings updated successfully", result);
    } catch (error) {
      return handleApiError(error as Error, 'updateNFSeSettings');
    }
  },

  async getNFSeSettings(therapistId: string): Promise<{ settings: NFSeSettings }> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for settings operations");
    }

    try {
      console.log("📞 getNFSeSettings API call for therapist:", therapistId);
      return await makeApiCall<{ settings: NFSeSettings }>(`/api/nfse/settings/${therapistId}`);
    } catch (error) {
      // Let the error bubble up instead of hiding it with defaults
      console.error("❌ getNFSeSettings failed:", error);
      return handleApiError(error as Error, 'getNFSeSettings');
    }
  },

  // ==========================================
  // UTILITY FUNCTIONS
  // ==========================================

  async testNFSeConnection(): Promise<ConnectionStatus> {
    try {
      console.log("📞 testNFSeConnection API call");
      return await makeApiCall<ConnectionStatus>(`/api/nfse/test-connection`);
    } catch (error) {
      console.warn("⚠️ NFS-e connection test failed:", error);
      return {
        connected: false,
        provider: 'PlugNotas',
        environment: 'unknown',
        error: 'Connection test failed'
      };
    }
  },

  async getServiceCodes(cityCode?: string): Promise<{ serviceCodes: ServiceCode[] }> {
    try {
      const queryParams = new URLSearchParams();
      if (cityCode) queryParams.append('cityCode', cityCode);

      console.log("📞 getServiceCodes API call");
      return await makeApiCall<{ serviceCodes: ServiceCode[] }>(`/api/nfse/service-codes?${queryParams}`);
    } catch (error) {
      console.error("❌ getServiceCodes failed:", error);
      return handleApiError(error as Error, 'getServiceCodes');
    }
  },

  // ==========================================
  // HELPER FUNCTIONS
  // ==========================================

  // Helper function to download invoice PDF
  async downloadInvoicePDF(pdfUrl: string, invoiceNumber: string): Promise<void> {
    try {
      console.log("📥 Downloading invoice PDF:", invoiceNumber);

      // For web platform, open in new tab
      if (typeof window !== 'undefined') {
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `nfse_${invoiceNumber}.pdf`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log("✅ PDF download initiated");
      }
      // For mobile, you might want to use FileSystem API or similar
    } catch (error) {
      console.error('❌ Error downloading PDF:', error);
      throw new Error('Failed to download PDF');
    }
  },

  // Helper function to format currency for display
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  },

  // Helper function to format document (CPF/CNPJ)
  formatDocument(document: string): string {
    if (!document) return '';

    // Remove non-digits
    const cleanDoc = document.replace(/\D/g, '');

    if (cleanDoc.length === 11) {
      // CPF format: 000.000.000-00
      return cleanDoc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (cleanDoc.length === 14) {
      // CNPJ format: 00.000.000/0000-00
      return cleanDoc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }

    return document;
  },

  // Helper function to validate document
  isValidDocument(document: string): boolean {
    if (!document) return false;

    const cleanDoc = document.replace(/\D/g, '');

    // Basic length validation
    return cleanDoc.length === 11 || cleanDoc.length === 14;
  },

  // Helper function to get invoice status display text and color
  getInvoiceStatusDisplay(status: string): { text: string; color: string } {
    const statusMap: Record<string, { text: string; color: string }> = {
      'pending': { text: 'Aguardando', color: '#FF9800' },
      'processing': { text: 'Processando', color: '#2196F3' },
      'issued': { text: 'Emitida', color: '#4CAF50' },
      'cancelled': { text: 'Cancelada', color: '#F44336' },
      'error': { text: 'Erro', color: '#F44336' }
    };

    return statusMap[status] || { text: 'Desconhecido', color: '#9E9E9E' };
  },

  // Helper function to validate certificate file
  isValidCertificateFile(file: File): boolean {
    const validExtensions = ['.p12', '.pfx', '.pem'];
    const fileName = file.name.toLowerCase();
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
    const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB limit

    return hasValidExtension && isValidSize;
  }
};