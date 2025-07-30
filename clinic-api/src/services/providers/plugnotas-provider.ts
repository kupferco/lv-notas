// clinic-api/src/services/providers/plugnotas-provider.ts

import { 
  NFSeProvider, 
  CompanyRegistration, 
  InvoiceRequest, 
  InvoiceResult, 
  InvoiceStatus, 
  CertificateValidation 
} from '../nfse-service.js';

export interface PlugNotasConfig {
  apiKey: string;
  apiUrl: string;
  sandbox: boolean;
}

export interface PlugNotasCompanyData {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  inscricaoMunicipal?: string;
  inscricaoEstadual?: string;
  endereco: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
  };
  contato: {
    telefone?: string;
    email: string;
  };
  regimeTributario: string; // 'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL'
  optanteSimplesNacional: boolean;
}

export interface PlugNotasInvoiceData {
  prestador: {
    cnpj: string;
    inscricaoMunicipal?: string;
  };
  tomador: {
    cnpj?: string;
    cpf?: string;
    razaoSocial?: string;
    email?: string;
    endereco?: {
      logradouro: string;
      numero: string;
      complemento?: string;
      bairro: string;
      cidade: string;
      uf: string;
      cep: string;
    };
  };
  servico: {
    codigoTributacaoMunicipio: string;
    discriminacao: string;
    valorServicos: number;
    aliquota?: number;
    issRetido?: boolean;
  };
}

export class PlugNotasProvider implements NFSeProvider {
  private config: PlugNotasConfig;
  private baseUrl: string;

  constructor(config: PlugNotasConfig) {
    this.config = config;
    this.baseUrl = config.sandbox 
      ? 'https://api.sandbox.plugnotas.com.br' 
      : 'https://api.plugnotas.com.br';
  }

