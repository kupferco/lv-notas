// clinic-api/src/services/nfse-service.ts
// Provider-agnostic NFS-e service layer

import pool from '../config/database.js';
import { PlugNotasProvider } from './providers/plugnotas-provider.js';
import { EncryptionUtil } from '../utils/encryption.js';

// Types for NFS-e operations
export interface NFSeProvider {
  name: string;
  registerCompany(companyData: CompanyData, certificate: Buffer, password: string): Promise<string>;
  generateInvoice(invoiceData: InvoiceData): Promise<InvoiceResult>;
  getInvoiceStatus(invoiceId: string): Promise<InvoiceStatus>;
  cancelInvoice(invoiceId: string, reason: string): Promise<boolean>;
  downloadInvoicePDF(invoiceId: string): Promise<Buffer>;
  downloadInvoiceXML(invoiceId: string): Promise<Buffer>;
}

export interface CompanyData {
  cnpj: string;
  companyName: string;
  municipalRegistration?: string;
  stateRegistration?: string;
  email: string;
  phone: string;
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
  providerCompanyId: string;
  certificate: Buffer;
  certificatePassword: string;
  recipient: {
    name: string;
    cpf?: string;
    email?: string;
  };
  service: {
    description: string;
    code: string;
    amount: number; // Amount in cents
    taxRate: number; // Tax rate percentage
  };
  invoiceNumber?: string;
  invoiceSeries?: string;
}

export interface InvoiceResult {
  providerInvoiceId: string;
  invoiceNumber: string;
  verificationCode: string;
  municipalInvoiceNumber?: string;
  amount: number;
  taxAmount: number;
  status: 'issued' | 'pending' | 'error';
  pdfUrl?: string;
  xmlUrl?: string;
  issuedAt?: Date;
  errorMessage?: string;
}

export interface InvoiceStatus {
  status: 'pending' | 'processing' | 'issued' | 'cancelled' | 'error';
  providerInvoiceId: string;
  invoiceNumber?: string;
  verificationCode?: string;
  pdfUrl?: string;
  xmlUrl?: string;
  issuedAt?: Date;
  errorMessage?: string;
}

export class NFSeService {
  private providers: Map<string, NFSeProvider> = new Map();
  private encryptionUtil: EncryptionUtil;

  constructor() {
    this.encryptionUtil = new EncryptionUtil();
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Register available providers
    const plugNotasProvider = new PlugNotasProvider();
    this.providers.set('plugnotas', plugNotasProvider);
    
    // Future providers can be added here:
    // this.providers.set('focus_nfe', new FocusNFeProvider());
    // this.providers.set('nfe_io', new NFeIOProvider());
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
    if (config.provider_api_key_encrypted) {
      config.provider_api_key = await this.encryptionUtil.decrypt(config.provider_api_key_encrypted);
    }
    
    if (config.certificate_password_encrypted) {
      config.certificate_password = await this.encryptionUtil.decrypt(config.certificate_password_encrypted);
    }

    return config;
  }

