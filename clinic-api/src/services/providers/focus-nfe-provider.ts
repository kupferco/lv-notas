// clinic-api/src/services/providers/focus-nfe-provider.ts

import {
    NFSeProvider,
    CompanyRegistration,
    CompanyData,
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
        aliquota: number; // Required - tax rate
        discriminacao: string;
        iss_retido: string; // String "false" or "true"
        item_lista_servico: string; // Federal service code
        codigo_tributario_municipio: string; // Municipal service code
        valor_servicos: number;
    };
    optante_simples_nacional: boolean;
    incentivo_fiscal: boolean;
}

export class FocusNFeProvider implements NFSeProvider {
    private config: FocusNFeConfig;
    private companyBaseUrl: string; // Always production for company operations
    private invoiceBaseUrl: string; // Sandbox or production for invoice operations
    private masterToken: string;

    constructor(config?: Partial<FocusNFeConfig>) {
        // Get environment configuration
        const isSandbox = process.env.FOCUS_NFE_SANDBOX === 'true';

        this.masterToken = process.env.FOCUS_NFE_MASTER_TOKEN || '';

        // Company operations always use production URL (no empresas endpoint in homologação)
        this.companyBaseUrl = process.env.FOCUS_NFE_API_URL_PROD || 'https://api.focusnfe.com.br';

        // Invoice operations use sandbox or production based on environment
        this.invoiceBaseUrl = isSandbox
            ? (process.env.FOCUS_NFE_API_URL_HOMOLOGACAO || 'https://homologacao.focusnfe.com.br')
            : (process.env.FOCUS_NFE_API_URL_PROD || 'https://api.focusnfe.com.br');

        this.config = {
            apiKey: this.masterToken,
            apiUrl: this.invoiceBaseUrl, // For backward compatibility
            sandbox: isSandbox,
            ...config
        };

        if (!this.masterToken) {
            throw new Error('Focus NFe master token not configured. Please set FOCUS_NFE_MASTER_TOKEN environment variable.');
        }

        console.log(`Focus NFe Provider initialized:`);
        console.log(`- Mode: ${isSandbox ? 'SANDBOX' : 'PRODUCTION'}`);
        console.log(`- Company URL (always prod): ${this.companyBaseUrl}`);
        console.log(`- Invoice URL: ${this.invoiceBaseUrl}`);
        console.log(`- Token: ${this.masterToken ? 'Present' : 'Missing'}`);
        console.log('Master token (first 5):', this.masterToken?.slice(0, 5) || 'Not found');
    }

