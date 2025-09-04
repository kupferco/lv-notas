// clinic-api/src/services/nfse-service.ts

import pool from '../config/database.js';
import { FocusNFeProvider } from './providers/focus-nfe-provider.js';
import { SessionSnapshot } from './monthly-billing.js';

// Keep existing interfaces but simplify implementation
export interface NFSeProvider {
  registerCompany(companyData: CompanyRegistration, certificateData?: { buffer: Buffer, password: string }): Promise<string>;
  generateInvoice(companyId: string, data: InvoiceRequest, customReference?: string): Promise<InvoiceResult>;
  getInvoiceStatus(companyId: string, invoiceId: string): Promise<InvoiceStatus>;
  getCompanyData(cnpj: string): Promise<CompanyData>;
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
    cityCode?: string;
  };
}

export interface CompanyData {
  cnpj: string;
  companyName: string;
  tradeName?: string;
  email: string;
  phone?: string;
  municipalRegistration?: string;
  stateRegistration?: string;
  expiresAt: string;
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    cityCode?: string;
  };
  tokens?: {
    production?: string;
    sandbox?: string;
  };
  proximo_numero_nfse_producao?: string;
  proximo_numero_nfse_homologacao?: string;

}

export interface InvoiceRequest {
  providerCnpj: string;
  providerMunicipalRegistration?: string;
  providerCityCode?: string;
  customerName: string;
  customerEmail?: string;
  customerDocument?: string;
  customerAddress?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city?: string;
    state: string;
    zipCode: string;
    cityCode?: string;
  };
  serviceCode: string;
  abrasfServiceCode?: string;
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
  cnpj?: string;
  companyName?: string;
}

/**
 * Simplified NFS-e Service
 * PRINCIPLE: Focus NFe stores company data, we only store CNPJ + preferences
 */
export class NFSeService {
  private provider: NFSeProvider;

  constructor() {
    this.provider = this.initializeProvider();
  }

  private initializeProvider(): NFSeProvider {
    const focusNFeConfig = {
      apiKey: process.env.FOCUS_NFE_MASTER_TOKEN || '',
      apiUrl: process.env.FOCUS_NFE_SANDBOX === 'true'
        ? process.env.FOCUS_NFE_API_URL_HOMOLOGACAO || ''
        : process.env.FOCUS_NFE_API_URL_PROD || '',
      sandbox: process.env.FOCUS_NFE_SANDBOX === 'true'
    };

    if (!focusNFeConfig.apiKey) {
      throw new Error('Focus NFe master token not configured. Please set FOCUS_NFE_MASTER_TOKEN environment variable.');
    }

    const provider = new FocusNFeProvider(focusNFeConfig);
    console.log('Focus NFe provider initialized');
    console.log(`Mode: ${focusNFeConfig.sandbox ? 'SANDBOX' : 'PRODUCTION'}`);

    return provider;
  }

  /**
   * Get therapist's minimal NFS-e configuration (CNPJ + preferences only)
   */
  async getTherapistConfig(therapistId: number): Promise<any> {
    const result = await pool.query(
      'SELECT * FROM therapist_nfse_config WHERE therapist_id = $1 AND is_active = true',
      [therapistId]
    );

    return result.rows[0] || null;
  }