  /**
   * Register company with NFS-e provider
   */
  async registerCompany(
    therapistId: number,
    providerName: string,
    companyData: CompanyData,
    certificate: Buffer,
    certificatePassword: string
  ): Promise<string> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider not supported: ${providerName}`);
    }

    // Register with provider
    const providerCompanyId = await provider.registerCompany(companyData, certificate, certificatePassword);

    // Store configuration in database
    const encryptedPassword = await this.encryptionUtil.encrypt(certificatePassword);
    
    await pool.query(`
      INSERT INTO therapist_nfse_config (
        therapist_id, nfse_provider, provider_company_id,
        company_cnpj, company_name, company_municipal_registration, company_state_registration,
        company_email, company_phone, company_address,
        default_service_code, default_tax_rate, default_service_description,
        certificate_password_encrypted, certificate_status, provider_registered_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP)
      ON CONFLICT (therapist_id) DO UPDATE SET
        nfse_provider = EXCLUDED.nfse_provider,
        provider_company_id = EXCLUDED.provider_company_id,
        company_cnpj = EXCLUDED.company_cnpj,
        company_name = EXCLUDED.company_name,
        company_municipal_registration = EXCLUDED.company_municipal_registration,
        company_state_registration = EXCLUDED.company_state_registration,
        company_email = EXCLUDED.company_email,
        company_phone = EXCLUDED.company_phone,
        company_address = EXCLUDED.company_address,
        certificate_password_encrypted = EXCLUDED.certificate_password_encrypted,
        certificate_status = EXCLUDED.certificate_status,
        provider_registered_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `, [
      therapistId, providerName, providerCompanyId,
      companyData.cnpj, companyData.companyName, 
      companyData.municipalRegistration, companyData.stateRegistration,
      companyData.email, companyData.phone, JSON.stringify(companyData.address),
      '14.01', 5.0, 'Serviços de psicoterapia',
      encryptedPassword, 'active'
    ]);

    return providerCompanyId;
  }

  /**
   * Generate NFS-e invoice
   */
  async generateInvoice(
    therapistId: number,
    sessionId: number | null,
    invoiceData: Partial<InvoiceData>
  ): Promise<InvoiceResult> {
    // Get therapist configuration
    const config = await this.getTherapistConfig(therapistId);
    if (!config) {
      throw new Error('Therapist NFS-e configuration not found');
    }

    const provider = this.providers.get(config.nfse_provider);
    if (!provider) {
      throw new Error(`Provider not configured: ${config.nfse_provider}`);
    }

    // Load certificate if available
    let certificate: Buffer | undefined;
    if (config.certificate_file_path) {
      // TODO: Implement certificate loading from secure storage
      // certificate = await this.loadCertificate(config.certificate_file_path);
    }

    // Prepare complete invoice data
    const completeInvoiceData: InvoiceData = {
      providerCompanyId: config.provider_company_id,
      certificate: certificate || Buffer.alloc(0), // TODO: Load actual certificate
      certificatePassword: config.certificate_password || '',
      recipient: invoiceData.recipient!,
      service: {
        description: invoiceData.service?.description || config.default_service_description,
        code: invoiceData.service?.code || config.default_service_code,
        amount: invoiceData.service?.amount || 0,
        taxRate: invoiceData.service?.taxRate || config.default_tax_rate,
      },
      invoiceNumber: await this.getNextInvoiceNumber(therapistId),
      invoiceSeries: config.invoice_series || '1',
    };

    try {
      // Generate invoice with provider
      const result = await provider.generateInvoice(completeInvoiceData);

      // Store invoice in database
      const invoiceId = await this.storeInvoice(therapistId, config.id, sessionId, completeInvoiceData, result);

      return {
        ...result,
        databaseId: invoiceId,
      };
    } catch (error) {
      // Store failed invoice attempt
      await this.storeFailedInvoice(therapistId, config.id, sessionId, completeInvoiceData, error);
      throw error;
    }
  }

  /**
   * Get next invoice number for therapist
   */
  private async getNextInvoiceNumber(therapistId: number): Promise<string> {
    const result = await pool.query(`
      UPDATE therapist_nfse_config 
      SET next_invoice_number = next_invoice_number + 1
      WHERE therapist_id = $1
      RETURNING next_invoice_number - 1 as current_number
    `, [therapistId]);

    if (result.rows.length === 0) {
      throw new Error('Therapist NFS-e configuration not found');
    }

    const invoiceNumber = result.rows[0].current_number;
    return invoiceNumber.toString().padStart(8, '0'); // Format: 00000001
  }

  /**
   * Store successful invoice in database
   */
  private async storeInvoice(
    therapistId: number,
    configId: number,
    sessionId: number | null,
    invoiceData: InvoiceData,
    result: InvoiceResult
  ): Promise<number> {
    const insertResult = await pool.query(`
      INSERT INTO nfse_invoices (
        therapist_id, nfse_config_id, session_id,
        nfse_provider, provider_invoice_id, provider_response,
        invoice_number, invoice_series, invoice_verification_code,
        municipal_invoice_number, invoice_amount, service_description,
        service_code, tax_rate, tax_amount,
        recipient_name, recipient_cpf, recipient_email,
        invoice_status, pdf_url, xml_url, issued_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING id
    `, [
      therapistId, configId, sessionId,
      result.providerInvoiceId.split('_')[0], // Extract provider name
      result.providerInvoiceId, JSON.stringify(result),
      result.invoiceNumber, invoiceData.invoiceSeries, result.verificationCode,
      result.municipalInvoiceNumber, result.amount, invoiceData.service.description,
      invoiceData.service.code, invoiceData.service.taxRate, result.taxAmount,
      invoiceData.recipient.name, invoiceData.recipient.cpf, invoiceData.recipient.email,
      result.status, result.pdfUrl, result.xmlUrl, result.issuedAt
    ]);

    return insertResult.rows[0].id;
  }

  /**
   * Store failed invoice attempt
   */
  private async storeFailedInvoice(
    therapistId: number,
    configId: number,
    sessionId: number | null,
    invoiceData: InvoiceData,
    error: any
  ): Promise<void> {
    await pool.query(`
      INSERT INTO nfse_invoices (
        therapist_id, nfse_config_id, session_id,
        nfse_provider, invoice_amount, service_description,
        service_code, tax_rate, recipient_name, recipient_cpf, recipient_email,
        invoice_status, error_message, retry_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [
      therapistId, configId, sessionId,
      'unknown', invoiceData.service.amount, invoiceData.service.description,
      invoiceData.service.code, invoiceData.service.taxRate,
      invoiceData.recipient.name, invoiceData.recipient.cpf, invoiceData.recipient.email,
      'error', error.message || error.toString(), 0
    ]);
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
    
    const provider = this.providers.get(config.nfse_provider);
    if (!provider) {
      throw new Error(`Provider not configured: ${config.nfse_provider}`);
    }

    const success = await provider.cancelInvoice(invoice.provider_invoice_id, reason);

    if (success) {
      await pool.query(`
        UPDATE nfse_invoices 
        SET invoice_status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, notes = $1
        WHERE id = $2
      `, [reason, invoiceId]);
    }

    return success;
  }
}

// Export singleton instance
export const nfseService = new NFSeService();