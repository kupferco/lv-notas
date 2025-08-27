// clinic-api/src/services/providers/focus-nfe-provider.ts

import {
    NFSeProvider,
    CompanyRegistration,
    InvoiceRequest,
    InvoiceResult,
    InvoiceStatus,
    CertificateValidation
} from '../nfse-service.js';
import FormData from 'form-data';
import axios from 'axios';

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
    data_emissao: string; // "YYYY-MM-DD"
    prestador: {
        cnpj: string;
        inscricao_municipal?: string;
        codigo_municipio?: string; // IBGE code, e.g. "3550308" SP capital
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
            codigo_municipio?: string; // IBGE
            uf: string;
            cep: string;
        };
    };
    servico: {
        codigo_tributario_municipio: string;
        item_lista_servico?: string; // e.g. "1401"
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

    // Add this to your FocusNFeProvider class
    private async mockCompanyRegistration(data: CompanyRegistration): Promise<string> {
        console.log('🔵 MOCK MODE: Simulating Focus NFe company registration');

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Mock response based on Focus NFe documentation structure
        const mockResponse = {
            id: `mock_${data.cnpj}`,
            cnpj: data.cnpj,
            nome: data.companyName,
            nome_fantasia: data.tradeName,
            inscricao_municipal: data.municipalRegistration,
            codigo_municipio: data.address.cityCode || '3550308',
            email: data.email,
            telefone: data.phone,
            created_at: new Date().toISOString(),
            status: 'active'
        };

        console.log('🔵 MOCK: Company registered:', mockResponse);
        return mockResponse.id;
    }

    async registerCompany(data: CompanyRegistration): Promise<string> {
        try {
            console.log('Registering company with Focus NFe API:', data.cnpj);

            // Use mock in development/sandbox
            if (this.config.sandbox || process.env.USE_MOCK_FOCUS_NFE === 'true') {
                return await this.mockCompanyRegistration(data);
            }

            const companyData = {
                cnpj: data.cnpj.replace(/\D/g, ''), // Remove formatting
                nome: data.companyName,
                nome_fantasia: data.tradeName,
                inscricao_municipal: data.municipalRegistration,
                codigo_municipio: data.address.cityCode || '3550308',
                email: data.email,
                telefone: data.phone
            };

            await this.makeRequest('POST', '/v2/empresas', companyData);

            console.log('Company registered successfully:', data.cnpj);
            return data.cnpj;
        } catch (error) {
            // Company might already exist, which is OK
            if (error instanceof Error && error.message.includes('já cadastrada')) {
                console.log('Company already registered, continuing...');
                return data.cnpj;
            }
            throw error;
        }
    }

    // In focus-nfe-provider.ts
    async uploadCompanyCertificate(cnpj: string, certificateData: { buffer: Buffer, password: string }): Promise<boolean> {
        try {
            const FormData = (await import('form-data')).default;
            const axios = (await import('axios')).default;

            const formData = new FormData();
            formData.append('arquivo', certificateData.buffer, 'certificate.pfx');
            formData.append('senha', certificateData.password);

            const cleanCnpj = cnpj.replace(/\D/g, '');
            const url = `${this.baseUrl}/v2/empresas/${cleanCnpj}/certificado`;

            const response = await axios.post(url, formData, {
                headers: {
                    'Authorization': `Basic ${Buffer.from(this.config.apiKey + ':').toString('base64')}`,
                    ...formData.getHeaders()
                }
            });

            console.log('Certificate uploaded successfully for CNPJ:', cnpj);
            return true;
        } catch (error) {
            console.error('Certificate upload error:', error);
            throw error;
        }
    }

    private async makeRequestWithCertificate(
        method: string,
        endpoint: string,
        data: any,
        certificateData: { buffer: Buffer, password: string }
    ): Promise<any> {
        const url = `${this.baseUrl}${endpoint}`;

        try {
            const formData = new FormData();

            formData.append('dados', JSON.stringify(data));
            formData.append('certificado', certificateData.buffer, 'certificate.p12');
            formData.append('senha_certificado', certificateData.password);

            const response = await axios.post(url, formData, {
                headers: {
                    'Authorization': `Basic ${Buffer.from(this.config.apiKey + ':').toString('base64')}`,
                    ...formData.getHeaders()
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
                validateStatus: () => true // Don't throw on 4xx/5xx
            });

            console.log(`Focus NFe Response (${response.status}):`, response.data);
            console.log('Response headers:', response.headers);

            if (response.status >= 400) {
                const errorMessage = response.data?.mensagem ||
                    response.data?.codigo ||
                    response.data?.message ||
                    `HTTP ${response.status}: ${JSON.stringify(response.data)}`;
                throw new Error(errorMessage);
            }

            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && !error.response) {
                throw new Error(`Network error: ${error.message}`);
            }
            throw error;
        }
    }

    async generateInvoice(
        companyId: string,
        data: InvoiceRequest,
    ): Promise<InvoiceResult> {
        try {
            console.log('Generating invoice with Focus NFe');
            console.log('Invoice Request Data:', {
                ...data,
            });

            // Validate required fields
            if (!data.providerCnpj) {
                throw new Error('Provider CNPJ is required');
            }
            if (!data.customerName) {
                throw new Error('Customer name is required');
            }
            if (!data.serviceDescription) {
                throw new Error('Service description is required');
            }

            // Generate unique reference ID for Focus NFe
            const reference = `lv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

            const toDate = (d?: Date) =>
                (d ? d : new Date()).toISOString().slice(0, 10); // YYYY-MM-DD

            // Clean up document numbers
            const cleanDocument = (doc?: string) => doc?.replace(/\D/g, '');
            const customerDoc = cleanDocument(data.customerDocument);
            const isCPF = customerDoc?.length === 11;
            const isCNPJ = customerDoc?.length === 14;

            const focusInvoice: FocusNFeInvoiceData = {
                data_emissao: toDate(data.sessionDate),
                prestador: {
                    cnpj: cleanDocument(data.providerCnpj) || '',
                    inscricao_municipal: data.providerMunicipalRegistration,
                    codigo_municipio: data.providerCityCode || '3550308', // Default to São Paulo if not provided
                },
                tomador: {
                    cpf: isCPF ? customerDoc : undefined,
                    cnpj: isCNPJ ? customerDoc : undefined,
                    razao_social: data.customerName,
                    email: data.customerEmail,
                    endereco: data.customerAddress && data.customerAddress.street
                        ? {
                            logradouro: data.customerAddress.street || 'Rua não informada',
                            numero: data.customerAddress.number || 'S/N',
                            complemento: data.customerAddress.complement,
                            bairro: data.customerAddress.neighborhood || 'Centro',
                            codigo_municipio: data.customerAddress.cityCode || '3550308', // Default to São Paulo
                            uf: data.customerAddress.state || 'SP',
                            cep: cleanDocument(data.customerAddress.zipCode) || '00000000',
                        }
                        : undefined,
                },
                servico: {
                    codigo_tributario_municipio: data.serviceCode || '14.01',
                    item_lista_servico: data.itemListaServico || '1401',
                    discriminacao: data.serviceDescription,
                    valor_servicos: Number(data.serviceValue) || 0,
                    aliquota: Number(data.taxRate) || 5,
                    iss_retido: !!data.taxWithheld,
                },
            };

            console.log('Focus NFe Request Payload:', JSON.stringify(focusInvoice, null, 2));

            let response: any;


            console.log('Sending request WITHOUT certificate (JSON only)');
            response = await this.makeRequest(
                'POST',
                `/v2/nfse?ref=${encodeURIComponent(reference)}`,
                focusInvoice
            );

            return {
                invoiceId: reference,
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
            const response = await this.makeRequest('GET', `/v2/nfse/${encodeURIComponent(invoiceId)}`);

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
                expiresAt: undefined,
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
                `/v2/nfse/${encodeURIComponent(invoiceId)}`,
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
            console.log('Request data:', JSON.stringify(data, null, 2));
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
                    responseData.mensagem ||
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

    async testConnection(): Promise<boolean> {
        try {
            await this.makeRequest('GET', '/v2/nfe/ping-test-123');
            return true;
        } catch (error) {
            // 404 with "nota não encontrada" means API is working correctly
            if (error instanceof Error && error.message.includes('Nota fiscal não encontrada')) {
                console.log('✅ Focus NFe API working correctly (test invoice not found as expected)');
                return true;
            }

            console.log('❌ Focus NFe connection failed:', error);
            return false;
        }
    }

    async getServiceCodes(cityCode?: string): Promise<Array<{ code: string, description: string }>> {
        try {
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
                { code: '14.01', description: 'Serviços de Psicologia e Psicanálise' }
            ];
        }
    }
}