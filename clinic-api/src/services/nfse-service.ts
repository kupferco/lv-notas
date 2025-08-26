// clinic-api/src/services/nfse-service.ts
// NFS-e service layer using Focus NFe

import pool from '../config/database.js';
import { FocusNFeProvider } from './providers/focus-nfe-provider.js';
import { CertificateStorageService, EncryptionService } from '../utils/encryption.js';

// Types for NFS-e operations
export interface NFSeProvider {
  registerCompany(companyData: CompanyRegistration): Promise<string>;
  generateInvoice(companyId: string, data: InvoiceRequest, certificateData?: { buffer: Buffer, password: string }): Promise<InvoiceResult>;
  getInvoiceStatus(companyId: string, invoiceId: string): Promise<InvoiceStatus>;
  validateCertificate(certificate: Buffer, password: string): Promise<CertificateValidation>;
  cancelInvoice?(companyId: string, invoiceId: string, reason: string): Promise<boolean>;
  testConnection?(): Promise<boolean>;
  getServiceCodes?(cityCode?: string): Promise<Array<{ code: string, description: string }>>;
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
  providerCityCode?: string; // NEW (IBGE, e.g. "3550308")
  customerName: string;
  customerEmail?: string;
  customerDocument?: string; // CPF (11) or CNPJ (14)
  customerAddress?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city?: string;     // optional free-text
    state: string;
    zipCode: string;
    cityCode?: string; // NEW (IBGE)
  };
  serviceCode: string;            // maps to codigo_tributario_municipio
  itemListaServico?: string;      // NEW (ABRASF), e.g. "1401"
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
  databaseId?: number;
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
  private provider: NFSeProvider;

  constructor() {
    this.provider = this.initializeProvider();
  }

  private initializeProvider(): NFSeProvider {
    // Initialize Focus NFe provider
    const focusNFeConfig = {
      apiKey: process.env.FOCUS_NFE_API_KEY || '',
      apiUrl: process.env.FOCUS_NFE_API_URL || 'https://api.focusnfe.com.br',
      sandbox: process.env.FOCUS_NFE_SANDBOX === 'true'
    };

    if (!focusNFeConfig.apiKey) {
      throw new Error('Focus NFe API key not configured. Please set FOCUS_NFE_API_KEY environment variable.');
    }

    const provider = new FocusNFeProvider(focusNFeConfig);
    console.log('✅ Focus NFe provider initialized');
    console.log(`🔧 Mode: ${focusNFeConfig.sandbox ? 'SANDBOX' : 'PRODUCTION'}`);

    return provider;
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
   * Create or update therapist's NFS-e configuration
   */
  async updateTherapistConfig(therapistId: number, configData: {
    nfse_provider?: string;
    provider_company_id?: string;
    company_cnpj?: string;
    company_name?: string;
    company_email?: string;
    company_phone?: string;
    company_municipal_registration?: string;
    company_state_registration?: string;
    company_address?: object;
    default_service_code?: string;
    default_tax_rate?: number;
    default_service_description?: string;
    auto_generate_invoices?: boolean;
    send_email_to_patient?: boolean;
  }): Promise<any> {
    const existing = await this.getTherapistConfig(therapistId);

    if (existing) {
      // Update existing configuration
      const result = await pool.query(`
  UPDATE therapist_nfse_config 
  SET provider_company_id = $2, company_cnpj = $3,
      company_name = $4, company_email = $5, company_phone = $6,
      company_municipal_registration = $7, company_state_registration = $8,
      company_address = $9, default_service_code = $10, default_tax_rate = $11,
      default_service_description = $12, auto_generate_invoices = $13,
      send_email_to_patient = $14, updated_at = CURRENT_TIMESTAMP
  WHERE therapist_id = $1 
  RETURNING *
`, [
        therapistId,
        // REMOVED: configData.nfse_provider || 'focus_nfe',
        configData.provider_company_id || configData.company_cnpj,
        configData.company_cnpj, configData.company_name, configData.company_email,
        configData.company_phone, configData.company_municipal_registration,
        configData.company_state_registration, JSON.stringify(configData.company_address || {}),
        configData.default_service_code || '14.01', configData.default_tax_rate || 5.0,
        configData.default_service_description || 'Serviços de psicoterapia',
        configData.auto_generate_invoices !== undefined ? configData.auto_generate_invoices : false,
        configData.send_email_to_patient !== undefined ? configData.send_email_to_patient : true
      ]);
      return result.rows[0];
    } else {
      // Create new configuration
      const result = await pool.query(`
  INSERT INTO therapist_nfse_config (
    therapist_id, provider_company_id, company_cnpj,
    company_name, company_email, company_phone, company_municipal_registration,
    company_state_registration, company_address, default_service_code,
    default_tax_rate, default_service_description, auto_generate_invoices,
    send_email_to_patient
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
  RETURNING *
`, [
        therapistId,
        configData.provider_company_id || configData.company_cnpj,
        configData.company_cnpj, configData.company_name, configData.company_email,
        configData.company_phone, configData.company_municipal_registration,
        configData.company_state_registration, JSON.stringify(configData.company_address || {}),
        configData.default_service_code || '14.01', configData.default_tax_rate || 5.0,
        configData.default_service_description || 'Serviços de psicoterapia',
        configData.auto_generate_invoices !== undefined ? configData.auto_generate_invoices : false,
        configData.send_email_to_patient !== undefined ? configData.send_email_to_patient : true
      ]);
      return result.rows[0];
    }
  }

  /**
   * Register company with Focus NFe (automatic - uses CNPJ as ID)
   */
  async registerCompany(therapistId: number, companyData: CompanyRegistration): Promise<string> {
    console.log(`Registering company with Focus NFe for therapist ${therapistId}`);

    const companyId = await this.provider.registerCompany(companyData);

    // Update therapist config with company ID
    await this.updateTherapistConfig(therapistId, {
      provider_company_id: companyId,
      company_cnpj: companyData.cnpj,
      company_name: companyData.companyName,
      company_email: companyData.email,
      company_phone: companyData.phone,
      company_municipal_registration: companyData.municipalRegistration,
      company_state_registration: companyData.stateRegistration,
      company_address: companyData.address
    });

    return companyId;
  }

  /**
   * Generate NFS-e invoice
   */
  async generateInvoice(therapistId: number, invoiceData: InvoiceRequest): Promise<InvoiceResult> {
    const config = await this.getTherapistConfig(therapistId);
    if (!config) {
      throw new Error('Therapist NFS-e configuration not found. Please configure NFS-e settings first.');
    }

    const companyId = config.provider_company_id || config.company_cnpj;
    if (!companyId) {
      throw new Error('Company not registered with Focus NFe. Please complete NFS-e setup first.');
    }

    // Retrieve certificate if available
    let certificateData: { buffer: Buffer, password: string } | undefined;

    if (config.certificate_file_path && config.certificate_password_encrypted) {
      try {
        const encryptedPassword = JSON.parse(config.certificate_password_encrypted);
        const { certificateBuffer, password } = await CertificateStorageService.retrieveCertificate(
          config.certificate_file_path,
          encryptedPassword
        );

        certificateData = { buffer: certificateBuffer, password };
        console.log('Using stored certificate for invoice generation');
      } catch (error) {
        console.error('Failed to retrieve certificate:', error);
        throw new Error('Certificate retrieval failed. Please re-upload your certificate.');
      }
    }

    console.log(`Generating invoice with Focus NFe for therapist ${therapistId}`);

    // Generate invoice with Focus NFe using certificate
    const result = await this.provider.generateInvoice(companyId, invoiceData, certificateData);

    // Store invoice in database if successful
    if (result.status !== 'error') {
      try {
        const dbResult = await pool.query(`
        INSERT INTO nfse_invoices (
          therapist_id, provider_used, provider_invoice_id,
          invoice_number, invoice_amount, service_description, service_code,
          tax_rate, recipient_name, recipient_email, invoice_status,
          pdf_url, xml_url, provider_response, issued_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id
      `, [
          therapistId, 'focus_nfe', result.invoiceId,
          result.invoiceNumber, invoiceData.serviceValue, invoiceData.serviceDescription,
          invoiceData.serviceCode, invoiceData.taxRate, invoiceData.customerName,
          invoiceData.customerEmail, result.status, result.pdfUrl, result.xmlUrl,
          JSON.stringify(result), result.issueDate
        ]);

        result.databaseId = dbResult.rows[0].id;
        console.log(`Invoice stored in database with ID: ${result.databaseId}`);
      } catch (error) {
        console.error('Error storing invoice in database:', error);
      }
    }

    return result;
  }

  /**
   * Generate test invoice (sandbox mode)
   */
  async generateTestInvoice(therapistId: number, invoiceData: InvoiceRequest): Promise<InvoiceResult> {
    console.log(`🧪 Generating TEST invoice with Focus NFe for therapist ${therapistId}`);
    return await this.generateInvoice(therapistId, invoiceData);
  }

  /**
   * Get invoice status from Focus NFe
   */
  async getInvoiceStatus(invoiceId: number, therapistId: number): Promise<InvoiceStatus> {
    // Get invoice from database
    const invoice = await this.getInvoice(invoiceId, therapistId);
    const config = await this.getTherapistConfig(therapistId);

    if (!config) {
      throw new Error('Therapist NFS-e configuration not found');
    }

    console.log(`Getting invoice status from Focus NFe for invoice ${invoiceId}`);
    const status = await this.provider.getInvoiceStatus(
      config.provider_company_id || config.company_cnpj,
      invoice.provider_invoice_id
    );

    // Update database with latest status
    if (status.status !== invoice.invoice_status) {
      await pool.query(`
        UPDATE nfse_invoices 
        SET invoice_status = $1, pdf_url = $2, xml_url = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
      `, [status.status, status.pdfUrl || invoice.pdf_url, status.xmlUrl || invoice.xml_url, invoiceId]);

      console.log(`📋 Invoice ${invoiceId} status updated: ${invoice.invoice_status} → ${status.status}`);
    }

    return status;
  }

  /**
   * Validate certificate with Focus NFe
   */
  async validateCertificate(certificate: Buffer, password: string): Promise<CertificateValidation> {
    console.log('🔍 Validating certificate with Focus NFe');
    return await this.provider.validateCertificate(certificate, password);
  }

  /**
   * Test Focus NFe connection
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔗 Testing Focus NFe connection...');
      const result = this.provider.testConnection ? await this.provider.testConnection() : false;
      console.log(`🔗 Focus NFe connection test: ${result ? '✅ SUCCESS' : '❌ FAILED'}`);
      return result;
    } catch (error) {
      console.error('❌ Focus NFe connection test failed:', error);
      return false;
    }
  }

  /**
   * Get available service codes from Focus NFe
   */
  async getServiceCodes(cityCode?: string): Promise<Array<{ code: string, description: string }>> {
    console.log('📋 Getting service codes from Focus NFe');

    if (!this.provider.getServiceCodes) {
      // Return default therapy service codes
      return [
        { code: '14.01', description: 'Serviços de Psicologia e Psicanálise' },
        { code: '14.13', description: 'Terapias de Qualquer Espécie Destinadas ao Tratamento Físico, Mental and Espiritual' }
      ];
    }

    return await this.provider.getServiceCodes(cityCode);
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
   * Cancel invoice with Focus NFe
   */
  async cancelInvoice(invoiceId: number, therapistId: number, reason: string): Promise<boolean> {
    const invoice = await this.getInvoice(invoiceId, therapistId);
    const config = await this.getTherapistConfig(therapistId);

    if (!config) {
      throw new Error('Therapist NFS-e configuration not found');
    }

    if (!this.provider.cancelInvoice) {
      throw new Error('Invoice cancellation not supported by Focus NFe');
    }

    console.log(`🗑️ Canceling invoice ${invoiceId} with Focus NFe`);
    const success = await this.provider.cancelInvoice(
      config.provider_company_id || config.company_cnpj,
      invoice.provider_invoice_id,
      reason
    );

    if (success) {
      await pool.query(`
        UPDATE nfse_invoices 
        SET invoice_status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [invoiceId]);

      console.log(`✅ Invoice ${invoiceId} cancelled successfully`);
    }

    return success;
  }

  /**
   * Get provider information
   */
  getProviderInfo(): { name: string, displayName: string, configured: boolean } {
    return {
      name: 'focus_nfe',
      displayName: 'Focus NFe',
      configured: !!process.env.FOCUS_NFE_API_KEY
    };
  }
}

// Export singleton instance
export const nfseService = new NFSeService();