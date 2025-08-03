// clinic-api/src/services/providers/focus-nfe-provider.ts

import {
    NFSeProvider,
    CompanyRegistration,
    InvoiceRequest,
    InvoiceResult,
    InvoiceStatus,
    CertificateValidation
} from '../nfse-service.js';

export interface FocusNFeConfig {
    apiKey: string;
    apiUrl: string;
    sandbox: boolean;
}

export interface FocusNFeCompanyData {
    cnpj: string;
    razao_social: string;
    nome_fantasia?: string;
    inscricao_municipal?: string;
    inscricao_estadual?: string;
    endereco: {
        logradouro: string;
        numero: string;
        complemento?: string;
        bairro: string;
        cidade: string;
        uf: string;
        cep: string;
    };
    email: string;
    telefone?: string;
    regime_tributario?: string;
    optante_simples_nacional?: boolean;
}

export interface FocusNFeInvoiceData {
    data_emissao: string; // YYYY-MM-DD format
    prestador: {
        cnpj: string;
        inscricao_municipal?: string;
    };
    tomador: {
        cnpj?: string;
        cpf?: string;
        razao_social: string;
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
        codigo_tributacao_municipio: string;
        discriminacao: string;
        valor_servicos: number;
        aliquota?: number;
        iss_retido?: boolean;
    };
}

export class FocusNFeProvider implements NFSeProvider {
    private config: FocusNFeConfig;
    private baseUrl: string;

    constructor(config: FocusNFeConfig) {
        this.config = config;
        this.baseUrl = config.sandbox
            ? 'https://homologacao.focusnfe.com.br'
            : 'https://api.focusnfe.com.br';
    }

