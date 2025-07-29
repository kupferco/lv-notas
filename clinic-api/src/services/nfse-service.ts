// clinic-api/src/services/nfse-service.ts
// Provider-agnostic NFS-e service layer

import pool from '../config/database.js';
import { PlugNotasProvider } from './providers/plugnotas-provider.js';
import { EncryptionService } from '../utils/encryption.js';

// Types for NFS-e operations
export interface NFSeProvider {
  registerCompany(companyData: CompanyRegistration): Promise<string>;
  generateInvoice(companyId: string, data: InvoiceRequest): Promise<InvoiceResult>;
  getInvoiceStatus(companyId: string, invoiceId: string): Promise<InvoiceStatus>;
  validateCertificate(certificate: Buffer, password: string): Promise<CertificateValidation>;
  cancelInvoice?(companyId: string, invoiceId: string, reason: string): Promise<boolean>;
  testConnection?(): Promise<boolean>;
  getServiceCodes?(cityCode?: string): Promise<Array<{code: string, description: string}>>;
}

export interface CompanyRegistration {
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

export interface InvoiceRequest {
  providerCnpj: string;
  providerMunicipalRegistration?: string;
  customerName: string;
  customerEmail?: string;
  customerDocument?: string;
  customerAddress?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  serviceCode: string;
  serviceDescription: string;
  serviceValue: number;
  taxRate?: number;
  taxWithheld?: boolean;
  sessionDate?: Date;
}

export interface InvoiceResult {
  invoiceId: string;
  invoiceNumber?: string;
  status: 'pending' | 'processing' | 'issued' | 'cancelled' | 'error';
  pdfUrl?: string;
  xmlUrl?: string;
  verificationCode?: string;
  accessKey?: string;
  issueDate?: Date;
  error?: string;
  databaseId?: number; // Added for database tracking
}

export interface InvoiceStatus {
  invoiceId: string;
  status: 'pending' | 'processing' | 'issued' | 'cancelled' | 'error';
  invoiceNumber?: string;
  pdfUrl?: string;
  xmlUrl?: string;
  error?: string;
  lastUpdated?: Date;
}

export interface CertificateValidation {
  isValid: boolean;
  expiresAt?: Date;
  issuer?: string;
  subject?: string;
  error?: string;
}

export class NFSeService {
  private providers: Map<string, NFSeProvider> = new Map();

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Initialize PlugNotas provider with configuration
    const plugnotasConfig = {
      apiKey: process.env.PLUGNOTAS_API_KEY || '',
      apiUrl: process.env.PLUGNOTAS_API_URL || 'https://api.plugnotas.com.br',
      sandbox: process.env.PLUGNOTAS_SANDBOX === 'true'
    };

    if (plugnotasConfig.apiKey) {
      const plugNotasProvider = new PlugNotasProvider(plugnotasConfig);
      this.providers.set('plugnotas', plugNotasProvider);
    } else {
      console.warn('PlugNotas API key not configured');
    }
    
    // Future providers can be added here:
    // this.providers.set('focus_nfe', new FocusNFeProvider(focusConfig));
    // this.providers.set('nfe_io', new NFeIOProvider(nfeConfig));
  }