  /**
   * Create or update therapist's NFS-e configuration (minimal data only)
   */
  async updateTherapistConfig(therapistId: number, configData: {
    company_cnpj: string;
    focus_nfe_company_id?: string,
    certificate_uploaded?: boolean;
    service_code?: string;
    tax_rate?: number;
    service_description?: string;
    send_email_to_patient?: boolean;
    include_session_details?: boolean;
  }): Promise<any> {
    const existing = await this.getTherapistConfig(therapistId);

    if (existing) {
      // Update existing - only update provided fields
      const updates: string[] = [];
      const values: any[] = [therapistId];
      let paramCount = 1;

      if (configData.company_cnpj !== undefined) {
        updates.push(`company_cnpj = $${++paramCount}`);
        values.push(configData.company_cnpj);
      }

      if (configData.focus_nfe_company_id !== undefined) {
        updates.push(`focus_nfe_company_id = $${++paramCount}`);
        values.push(configData.focus_nfe_company_id);
      }

      if (configData.certificate_uploaded !== undefined) {
        updates.push(`certificate_uploaded = $${++paramCount}`);
        values.push(configData.certificate_uploaded);
        if (configData.certificate_uploaded) {
          updates.push(`certificate_uploaded_at = CURRENT_TIMESTAMP`);
        }
      }

      if (configData.service_code !== undefined) {
        updates.push(`service_code = $${++paramCount}`);
        values.push(configData.service_code);
      }

      if (configData.tax_rate !== undefined) {
        updates.push(`tax_rate = $${++paramCount}`);
        values.push(configData.tax_rate);
      }

      if (configData.service_description !== undefined) {
        updates.push(`service_description = $${++paramCount}`);
        values.push(configData.service_description);
      }

      if (configData.send_email_to_patient !== undefined) {
        updates.push(`send_email_to_patient = $${++paramCount}`);
        values.push(configData.send_email_to_patient);
      }

      if (configData.include_session_details !== undefined) {
        updates.push(`include_session_details = $${++paramCount}`);
        values.push(configData.include_session_details);
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');

      const result = await pool.query(`
        UPDATE therapist_nfse_config 
        SET ${updates.join(', ')}
        WHERE therapist_id = $1 
        RETURNING *
      `, values);

      return result.rows[0];
    } else {
      // Create new configuration with minimal required data
      const result = await pool.query(`
        INSERT INTO therapist_nfse_config (
          therapist_id, company_cnpj, certificate_uploaded,
          service_code, tax_rate, service_description,
          send_email_to_patient, include_session_details
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        therapistId,
        configData.company_cnpj,
        configData.certificate_uploaded || false,
        configData.service_code || '07498',
        configData.tax_rate || 2.0,
        configData.service_description || 'Sessão de psicoterapia',
        configData.send_email_to_patient !== undefined ? configData.send_email_to_patient : true,
        configData.include_session_details !== undefined ? configData.include_session_details : true
      ]);

      return result.rows[0];
    }
  }

  /**
   * Update only therapist settings (not CNPJ - for settings endpoint)
   * FIXED: Use correct column names from schema
   */
  async updateTherapistSettings(therapistId: number, settings: {
    service_code?: string;
    tax_rate?: number;
    service_description?: string;
    send_email_to_patient?: boolean;
    include_session_details?: boolean;
  }): Promise<any> {
    const updates: string[] = [];
    const values: any[] = [therapistId];
    let paramCount = 1;

    if (settings.service_code !== undefined) {
      updates.push(`service_code = $${++paramCount}`);
      values.push(settings.service_code);
    }

    if (settings.tax_rate !== undefined) {
      updates.push(`tax_rate = $${++paramCount}`);
      values.push(settings.tax_rate);
    }

    if (settings.service_description !== undefined) {
      updates.push(`service_description = $${++paramCount}`);
      values.push(settings.service_description);
    }

    if (settings.send_email_to_patient !== undefined) {
      updates.push(`send_email_to_patient = $${++paramCount}`);
      values.push(settings.send_email_to_patient);
    }

    if (settings.include_session_details !== undefined) {
      updates.push(`include_session_details = $${++paramCount}`);
      values.push(settings.include_session_details);
    }

    if (updates.length === 0) {
      throw new Error('No settings provided to update');
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');

    const result = await pool.query(`
    UPDATE therapist_nfse_config 
    SET ${updates.join(', ')}
    WHERE therapist_id = $1 
    RETURNING *
  `, values);

    if (result.rows.length === 0) {
      throw new Error('Therapist not found or not configured for NFS-e');
    }

    return result.rows[0];
  }

  /**
   * Register company with Focus NFe and store only CNPJ locally
   */
  async registerCompany(therapistId: number, companyData: CompanyRegistration, certificateData?: { buffer: Buffer, password: string }): Promise<string> {
    console.log(`Registering company with Focus NFe for therapist ${therapistId}`);

    // Register with Focus NFe (they store all the company data)
    const companyId = await this.provider.registerCompany(companyData, certificateData);

    // Store only the CNPJ and certificate status locally
    await this.updateTherapistConfig(therapistId, {
      company_cnpj: companyData.cnpj,
      focus_nfe_company_id: companyId,
      certificate_uploaded: !!certificateData
    });

    console.log(`Company registered - CNPJ ${companyData.cnpj} stored locally for therapist ${therapistId}`);
    return companyId;
  }

  /**
   * Get fresh company data from Focus NFe (single source of truth)
   */
  async getCompanyData(therapistId: number): Promise<CompanyData> {
    const config = await this.getTherapistConfig(therapistId);
    if (!config) {
      throw new Error('Therapist NFS-e configuration not found.');
    }

    console.log(`Fetching fresh company data from Focus NFe for CNPJ: ${config.company_cnpj}`);
    return await this.provider.getCompanyData(config.company_cnpj);
  }

  /**
   * Generate next invoice reference
   */
  async getNextInvoiceRef(therapistId: number): Promise<{ ref: string, refNumber: number }> {
    const result = await pool.query(
      'SELECT ref, ref_number FROM get_next_invoice_ref($1)',
      [therapistId]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to generate invoice reference. Therapist may not be configured for NFS-e.');
    }

    return {
      ref: result.rows[0].ref,
      refNumber: result.rows[0].ref_number
    };
  }

  /**
   * Generate NFS-e invoice for sessions (simplified - no local certificates)
   */
  async generateInvoiceForSessions(
    therapistId: number,
    patientId: number,
    year: number,
    month: number,
    sessionIds?: number[]
  ): Promise<InvoiceResult> {
    const config = await this.getTherapistConfig(therapistId);
    if (!config) {
      throw new Error('Therapist NFS-e configuration not found. Please configure NFS-e settings first.');
    }

    if (!config.certificate_uploaded) {
      throw new Error('Certificate not uploaded. Please upload certificate first.');
    }

    // Get fresh company data from Focus NFe
    const companyData = await this.getCompanyData(therapistId);

    // Get billing period data with complete patient information including address
    const billingResult = await pool.query(
      `SELECT 
            bp.*,
            p.nome as patient_name,
            p.email as patient_email,
            p.cpf as patient_cpf,
            -- Address fields
            p.endereco_rua,
            p.endereco_numero,
            p.endereco_bairro,
            p.endereco_codigo_municipio,
            p.endereco_uf,
            p.endereco_cep,
            -- Personal info fields (in case needed for customer data)
            p.data_nascimento,
            p.genero,
            p.contato_emergencia_nome,
            p.contato_emergencia_telefone
        FROM monthly_billing_periods bp
        JOIN patients p ON bp.patient_id = p.id
        WHERE bp.therapist_id = $1 
            AND bp.patient_id = $2 
            AND bp.billing_year = $3 
            AND bp.billing_month = $4
            AND bp.status != 'void'`,
      [therapistId, patientId, year, month]
    );

    if (billingResult.rows.length === 0) {
      throw new Error(`No billing period found for patient ${patientId} in ${month}/${year}`);
    }

    const billingPeriod = billingResult.rows[0];
    let sessionSnapshots = billingPeriod.session_snapshots || [];
    let totalAmount = billingPeriod.total_amount;

    // Filter sessions if specific IDs provided
    if (sessionIds && sessionIds.length > 0) {
      const originalCount = sessionSnapshots.length;
      if (sessionIds.length < sessionSnapshots.length) {
        sessionSnapshots = sessionSnapshots.slice(0, sessionIds.length);
        const pricePerSession = totalAmount / originalCount;
        totalAmount = pricePerSession * sessionSnapshots.length;
      }
    }

    // FIXED: Get next invoice reference from Focus NFE
    const isProduction = process.env.FOCUS_NFE_SANDBOX !== 'true';
    // const { ref: internalRef, refNumber } = await this.getNextInvoiceRef(therapistId);
    // const companyData = await this.getCompanyData(therapistId);

    const nextRps = isProduction
      ? companyData.proximo_numero_nfse_producao
      : companyData.proximo_numero_nfse_homologacao;

    const internalRef = `LV-${companyData.cnpj}-${nextRps}`;
    const refNumber = nextRps;

    console.log(`Generated invoice reference: ${internalRef} (number: ${refNumber})`);

    // Build service description
    const serviceDescription = this.buildSessionsDescription(sessionSnapshots, totalAmount, config);

    // Build customer address object from patient data (use empty strings as fallbacks)
    const customerAddress = {
      street: billingPeriod.endereco_rua || '',
      number: billingPeriod.endereco_numero || '',
      neighborhood: billingPeriod.endereco_bairro || '',
      cityCode: billingPeriod.endereco_codigo_municipio || '',
      state: billingPeriod.endereco_uf || '',
      zipCode: billingPeriod.endereco_cep || ''
    };

    // Build invoice data using fresh company data
    const invoiceData: InvoiceRequest = {
      providerCnpj: companyData.cnpj,
      providerMunicipalRegistration: companyData.municipalRegistration,
      providerCityCode: companyData.address?.cityCode || '3550308',

      customerName: billingPeriod.patient_name,
      customerEmail: billingPeriod.patient_email,
      customerDocument: billingPeriod.patient_cpf,
      customerAddress: customerAddress,

      // FIXED: Use municipal service code (not ABRASF)
      serviceCode: config.service_code || '05118',  // Municipal code for São Paulo psychology
      abrasfServiceCode: config.abrasf_service_code || '416', // Keep ABRASF for compatibility 
      serviceDescription,
      serviceValue: totalAmount / 100, // Convert cents to reais
      taxRate: config.tax_rate || 2.0,
      taxWithheld: false,
      sessionDate: new Date()
    };

    console.log('Invoice Data:', invoiceData);
    console.log('Customer Address:', customerAddress);

    // (THIS COMMENTED METHOD BELOW STOPS THE INVOICE GENERATION – used for checking the payload wihtout creating anything)
    // return {
    //   invoiceId: 'asdsa',
    //   invoiceNumber: '213',
    //   status: 'pending',
    //   pdfUrl: 'asdsad',
    //   xmlUrl: 'asdsad',
    //   verificationCode: 'sadas',
    //   accessKey: 'sadas',
    //   issueDate: new Date(),
    //   error: 'sadas',
    //   databaseId: 44
    // };

    console.log(`Generating invoice ${internalRef} - Therapist: ${therapistId}, Patient: ${patientId}, Period: ${month}/${year}`);

    // FIXED: Pass the internal reference to the provider
    const result = await this.provider.generateInvoice(companyData.cnpj, invoiceData, internalRef);

    // Store invoice record in our database for audit trail
    if (result.status !== 'error' || true) {
      try {
        const periodStart = new Date(year, month - 1, 1);
        const periodEnd = new Date(year, month, 0);

        const dbResult = await pool.query(`
  INSERT INTO nfse_invoices (
    therapist_id, patient_id, internal_ref, ref_number, provider_reference,
    billing_period_id, invoice_date, amount, service_description, session_count,
    patient_name, patient_document, patient_document_type, patient_email,
    provider_status, provider_invoice_id, invoice_number, status,
    pdf_url, xml_url, error_message, provider_response, issued_at
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
  RETURNING id
`, [
          therapistId, patientId, internalRef, refNumber, internalRef,
          billingPeriod.id, new Date(), totalAmount / 100, serviceDescription, sessionSnapshots.length,
          billingPeriod.patient_name,
          billingPeriod.patient_cpf,
          billingPeriod.patient_cpf?.length === 11 ? 'cpf' : 'cnpj',
          billingPeriod.patient_email,
          result.status, result.invoiceId, result.invoiceNumber, result.status,
          result.pdfUrl, result.xmlUrl,
          result.error,
          JSON.stringify(result), result.issueDate
        ]);

        result.databaseId = dbResult.rows[0].id;

        console.log(`Invoice ${internalRef} stored in database with ID: ${result.databaseId}, Status: ${result.status}`);
      } catch (error) {
        console.error('Error storing invoice in database:', error);
      }
    }

    return result;
  }

  /**
   * Build service description listing all session dates
   */
  private buildSessionsDescription(
    sessionSnapshots: SessionSnapshot[],
    totalAmountCents: number,
    therapistConfig: any
  ): string {
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatCurrency = (cents: number) => {
      return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
    };

    let description = 'Serviços de psicoterapia realizados ';

    if (sessionSnapshots.length === 1) {
      description += `na seguinte data:\n`;
      description += `- ${formatDate(sessionSnapshots[0].date)}\n`;
    } else {
      description += `nas seguintes datas:\n`;
      sessionSnapshots.forEach(session => {
        description += `- ${formatDate(session.date)}\n`;
      });
      description += `\nTotal de sessões: ${sessionSnapshots.length}\n`;
    }

    description += `Valor total: ${formatCurrency(totalAmountCents)}`;

    // Append custom service description from therapist settings
    if (therapistConfig.service_description && therapistConfig.service_description.trim()) {
      description += `\n\n${therapistConfig.service_description.trim()}`;
    }

    return description;
  }

  /**
   * Get invoice status (fetch latest from Focus NFe and update our record)
   */
  async getInvoiceStatus(invoiceId: number, therapistId: number): Promise<InvoiceStatus> {
    const invoice = await this.getInvoice(invoiceId, therapistId);
    const config = await this.getTherapistConfig(therapistId);

    if (!config) {
      throw new Error('Therapist NFS-e configuration not found');
    }

    console.log(`Getting fresh invoice status from Focus NFe for invoice ${invoiceId}`);
    const status = await this.provider.getInvoiceStatus(
      config.company_cnpj,
      invoice.provider_reference
    );

    // Update our record with latest status if it changed
    if (status.status !== invoice.status ||
      status.pdfUrl !== invoice.pdf_url ||
      status.xmlUrl !== invoice.xml_url) {

      await pool.query(`
        UPDATE nfse_invoices 
        SET status = $1, provider_status = $2, pdf_url = $3, xml_url = $4, 
            invoice_number = $5, error_message = $6, updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
      `, [
        status.status,
        status.status,
        status.pdfUrl || invoice.pdf_url,
        status.xmlUrl || invoice.xml_url,
        status.invoiceNumber || invoice.invoice_number,
        status.error,
        invoiceId
      ]);

      console.log(`Updated local invoice record ${invoiceId} with latest status: ${status.status}`);
    }

    return status;
  }

  async validateCertificate(certificate: Buffer, password: string): Promise<CertificateValidation> {
    console.log('Validating certificate with Focus NFe');
    return await this.provider.validateCertificate(certificate, password);
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing Focus NFe connection...');
      const result = this.provider.testConnection ? await this.provider.testConnection() : false;
      console.log(`Focus NFe connection test: ${result ? 'SUCCESS' : 'FAILED'}`);
      return result;
    } catch (error) {
      console.error('Focus NFe connection test failed:', error);
      return false;
    }
  }

  async getServiceCodes(cityCode?: string): Promise<Array<{ code: string, description: string }>> {
    if (!this.provider.getServiceCodes) {
      return [
        { code: '07498', description: 'Serviços de Psicologia e Psicanálise' },
        { code: '14.13', description: 'Terapias de Qualquer Espécie Destinadas ao Tratamento Físico, Mental e Espiritual' }
      ];
    }

    return await this.provider.getServiceCodes(cityCode);
  }

  async getTherapistInvoices(
    therapistId: number,
    startDate?: Date,
    endDate?: Date,
    status?: string
  ): Promise<any[]> {
    let query = 'SELECT * FROM nfse_invoices WHERE therapist_id = $1 AND status != $2';
    const params: any[] = [therapistId, 'superseded'];
    let paramCount = 2;

    if (startDate) {
      query += ` AND created_at >= $${++paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND created_at <= $${++paramCount}`;
      params.push(endDate);
    }

    if (status) {
      query += ` AND status = $${++paramCount}`;
      params.push(status);
    }

    query += ' ORDER BY ref_number DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

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

  async cancelInvoice(invoiceId: number, therapistId: number, reason: string): Promise<boolean> {
    const invoice = await this.getInvoice(invoiceId, therapistId);
    const config = await this.getTherapistConfig(therapistId);

    if (!config) {
      throw new Error('Therapist NFS-e configuration not found');
    }

    if (!this.provider.cancelInvoice) {
      throw new Error('Invoice cancellation not supported by Focus NFe');
    }

    console.log(`Canceling invoice ${invoiceId} with Focus NFe`);
    const success = await this.provider.cancelInvoice(
      config.company_cnpj,
      invoice.provider_reference,
      reason
    );

    if (success) {
      await pool.query(`
        UPDATE nfse_invoices 
        SET status = 'cancelled', cancellation_reason = $2, cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [invoiceId, reason]);
    }

    return success;
  }

  getProviderInfo(): { name: string, displayName: string, configured: boolean } {
    return {
      name: 'focus_nfe',
      displayName: 'Focus NFe',
      configured: !!process.env.FOCUS_NFE_MASTER_TOKEN
    };
  }

  /**
   * Check pending invoices and update their status via polling
   */
  async checkPendingInvoices(): Promise<void> {
    try {
      console.log('Checking pending invoices...');

      // Get processing invoices from the last 24 hours
      const result = await pool.query(`
      SELECT id, therapist_id, internal_ref FROM nfse_invoices 
      WHERE status = 'processing' 
      AND created_at > NOW() - INTERVAL '24 hours'
    `);

      console.log(`Found ${result.rows.length} processing invoices`);

      for (const invoice of result.rows) {
        try {
          // Call the same endpoint webhooks will call
          const response = await fetch('http://localhost:3000/api/nfse/invoice-status-update', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': process.env.SAFE_PROXY_KEY || ''
            },
            body: JSON.stringify({
              invoiceId: invoice.id,
              therapistId: invoice.therapist_id,
              source: 'polling'
            })
          });

          if (!response.ok) {
            console.error(`Failed to update invoice ${invoice.internal_ref}: ${response.status}`);
          } else {
            console.log(`Updated invoice ${invoice.internal_ref} via polling`);
          }
        } catch (error) {
          console.error(`Error updating invoice ${invoice.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error checking pending invoices:', error);
    }
  }
}

// Export singleton instance
export const nfseService = new NFSeService();