    /**
     * Get company data from Focus NFe (single source of truth)
     */
    async getCompanyData(cnpj: string): Promise<CompanyData> {
        try {
            const cleanCnpj = cnpj.replace(/\D/g, '');
            console.log(`Fetching company data from Focus NFe for CNPJ: ${cleanCnpj}`);

            const response = await this.makeCompanyRequest(
                'GET',
                `/v2/empresas?cnpj=${cleanCnpj}`
            );

            // console.log(88, response)
            // Transform Focus NFe response to our interface
            return {
                cnpj: cleanCnpj,
                companyName: response[0].nome || response.razao_social,
                tradeName: response[0].nome_fantasia,
                email: response[0].email,
                phone: response[0].telefone,
                municipalRegistration: response[0].inscricao_municipal,
                stateRegistration: response[0].inscricao_estadual,
                expiresAt: response[0].certificado_valido_ate,
                address: {
                    street: response[0].logradouro || '',
                    number: response[0].numero || 'S/N',
                    complement: response[0].complemento || '',
                    neighborhood: response[0].bairro || '',
                    city: response[0].municipio || response[0].endereco?.cidade || 'São Paulo',
                    state: response[0].uf || response[0].endereco?.uf || 'SP',
                    zipCode: response[0].cep || response[0].endereco?.cep || '00000-000',
                    cityCode: response[0].codigo_municipio || '3550308'
                },
                tokens: {
                    production: response[0].token_producao,
                    sandbox: response[0].token_homologacao
                },
                proximo_numero_nfse_producao: response[0].proximo_numero_nfse_producao,
                proximo_numero_nfse_homologacao: response[0].proximo_numero_nfse_homologacao

            };
        } catch (error) {
            console.error(`Failed to get company data for ${cnpj}:`, error);
            throw new Error(`Could not retrieve company data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get company token dynamically from Focus NFe (uses getCompanyData internally)
     */
    private async getCompanyToken(cnpj: string): Promise<string> {
        try {
            const companyData = await this.getCompanyData(cnpj);
            const token = this.config.sandbox ? companyData.tokens?.sandbox : companyData.tokens?.production;

            if (!token) {
                throw new Error('Company token not found. Company may not be registered or certificates not uploaded.');
            }

            console.log(`Company token retrieved for ${cnpj}`);
            return token;
        } catch (error) {
            console.error(`Failed to get company token for ${cnpj}:`, error);
            throw error;
        }
    }

    async registerCompany(data: CompanyRegistration, certificateData?: { buffer: Buffer, password: string }): Promise<string> {
        console.log('Registering/updating company with Focus NFe (production URL):', data.cnpj);

        const companyData: any = {
            nome: data.companyName,
            nome_fantasia: data.tradeName,
            cnpj: data.cnpj.replace(/\D/g, ''), // Remove formatting
            inscricao_municipal: data.municipalRegistration,
            regime_tributario: data.taxRegime ? parseInt(data.taxRegime) : 1, // Default to Simples Nacional
            email: data.email,
            telefone: data.phone,
            logradouro: data.address.street,
            numero: data.address.number,
            complemento: data.address.complement,
            bairro: data.address.neighborhood,
            municipio: data.address.city,
            uf: data.address.state,
            cep: data.address.zipCode.replace(/\D/g, ''),
            codigo_municipio: data.address.cityCode || '3550308',
            habilita_nfse: true
        };

        // Include certificate if provided
        if (certificateData) {
            companyData.arquivo_certificado_base64 = certificateData.buffer.toString('base64');
            companyData.senha_certificado = certificateData.password;
            console.log('Including certificate in company registration/update');
        }

        // Add dry_run parameter only for sandbox mode
        let endpoint = '/v2/empresas';
        if (this.config.sandbox) {
            endpoint += '?dry_run=1';
            console.log('Using dry_run=1 for sandbox company registration');
        }

        const response = await this.makeCompanyRequest('POST', endpoint, companyData);

        console.log('Company registered/updated successfully:', data.cnpj);
        return data.cnpj;
    }

    async uploadCompanyCertificate(cnpj: string, certificateData: { buffer: Buffer, password: string }): Promise<boolean> {
        try {
            const FormData = (await import('form-data')).default;
            const axios = (await import('axios')).default;

            const formData = new FormData();
            formData.append('arquivo', certificateData.buffer, 'certificate.pfx');
            formData.append('senha', certificateData.password);

            const cleanCnpj = cnpj.replace(/\D/g, '');

            // Certificate upload always uses production URL (same as company registration)
            let url = `${this.companyBaseUrl}/v2/empresas/${cleanCnpj}/certificado`;
            if (this.config.sandbox) {
                url += '?dry_run=1';
                console.log('Using dry_run=1 for sandbox certificate upload');
            }

            const response = await axios.post(url, formData, {
                headers: {
                    'Authorization': `Basic ${Buffer.from(this.masterToken + ':').toString('base64')}`,
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

    async generateInvoice(
        companyId: string, // This will be the CNPJ
        data: InvoiceRequest,
        customReference?: string
    ): Promise<InvoiceResult> {
        try {
            console.log('Generating invoice with Focus NFe');
            console.log('Company CNPJ:', companyId);
            console.log('Invoice Request Data:', {
                customerName: data.customerName,
                serviceValue: data.serviceValue,
                serviceDescription: data.serviceDescription
            });

            // Get company data to determine Simples Nacional status
            const companyData = await this.getCompanyData(companyId);
            const companyToken = await this.getCompanyToken(companyId);

            const reference = customReference || `lv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
            console.log('Using invoice reference:', reference);

            const toDate = (d?: Date) =>
                (d ? d : new Date()).toISOString().slice(0, 10); // YYYY-MM-DD

            // Clean up document numbers
            const cleanDocument = (doc?: string) => doc?.replace(/\D/g, '');
            const customerDoc = cleanDocument(data.customerDocument);
            const isCPF = customerDoc?.length === 11;
            const isCNPJ = customerDoc?.length === 14;

            // console.log(data)

            const focusInvoice: FocusNFeInvoiceData = {
                data_emissao: toDate(data.sessionDate),
                prestador: {
                    cnpj: cleanDocument(companyId) || '',
                    inscricao_municipal: companyData.municipalRegistration || data.providerMunicipalRegistration,
                    codigo_municipio: companyData.address.cityCode || data.providerCityCode || '3550308',
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
                            complemento: data.customerAddress.complement || '',
                            bairro: data.customerAddress.neighborhood || 'Centro',
                            codigo_municipio: data.customerAddress.cityCode || '3550308',
                            uf: data.customerAddress.state || 'SP',
                            cep: cleanDocument(data.customerAddress.zipCode) || '00000000',
                        }
                        : undefined,
                },
                servico: {
                    aliquota: 2, // Fixed 2% for psychology services in São Paulo
                    discriminacao: data.serviceDescription,
                    iss_retido: data.taxWithheld ? "true" : "false", // String format
                    item_lista_servico: "05118", // Federal psychology service code
                    codigo_tributario_municipio: data.serviceCode || "07498", // São Paulo municipal code
                    valor_servicos: Number(data.serviceValue) || 0,
                },
                optante_simples_nacional: true, // Assume Simples Nacional for therapy clinics
                incentivo_fiscal: false
            };

            // console.log('Focus NFe Request Payload:', JSON.stringify(focusInvoice, null, 2));

            // Build URL - no dry_run for invoice operations (they use proper environment URLs)
            let endpoint = `/v2/nfse?ref=${encodeURIComponent(reference)}`;

            // console.log('=== FOCUS NFE INVOICE REQUEST DEBUG ===');
            // console.log('Environment:', process.env.NODE_ENV);
            // console.log('Sandbox mode:', this.config.sandbox);
            // console.log('Invoice URL:', this.invoiceBaseUrl);
            // console.log('Company token:', companyToken ? 'Present' : 'Missing');
            // console.log('Reference:', reference);
            // console.log('Focus NFe Request Payload:', JSON.stringify(focusInvoice, null, 2));
            // console.log('=== END DEBUG ===');

            // SPOOF RESPONSE (JUST FOR CHECKING PAYLOAD)
            // return {
            //     invoiceId: 'asdsa',
            //     invoiceNumber: 'asdsad',
            //     status: 'pending',
            //     pdfUrl: 'asdsad',
            //     xmlUrl: 'asdsad',
            //     verificationCode: 'asdsad',
            //     accessKey: 'asdsad',
            //     issueDate: new Date(),
            //     error: 'asdsad',
            // };

            // Send request using company token to appropriate environment URL
            const response = await this.makeInvoiceRequest(
                'POST',
                endpoint,
                companyToken,
                focusInvoice
            );

            return {
                invoiceId: reference,
                invoiceNumber: response.numero_nfse,
                status: this.mapStatus(response.status),
                pdfUrl: response.url_danfse,
                xmlUrl: response.caminho_xml_nota_fiscal,
                verificationCode: response.codigo_verificacao,
                accessKey: response.chave_nfse,
                issueDate: response.data_emissao ? new Date(response.data_emissao) : undefined,
                // IMPROVED ERROR EXTRACTION - handle both error responses and success with errors
                error: response.erros && response.erros.length > 0
                    ? response.erros.map((err: any) => err.mensagem).join('; ')  // Join multiple errors
                    : (this.mapStatus(response.status) === 'error' ? 'Erro desconhecido' : undefined)
            };
        } catch (error) {
            console.error('Error generating invoice with Focus NFe:', error);

            let errorMessage = 'Invoice generation failed';

            if (error instanceof Error) {
                // Check if the error has a response body with Focus NFe error details
                if (error.message.includes('erros')) {
                    try {
                        const match = error.message.match(/erros.*?mensagem.*?"([^"]+)"/);
                        if (match) {
                            errorMessage = match[1];
                        }
                    } catch (parseError) {
                        // Fallback to original error message
                        errorMessage = error.message;
                    }
                } else {
                    errorMessage = error.message;
                }
            }

            return {
                invoiceId: customReference || '',
                status: 'error',
                error: errorMessage
            };
        }
    }

    async getInvoiceStatus(companyId: string, invoiceId: string): Promise<InvoiceStatus> {
        try {
            const companyToken = await this.getCompanyToken(companyId);
            const response = await this.makeInvoiceRequest(
                'GET',
                `/v2/nfse/${encodeURIComponent(invoiceId)}`,
                companyToken
            );

            console.log(`📄 Focus NFe getInvoiceStatus response for ${invoiceId}:`, {
                status: response.status,
                erros: response.erros,
                numero_nfse: response.numero_nfse
            });

            // EXTRACT ERROR MESSAGE PROPERLY FROM ERROS ARRAY
            let errorMessage = null;
            if (response.erros && response.erros.length > 0) {
                errorMessage = response.erros.map((err: any) => err.mensagem).join('; ');
                console.log(`🚨 Extracted error message: "${errorMessage}"`);
            }

            return {
                invoiceId: invoiceId,
                status: this.mapStatus(response.status),
                invoiceNumber: response.numero_nfse,
                pdfUrl: response.url_danfse,
                xmlUrl: response.caminho_xml_nota_fiscal,
                error: errorMessage, // This will now contain the actual error message
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
            const companyToken = await this.getCompanyToken(companyId);

            // Use appropriate environment URL for cancellation
            let endpoint = `/v2/nfse/${encodeURIComponent(invoiceId)}`;

            const response = await this.makeInvoiceRequest(
                'DELETE',
                endpoint,
                companyToken,
                { justificativa: reason }
            );

            return response.status === 'cancelado' || response.cancelado === true;
        } catch (error) {
            console.error('Error canceling invoice with Focus NFe:', error);
            throw new Error(`Invoice cancellation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async testConnection(): Promise<boolean> {
        try {
            await this.makeCompanyRequest('GET', '/v2/nfe/ping-test-123');
            return true;
        } catch (error) {
            // 404 with "nota não encontrada" means API is working correctly
            if (error instanceof Error && error.message.includes('Nota fiscal não encontrada')) {
                console.log('Focus NFe API working correctly (test invoice not found as expected)');
                return true;
            }

            console.log('Focus NFe connection failed:', error);
            return false;
        }
    }

    async getServiceCodes(cityCode?: string): Promise<Array<{ code: string, description: string }>> {
        try {
            console.log('Focus NFe: Using default service codes for therapy');

            return [
                { code: '07498', description: 'Serviços de Psicologia e Psicanálise' },
                { code: '14.13', description: 'Terapias de Qualquer Espécie Destinadas ao Tratamento Físico, Mental e Espiritual' },
                { code: '14.14', description: 'Serviços de Psicoterapia Individual, Familiar ou em Grupo' },
                { code: '17.05', description: 'Orientação e Acompanhamento Psicológico' }
            ];
        } catch (error) {
            console.warn('Failed to fetch service codes, using defaults:', error);
            return [
                { code: '07498', description: 'Serviços de Psicologia e Psicanálise' }
            ];
        }
    }

    /**
     * Make request using master token for company operations (always production URL)
     */
    private async makeCompanyRequest(method: string, endpoint: string, data?: any): Promise<any> {
        const url = `${this.companyBaseUrl}${endpoint}`;
        this.masterToken = '8JM5vtFKbSe2iohvY7eXsdAXrYsMjOLW';
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${Buffer.from(this.masterToken + ':').toString('base64')}`,
            'User-Agent': 'LV-Notas/1.0'
        };

        console.log(`Making ${method} company request to: ${url}`);
        // console.log(555555);
        // console.log('data (cnpj):', data?.cnpj);
        // console.log('token (5):', this.masterToken?.slice(0, 5));
        // console.log(77777);

        try {
            const response = await fetch(url, {
                method,
                headers,
                body: data ? JSON.stringify(data) : undefined
            });

            const responseText = await response.text();
            let responseData: any;

            // console.log(response);
            // console.log(8888888);

            try {
                responseData = JSON.parse(responseText);
            } catch {
                responseData = { message: responseText };
            }

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

    /**
     * Make request using company token for invoice operations (sandbox or production URL)
     */
    private async makeInvoiceRequest(method: string, endpoint: string, companyToken: string, data?: any): Promise<any> {
        const url = `${this.invoiceBaseUrl}${endpoint}`;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${Buffer.from(companyToken + ':').toString('base64')}`,
            'User-Agent': 'LV-Notas/1.0'
        };

        console.log(`Making ${method} invoice request to: ${url}`);

        try {
            const response = await fetch(url, {
                method,
                headers,
                body: data ? JSON.stringify(data) : undefined
            });

            const responseText = await response.text();
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
}