  /**
   * Get therapist's NFS-e configuration
   */
  async getTherapistConfig(therapistId: number): Promise<any> {
    const result = await pool.query(
      'SELECT * FROM therapist_nfse_config WHERE therapist_id = $1',
      [therapistId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }

    const config = result.rows[0];
    
    // Decrypt sensitive data for use
    if (config.certificate_password_encrypted) {
      try {
        const encryptedData = JSON.parse(config.certificate_password_encrypted);
        config.certificate_password = EncryptionService.decryptPassword(
          encryptedData.encryptedData,
          encryptedData.iv,
          encryptedData.salt,
          process.env.CERTIFICATE_ENCRYPTION_KEY || 'default-development-key-change-in-production'
        );
      } catch (error) {
        console.error('Error decrypting certificate password:', error);
      }
    }

    return config;
  }

  /**
   * Register company with NFS-e provider
   */
  async registerCompany(companyData: CompanyRegistration): Promise<string> {
    const provider = this.providers.get('plugnotas'); // Default to PlugNotas for now
    if (!provider) {
      throw new Error('No NFS-e provider configured');
    }

    // Register with provider
    return await provider.registerCompany(companyData);
  }

  /**
   * Generate NFS-e invoice
   */
  async generateInvoice(companyId: string, invoiceData: InvoiceRequest): Promise<InvoiceResult> {
    const provider = this.providers.get('plugnotas'); // Default to PlugNotas for now
    if (!provider) {
      throw new Error('No NFS-e provider configured');
    }

    return await provider.generateInvoice(companyId, invoiceData);
  }

  /**
   * Generate test invoice (sandbox mode)
   */
  async generateTestInvoice(companyId: string, invoiceData: InvoiceRequest): Promise<InvoiceResult> {
    // For test invoices, we can use the same method but ensure we're in sandbox mode
    return await this.generateInvoice(companyId, invoiceData);
  }

  /**
   * Get invoice status
   */
  async getInvoiceStatus(companyId: string, invoiceId: string): Promise<InvoiceStatus> {
    const provider = this.providers.get('plugnotas'); // Default to PlugNotas for now
    if (!provider) {
      throw new Error('No NFS-e provider configured');
    }

    return await provider.getInvoiceStatus(companyId, invoiceId);
  }

  /**
   * Validate certificate
   */
  async validateCertificate(certificate: Buffer, password: string): Promise<CertificateValidation> {
    const provider = this.providers.get('plugnotas'); // Default to PlugNotas for now
    if (!provider) {
      throw new Error('No NFS-e provider configured');
    }

    return await provider.validateCertificate(certificate, password);
  }

  /**
   * Test provider connection
   */
  async testConnection(): Promise<boolean> {
    const provider = this.providers.get('plugnotas'); // Default to PlugNotas for now
    if (!provider || !provider.testConnection) {
      return false;
    }

    return await provider.testConnection();
  }

  /**
   * Get available service codes
   */
  async getServiceCodes(cityCode?: string): Promise<Array<{code: string, description: string}>> {
    const provider = this.providers.get('plugnotas'); // Default to PlugNotas for now
    if (!provider || !provider.getServiceCodes) {
      // Return default codes if provider doesn't support this
      return [
        { code: '14.01', description: 'Serviços de Psicologia e Psicanálise' },
        { code: '14.13', description: 'Terapias de Qualquer Espécie Destinadas ao Tratamento Físico, Mental e Espiritual' }
      ];
    }

    return await provider.getServiceCodes(cityCode);
  }

  /**
   * List therapist's invoices
   */
  async getTherapistInvoices(
    therapistId: number,
    startDate?: Date,
    endDate?: Date,
    status?: string
  ): Promise<any[]> {
    let query = 'SELECT * FROM nfse_invoices WHERE therapist_id = $1';
    const params: any[] = [therapistId];
    let paramCount = 1;

    if (startDate) {
      paramCount++;
      query += ` AND created_at >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      query += ` AND created_at <= $${paramCount}`;
      params.push(endDate);
    }

    if (status) {
      paramCount++;
      query += ` AND invoice_status = $${paramCount}`;
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceId: number, therapistId: number): Promise<any> {
    const result = await pool.query(
      'SELECT * FROM nfse_invoices WHERE id = $1 AND therapist_id = $2',
      [invoiceId, therapistId]
    );

    if (result.rows.length === 0) {
      throw new Error('Invoice not found');
    }

    return result.rows[0];
  }

  /**
   * Cancel invoice
   */
  async cancelInvoice(invoiceId: number, therapistId: number, reason: string): Promise<boolean> {
    const invoice = await this.getInvoice(invoiceId, therapistId);
    const config = await this.getTherapistConfig(therapistId);
    
    const provider = this.providers.get('plugnotas'); // Default to PlugNotas for now
    if (!provider || !provider.cancelInvoice) {
      throw new Error('Invoice cancellation not supported by provider');
    }

    const success = await provider.cancelInvoice(config.provider_company_id, invoice.provider_invoice_id, reason);

    if (success) {
      await pool.query(`
        UPDATE nfse_invoices 
        SET invoice_status = 'cancelled', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [invoiceId]);
    }

    return success;
  }
}

// Export singleton instance
export const nfseService = new NFSeService();