  async registerCompany(data: CompanyRegistration): Promise<string> {
    try {
      console.log('Registering company with PlugNotas:', data.cnpj);

      // Convert our generic data to PlugNotas format
      const plugnotasData: PlugNotasCompanyData = {
        cnpj: data.cnpj,
        razaoSocial: data.companyName,
        nomeFantasia: data.tradeName || data.companyName,
        inscricaoMunicipal: data.municipalRegistration,
        inscricaoEstadual: data.stateRegistration,
        endereco: {
          logradouro: data.address.street,
          numero: data.address.number,
          complemento: data.address.complement,
          bairro: data.address.neighborhood,
          cidade: data.address.city,
          uf: data.address.state,
          cep: data.address.zipCode
        },
        contato: {
          telefone: data.phone,
          email: data.email
        },
        regimeTributario: data.taxRegime || 'SIMPLES_NACIONAL',
        optanteSimplesNacional: data.taxRegime === 'SIMPLES_NACIONAL'
      };

      const response = await this.makeRequest('POST', '/empresas', plugnotasData);
      
      if (response.id) {
        console.log('Company registered successfully:', response.id);
        return response.id;
      } else {
        throw new Error('Company registration failed: No ID returned');
      }
    } catch (error) {
      console.error('Error registering company with PlugNotas:', error);
      throw new Error(`Company registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateInvoice(companyId: string, data: InvoiceRequest): Promise<InvoiceResult> {
    try {
      console.log('Generating invoice with PlugNotas:', { companyId, invoiceData: data });

      // Convert our generic invoice data to PlugNotas format
      const plugnotasInvoice: PlugNotasInvoiceData = {
        prestador: {
          cnpj: data.providerCnpj,
          inscricaoMunicipal: data.providerMunicipalRegistration
        },
        tomador: {
          cpf: data.customerDocument?.length === 11 ? data.customerDocument : undefined,
          cnpj: data.customerDocument?.length === 14 ? data.customerDocument : undefined,
          razaoSocial: data.customerName,
          email: data.customerEmail,
          endereco: data.customerAddress ? {
            logradouro: data.customerAddress.street,
            numero: data.customerAddress.number,
            complemento: data.customerAddress.complement,
            bairro: data.customerAddress.neighborhood,
            cidade: data.customerAddress.city,
            uf: data.customerAddress.state,
            cep: data.customerAddress.zipCode
          } : undefined
        },
        servico: {
          codigoTributacaoMunicipio: data.serviceCode,
          discriminacao: data.serviceDescription,
          valorServicos: data.serviceValue,
          aliquota: data.taxRate,
          issRetido: data.taxWithheld || false
        }
      };

      const response = await this.makeRequest(
        'POST', 
        `/empresas/${companyId}/nfse`, 
        plugnotasInvoice
      );

      return {
        invoiceId: response.id,
        invoiceNumber: response.numero,
        status: this.mapStatus(response.status),
        pdfUrl: response.linkDownloadPdf,
        xmlUrl: response.linkDownloadXml,
        verificationCode: response.codigoVerificacao,
        accessKey: response.chaveAcesso,
        issueDate: new Date(response.dataEmissao),
        error: response.erro ? response.erro.mensagem : undefined
      };
    } catch (error) {
      console.error('Error generating invoice with PlugNotas:', error);
      throw new Error(`Invoice generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getInvoiceStatus(companyId: string, invoiceId: string): Promise<InvoiceStatus> {
    try {
      const response = await this.makeRequest(
        'GET', 
        `/empresas/${companyId}/nfse/${invoiceId}`
      );

      return {
        invoiceId: response.id,
        status: this.mapStatus(response.status),
        invoiceNumber: response.numero,
        pdfUrl: response.linkDownloadPdf,
        xmlUrl: response.linkDownloadXml,
        error: response.erro ? response.erro.mensagem : undefined,
        lastUpdated: new Date(response.dataAtualizacao || response.dataEmissao)
      };
    } catch (error) {
      console.error('Error getting invoice status from PlugNotas:', error);
      throw new Error(`Failed to get invoice status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async validateCertificate(certificate: Buffer, password: string): Promise<CertificateValidation> {
    try {
      // PlugNotas doesn't have a specific certificate validation endpoint,
      // but we can try to upload it temporarily to validate
      const base64Certificate = certificate.toString('base64');
      
      const response = await this.makeRequest('POST', '/certificados/validar', {
        certificado: base64Certificate,
        senha: password
      });

      return {
        isValid: response.valido || false,
        expiresAt: response.dataVencimento ? new Date(response.dataVencimento) : undefined,
        issuer: response.emissor,
        subject: response.titular,
        error: response.erro ? response.erro.mensagem : undefined
      };
    } catch (error) {
      console.error('Error validating certificate with PlugNotas:', error);
      return {
        isValid: false,
        error: `Certificate validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async cancelInvoice(companyId: string, invoiceId: string, reason: string): Promise<boolean> {
    try {
      const response = await this.makeRequest(
        'PUT', 
        `/empresas/${companyId}/nfse/${invoiceId}/cancelar`,
        { motivo: reason }
      );

      return response.cancelada === true;
    } catch (error) {
      console.error('Error canceling invoice with PlugNotas:', error);
      throw new Error(`Invoice cancellation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async makeRequest(method: string, endpoint: string, data?: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': this.config.apiKey,
      'User-Agent': 'LV-Notas/1.0'
    };

    console.log(`Making ${method} request to: ${url}`);
    if (data) {
      console.log('Request data:', JSON.stringify(data, null, 2));
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined
      });

      const responseText = await response.text();
      
      // Try to parse as JSON, but handle cases where it's not JSON
      let responseData: any;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { message: responseText };
      }

      console.log(`Response (${response.status}):`, responseData);

      if (!response.ok) {
        const errorMessage = responseData.erro?.mensagem || 
          responseData.message || 
          responseData.errors?.[0]?.message ||
          `HTTP ${response.status}: ${response.statusText}`;
        
        throw new Error(errorMessage);
      }

      return responseData;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to PlugNotas API');
      }
      throw error;
    }
  }

  private mapStatus(plugnotasStatus: string): 'pending' | 'processing' | 'issued' | 'cancelled' | 'error' {
    const statusMap: Record<string, 'pending' | 'processing' | 'issued' | 'cancelled' | 'error'> = {
      'aguardando_processamento': 'pending',
      'processando': 'processing',
      'autorizada': 'issued',
      'emitida': 'issued',
      'cancelada': 'cancelled',
      'rejeitada': 'error',
      'erro': 'error'
    };

    return statusMap[plugnotasStatus?.toLowerCase()] || 'error';
  }

  // Helper method for testing connectivity
  async testConnection(): Promise<boolean> {
    try {
      await this.makeRequest('GET', '/empresas');
      return true;
    } catch (error) {
      console.error('PlugNotas connection test failed:', error);
      return false;
    }
  }

  // Get available service codes for São Paulo
  async getServiceCodes(cityCode?: string): Promise<Array<{code: string, description: string}>> {
    try {
      const response = await this.makeRequest('GET', '/codigos-servico', {
        municipio: cityCode || '3550308' // São Paulo city code
      });

      return response.map((item: any) => ({
        code: item.codigo,
        description: item.descricao
      }));
    } catch (error) {
      console.warn('Failed to fetch service codes, using defaults:', error);
      // Return common therapy service codes as fallback
      return [
        { code: '14.01', description: 'Serviços de Psicologia e Psicanálise' },
        { code: '14.13', description: 'Terapias de Qualquer Espécie Destinadas ao Tratamento Físico, Mental e Espiritual' }
      ];
    }
  }
}