    async registerCompany(data: CompanyRegistration): Promise<string> {
        try {
            console.log('Registering company with Focus NFe:', data.cnpj);

            // Focus NFe doesn't require explicit company registration
            // The CNPJ acts as the company identifier
            // We just validate the certificate and return the CNPJ as the company ID
            
            console.log('Focus NFe: Using CNPJ as company ID:', data.cnpj);
            return data.cnpj;
        } catch (error) {
            console.error('Error with Focus NFe company setup:', error);
            throw new Error(`Company setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async generateInvoice(companyId: string, data: InvoiceRequest): Promise<InvoiceResult> {
        try {
            console.log('Generating invoice with Focus NFe:', { companyId, invoiceData: data });

            // Generate unique reference ID for Focus NFe
            const reference = `lv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            // Convert our generic invoice data to Focus NFe format
            const focusInvoice: FocusNFeInvoiceData = {
                data_emissao: data.sessionDate ? 
                    data.sessionDate.toISOString().split('T')[0] : 
                    new Date().toISOString().split('T')[0],
                prestador: {
                    cnpj: data.providerCnpj,
                    inscricao_municipal: data.providerMunicipalRegistration
                },
                tomador: {
                    cpf: data.customerDocument?.length === 11 ? data.customerDocument : undefined,
                    cnpj: data.customerDocument?.length === 14 ? data.customerDocument : undefined,
                    razao_social: data.customerName,
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
                    codigo_tributacao_municipio: data.serviceCode,
                    discriminacao: data.serviceDescription,
                    valor_servicos: data.serviceValue,
                    aliquota: data.taxRate,
                    iss_retido: data.taxWithheld || false
                }
            };

            const response = await this.makeRequest(
                'POST',
                `/v2/nfse?ref=${reference}`,
                focusInvoice
            );

            return {
                invoiceId: reference, // Focus NFe uses reference as identifier
                invoiceNumber: response.numero_nfse,
                status: this.mapStatus(response.status),
                pdfUrl: response.caminho_pdf_nfse,
                xmlUrl: response.caminho_xml_nfse,
                verificationCode: response.codigo_verificacao,
                accessKey: response.chave_nfse,
                issueDate: response.data_emissao ? new Date(response.data_emissao) : undefined,
                error: response.erros ? response.erros[0]?.mensagem : undefined
            };
        } catch (error) {
            console.error('Error generating invoice with Focus NFe:', error);
            
            // Return error result instead of throwing
            return {
                invoiceId: '',
                status: 'error',
                error: `Invoice generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    async getInvoiceStatus(companyId: string, invoiceId: string): Promise<InvoiceStatus> {
        try {
            const response = await this.makeRequest(
                'GET',
                `/v2/nfse/${invoiceId}`
            );

            return {
                invoiceId: invoiceId,
                status: this.mapStatus(response.status),
                invoiceNumber: response.numero_nfse,
                pdfUrl: response.caminho_pdf_nfse,
                xmlUrl: response.caminho_xml_nfse,
                error: response.erros ? response.erros[0]?.mensagem : undefined,
                lastUpdated: response.data_emissao ? new Date(response.data_emissao) : new Date()
            };
        } catch (error) {
            console.error('Error getting invoice status from Focus NFe:', error);
            throw new Error(`Failed to get invoice status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async validateCertificate(certificate: Buffer, password: string): Promise<CertificateValidation> {
        try {
            // Focus NFe doesn't have a separate certificate validation endpoint
            // Certificates are validated during invoice generation
            // We can do basic validation locally or just return success
            
            console.log('Focus NFe: Certificate validation - checking basic format');
            
            // Basic validation - check if it's a valid certificate file
            if (certificate.length < 100) {
                return {
                    isValid: false,
                    error: 'Certificate file appears to be too small or invalid'
                };
            }

            // Check if it starts with certificate markers
            const certString = certificate.toString();
            const isPkcs12 = certificate[0] === 0x30 || certString.includes('PKCS12') || certString.includes('.p12');
            
            if (!isPkcs12 && !certString.includes('BEGIN CERTIFICATE')) {
                return {
                    isValid: false,
                    error: 'Certificate format not recognized. Please use .p12/.pfx format'
                };
            }

            return {
                isValid: true,
                expiresAt: undefined, // We'd need to parse certificate to get this
                issuer: 'Unknown',
                subject: 'Unknown'
            };
        } catch (error) {
            console.error('Error validating certificate with Focus NFe:', error);
            return {
                isValid: false,
                error: `Certificate validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    async cancelInvoice(companyId: string, invoiceId: string, reason: string): Promise<boolean> {
        try {
            const response = await this.makeRequest(
                'DELETE',
                `/v2/nfse/${invoiceId}`,
                { justificativa: reason }
            );

            return response.status === 'cancelado' || response.cancelado === true;
        } catch (error) {
            console.error('Error canceling invoice with Focus NFe:', error);
            throw new Error(`Invoice cancellation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private async makeRequest(method: string, endpoint: string, data?: any): Promise<any> {
        const url = `${this.baseUrl}${endpoint}`;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${Buffer.from(this.config.apiKey + ':').toString('base64')}`,
            'User-Agent': 'LV-Notas/1.0'
        };

        console.log(`Making ${method} request to: ${url}`);
        if (data) {
            console.log('Request data: <hidden>');
        }

        try {
            const response = await fetch(url, {
                method,
                headers,
                body: data ? JSON.stringify(data) : undefined
            });

            const responseText = await response.text();

            // Try to parse as JSON
            let responseData: any;
            try {
                responseData = JSON.parse(responseText);
            } catch {
                responseData = { message: responseText };
            }

            console.log(`Focus NFe Response (${response.status}):`, responseData);

            if (!response.ok) {
                const errorMessage = responseData.erros?.[0]?.mensagem ||
                    responseData.erro?.mensagem ||
                    responseData.message ||
                    `HTTP ${response.status}: ${response.statusText}`;

                throw new Error(errorMessage);
            }

            return responseData;
        } catch (error) {
            if (error instanceof TypeError && error.message.includes('fetch')) {
                throw new Error('Network error: Unable to connect to Focus NFe API');
            }
            throw error;
        }
    }

    private mapStatus(focusStatus: string): 'pending' | 'processing' | 'issued' | 'cancelled' | 'error' {
        const statusMap: Record<string, 'pending' | 'processing' | 'issued' | 'cancelled' | 'error'> = {
            'processando_autorizacao': 'processing',
            'autorizado': 'issued',
            'autorizada': 'issued',
            'emitida': 'issued',
            'cancelado': 'cancelled',
            'cancelada': 'cancelled',
            'rejeitado': 'error',
            'rejeitada': 'error',
            'erro_autorizacao': 'error',
            'erro': 'error'
        };

        return statusMap[focusStatus?.toLowerCase()] || 'pending';
    }

    // Helper method for testing connectivity
    async testConnection(): Promise<boolean> {
        try {
            // Test with a simple GET request to check API connectivity
            await this.makeRequest('GET', '/v2/nfse');
            return true;
        } catch (error) {
            console.error('Focus NFe connection test failed:', error);
            return false;
        }
    }

    // Get available service codes
    async getServiceCodes(cityCode?: string): Promise<Array<{ code: string, description: string }>> {
        try {
            // Focus NFe doesn't provide a service codes endpoint
            // Return common therapy service codes as fallback
            console.log('Focus NFe: Using default service codes for therapy');
            
            return [
                { code: '14.01', description: 'Serviços de Psicologia e Psicanálise' },
                { code: '14.13', description: 'Terapias de Qualquer Espécie Destinadas ao Tratamento Físico, Mental e Espiritual' },
                { code: '14.14', description: 'Serviços de Psicoterapia Individual, Familiar ou em Grupo' },
                { code: '17.05', description: 'Orientação e Acompanhamento Psicológico' }
            ];
        } catch (error) {
            console.warn('Failed to fetch service codes, using defaults:', error);
            return [
                { code: '14.01', description: 'Serviços de Psicologia e Psicanálise' },
                { code: '14.13', description: 'Terapias de Qualquer Espécie Destinadas ao Tratamento Físico, Mental e Espiritual' }
            ];
        }
    }
}