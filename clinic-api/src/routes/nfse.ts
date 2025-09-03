// clinic-api/src/routes/nfse.ts

import express, { Router, Request, Response, NextFunction } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import multer from "multer";
import pool from "../config/database.js";
import { NFSeService } from "../services/nfse-service.js";

const router: Router = Router();

// Configure multer for certificate file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.p12', '.pfx', '.pem'];
        const fileExtension = file.originalname.toLowerCase();

        if (allowedExtensions.some(ext => fileExtension.endsWith(ext))) {
            cb(null, true);
        } else {
            cb(new Error('Only .p12, .pfx, and .pem certificate files are allowed'));
        }
    }
});

// Initialize NFS-e service
const nfseService = new NFSeService();

// Type definitions
interface CertificateUploadBody {
    password: string;
    therapistId: string;
}

interface CompanyRegistrationBody {
    therapistId: string;
    password?: string;
    companyData: {
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
    };
}

interface NFSeSettingsBody {
    therapistId: string;
    settings: {
        serviceCode: string;
        taxRate: number;
        defaultServiceDescription: string;
        sendEmailToPatient?: boolean;
        includeSessionDetails?: boolean;
    };
}

// Helper functions
const getTherapistConfig = async (therapistId: number) => {
    const result = await pool.query(
        `SELECT * FROM therapist_nfse_config WHERE therapist_id = $1 AND is_active = true`,
        [therapistId]
    );
    return result.rows[0] || null;
};

// Type-safe handler wrapper
const asyncHandler = <T = any>(
    handler: (
        req: Request<ParamsDictionary, any, T>,
        res: Response
    ) => Promise<Response | void>
) => {
    return async (
        req: Request<ParamsDictionary, any, T>,
        res: Response,
        next: NextFunction
    ) => {
        try {
            await handler(req, res);
        } catch (error) {
            console.error('NFS-e API Error:', error);
            next(error);
        }
    };
};

// Helper function to check if we're in test mode
const isTestMode = async (): Promise<boolean> => {
    try {
        const result = await pool.query(
            `SELECT sandbox_mode FROM provider_configuration WHERE provider_name = 'focus_nfe' LIMIT 1`
        );
        return result.rows[0]?.sandbox_mode === true;
    } catch (error) {
        console.warn('Could not determine test mode, defaulting to true:', error);
        return true; // Default to safe test mode
    }
};

// 1. Upload certificate and auto-register company (simplified)
router.post("/certificate", upload.single('certificate'), asyncHandler<CertificateUploadBody>(async (req, res) => {
    const { password, therapistId } = req.body;
    const file = req.file;

    if (!file || !password || !therapistId) {
        return res.status(400).json({ error: "Certificate file, password, and therapist ID are required" });
    }

    try {
        // Step 1: Extract certificate info and CNPJ
        const { EncryptionService } = await import('../utils/encryption.js');
        const certificateInfo = EncryptionService.validateCertificateFormat(file.buffer, password);

        if (!certificateInfo.isValid) {
            return res.status(400).json({
                error: certificateInfo.error || "Invalid certificate file"
            });
        }

        if (!certificateInfo.cnpj) {
            return res.status(400).json({
                error: "Could not extract CNPJ from certificate. Please ensure you're using a valid business certificate."
            });
        }

        console.log('Certificate validated successfully. CNPJ:', certificateInfo.cnpj);

        // Step 2: Fetch company data from ReceitaWS
        const companyResponse = await fetch(`https://receitaws.com.br/v1/cnpj/${certificateInfo.cnpj}`);

        if (!companyResponse.ok) {
            return res.status(400).json({
                error: "Could not retrieve company information. Please verify the CNPJ in your certificate."
            });
        }

        const receitaData = await companyResponse.json();

        if (receitaData.status === 'ERROR') {
            return res.status(400).json({
                error: `Company data error: ${receitaData.message || 'Invalid CNPJ'}`
            });
        }

        console.log('Company data retrieved from ReceitaWS:', receitaData.nome);

        // Helper function to clean phone number
        const cleanPhone = (phoneStr: string): string => {
            if (!phoneStr) return '';

            // Extract first phone number and clean it
            const firstPhone = phoneStr.split('/')[0].trim();
            return firstPhone.replace(/[^\d]/g, ''); // Remove all non-digits
        };

        // Step 3: Build company registration data - CORRECTED
        const companyRegistrationData = {
            cnpj: certificateInfo.cnpj,
            companyName: receitaData.nome || certificateInfo.companyName || 'Empresa',
            tradeName: receitaData.fantasia || receitaData.nome,
            email: receitaData.email || certificateInfo.email || 'contato@empresa.com.br',
            phone: cleanPhone(receitaData.telefone),
            municipalRegistration: '30254027',
            stateRegistration: receitaData.situacao_especial || '',
            taxRegime: receitaData.simples?.optante ? '1' : '3',
            address: {
                street: receitaData.logradouro || '',
                number: receitaData.numero || 'S/N',
                complement: receitaData.complemento || '',
                neighborhood: receitaData.bairro || '',
                city: receitaData.municipio || 'São Paulo',
                state: receitaData.uf || 'SP',
                zipCode: receitaData.cep?.replace(/\D/g, '') || '00000000',
                cityCode: '3550308'
            }
        };

        // Step 4: Register company with Focus NFe (they store all company data)
        await nfseService.registerCompany(
            parseInt(therapistId),
            companyRegistrationData,
            {
                buffer: file.buffer,
                password: password
            }
        );

        console.log('Company and certificate registered successfully with Focus NFe');

        return res.json({
            message: 'Certificate uploaded and company registered successfully',
            certificateInfo: {
                cnpj: certificateInfo.cnpj,
                companyName: companyRegistrationData.companyName,
                commonName: certificateInfo.commonName,
                issuer: certificateInfo.issuer,
                expiresAt: certificateInfo.notAfter,
                isValid: certificateInfo.isValid,
                uploaded: true,
                uploadedAt: new Date().toISOString(),
                autoRegistered: true
            },
            companyInfo: {
                razaoSocial: receitaData.razao_social,
                nomeFantasia: receitaData.nome_fantasia,
                municipio: receitaData.municipio,
                uf: receitaData.uf,
                situacao: receitaData.situacao
            }
        });

    } catch (error) {
        console.error('Certificate upload and registration error:', error);

        let errorMessage = 'Certificate upload failed';
        if (error instanceof Error) {
            if (error.message.includes('Invalid certificate password') ||
                error.message.includes('MAC could not be verified')) {
                errorMessage = 'Invalid certificate password. Please check your password and try again.';
            } else if (error.message.includes('Network error')) {
                errorMessage = 'Network error. Please check your internet connection and try again.';
            } else {
                errorMessage = `Certificate upload failed: ${error.message}`;
            }
        }

        return res.status(400).json({ error: errorMessage });
    }
}));

// 2. Get certificate status (simplified)
router.get("/certificate/status/:therapistId", asyncHandler(async (req, res) => {
    const { therapistId } = req.params;

    try {
        const config = await getTherapistConfig(parseInt(therapistId));

        if (!config || !config.certificate_uploaded) {
            return res.json({
                hasValidCertificate: false,
                status: 'not_uploaded'
            });
        }

        // Fetch fresh certificate and company details from Focus NFE
        let certificateInfo = null;
        try {
            const companyData = await nfseService.getCompanyData(parseInt(therapistId));

            // The Focus NFE company data should include certificate details
            certificateInfo = {
                commonName: companyData.companyName || 'Empresa',
                issuer: 'Focus NFE', // or extract from companyData if available
                cnpj: companyData.cnpj,
                companyName: companyData.companyName,
                expiresAt: companyData.expiresAt,
            };
            //   console.log(55, companyData)
            //   console.log(77, certificateInfo)
        } catch (error) {
            console.log('Could not fetch certificate details from Focus NFE:', error);
        }
        return res.json({
            hasValidCertificate: config.certificate_uploaded,
            status: 'uploaded',
            expiresAt: certificateInfo?.expiresAt,
            uploadedAt: config.certificate_uploaded_at,
            certificateInfo,
            validationStatus: certificateInfo ? 'validated' : 'error'
        });
    } catch (error) {
        console.error('Certificate status error:', error);
        return res.status(500).json({ error: 'Failed to get certificate status' });
    }
}));

// 3. Get company data (fetched fresh from Focus NFe)
router.get("/company/:therapistId", asyncHandler(async (req, res) => {
    const { therapistId } = req.params;

    try {
        const config = await getTherapistConfig(parseInt(therapistId));

        if (!config) {
            return res.status(404).json({ error: 'Therapist not configured for NFS-e' });
        }

        // Fetch fresh company data from Focus NFe
        const companyData = await nfseService.getCompanyData(parseInt(therapistId));

        return res.json({
            companyData,
            localConfig: {
                cnpj: config.company_cnpj,
                certificateUploaded: config.certificate_uploaded,
                certificateUploadedAt: config.certificate_uploaded_at
            }
        });
    } catch (error) {
        console.error('Get company data error:', error);
        return res.status(400).json({
            error: `Failed to get company data: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
    }
}));

// 4. Generate invoice (simplified)
router.post("/invoice/generate", asyncHandler(async (req, res) => {
    const { therapistId, patientId, year, month, sessionIds, customerData, testMode } = req.body;

    console.log("=== INVOICE GENERATION ===");
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    if (testMode) {
        try {
            const config = await getTherapistConfig(parseInt(therapistId));

            if (!config || !config.company_cnpj) {
                return res.status(400).json({ error: "Company must be registered first" });
            }

            if (!config.certificate_uploaded) {
                return res.status(400).json({ error: "Certificate must be uploaded first" });
            }

            // Create mock invoice data for validation
            const mockInvoice = {
                invoiceId: `test_${Date.now()}`,
                status: 'success',
                invoiceNumber: 'TEST-001',
                amount: 100.00,
                taxAmount: 2.00,
                issueDate: new Date().toISOString(),
                customerName: customerData?.name || 'TESTE DE VALIDAÇÃO',
                serviceDescription: 'Teste de validação do sistema - SEM VALOR FISCAL',
                pdfUrl: null,
                xmlUrl: null,
                testMode: true,
                message: 'Integração validada com sucesso'
            };

            return res.json({
                message: 'Test validation successful - system configured correctly',
                invoice: mockInvoice,
                billingPeriod: {
                    id: 'test',
                    sessionCount: 0,
                    totalAmount: 100.00
                },
                testMode: true
            });
        } catch (error) {
            console.error('Test validation error:', error);
            return res.status(400).json({
                error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        }
    }

    // Regular invoice generation
    if (!therapistId || !patientId || !year || !month) {
        return res.status(400).json({
            error: "Therapist ID, patient ID, year, and month are required"
        });
    }

    try {
        const environmentTestMode = await isTestMode();

        // Check if invoice already exists for this billing period
        const existingInvoice = await pool.query(
            `SELECT * FROM v_billing_period_invoices
             WHERE therapist_id = $1 
               AND patient_id = $2 
               AND billing_year = $3 
               AND billing_month = $4
               AND invoice_status IS NOT NULL
               AND invoice_status NOT IN ('cancelled', 'error', 'superseded')`,
            [therapistId, patientId, year, month]
        );

        if (existingInvoice.rows.length > 0) {
            return res.status(400).json({
                error: "Invoice already exists for this billing period",
                existingInvoice: existingInvoice.rows[0]
            });
        }

        const config = await getTherapistConfig(parseInt(therapistId));

        if (!config || !config.company_cnpj) {
            return res.status(400).json({ error: "Company must be registered first" });
        }

        if (!config.certificate_uploaded) {
            return res.status(400).json({ error: "Certificate must be uploaded first" });
        }

        // Generate invoice using the simplified service
        const result = await nfseService.generateInvoiceForSessions(
            parseInt(therapistId),
            parseInt(patientId),
            parseInt(year),
            parseInt(month),
            sessionIds,
            customerData
        );

        return res.json({
            message: `${environmentTestMode ? 'Test' : 'Production'} invoice generated successfully`,
            invoice: result,
            testMode: environmentTestMode
        });
    } catch (error) {
        console.error('Invoice generation error:', error);
        return res.status(400).json({
            error: `Invoice generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
    }
}));

// 5. Get therapist's invoices (simplified)
router.get("/invoices/:therapistId", asyncHandler(async (req, res) => {
    const { therapistId } = req.params;
    const { limit = '50', offset = '0', status } = req.query;

    try {
        let query = `
          SELECT ni.*, p.nome as patient_name
          FROM nfse_invoices ni
          JOIN patients p ON ni.patient_id = p.id
          WHERE ni.therapist_id = $1 AND ni.status != 'superseded'
        `;

        const queryParams = [therapistId];
        let paramCount = 1;

        if (status) {
            query += ` AND ni.status = $${++paramCount}`;
            queryParams.push(status as string);
        }

        query += ` ORDER BY ni.ref_number DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
        queryParams.push(limit as string, offset as string);

        const result = await pool.query(query, queryParams);
        const testMode = await isTestMode();

        return res.json({
            invoices: result.rows,
            testMode,
            pagination: {
                limit: parseInt(limit as string),
                offset: parseInt(offset as string),
                total: result.rows.length
            }
        });
    } catch (error) {
        console.error('Get invoices error:', error);
        return res.status(500).json({ error: 'Failed to fetch invoices' });
    }
}));

// 6. Get invoice status (uses fresh data from Focus NFe)
router.get("/invoice/:invoiceId/status", asyncHandler(async (req, res) => {
    const { invoiceId } = req.params;

    try {
        const result = await pool.query(
            `SELECT therapist_id FROM nfse_invoices WHERE id = $1`,
            [invoiceId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Invoice not found" });
        }

        const therapistId = result.rows[0].therapist_id;

        // Get fresh status from Focus NFe
        const status = await nfseService.getInvoiceStatus(
            parseInt(invoiceId),
            therapistId
        );

        return res.json(status);
    } catch (error) {
        console.error('Get invoice status error:', error);
        return res.status(500).json({ error: 'Failed to get invoice status' });
    }
}));

// 7. Update NFSe settings (simplified - only local preferences)
router.put("/settings", asyncHandler<NFSeSettingsBody>(async (req, res) => {
    const { therapistId, settings } = req.body;

    if (!therapistId || !settings) {
        return res.status(400).json({ error: "Therapist ID and settings are required" });
    }

    try {
        await nfseService.updateTherapistSettings(parseInt(therapistId), {
            default_service_code: settings.serviceCode,
            default_tax_rate: settings.taxRate,
            default_service_description: settings.defaultServiceDescription,
            send_email_to_patient: settings.sendEmailToPatient,
            include_session_details: settings.includeSessionDetails
        });

        return res.json({
            message: 'NFS-e settings updated successfully',
            settings
        });
    } catch (error) {
        console.error('Update settings error:', error);
        return res.status(500).json({ error: 'Failed to update settings' });
    }
}));

// 8. Get NFSe settings (simplified)
router.get("/settings/:therapistId", asyncHandler(async (req, res) => {
    const { therapistId } = req.params;

    console.log("📞 getNFSeSettings API call for therapist:", therapistId);
    try {
        const config = await getTherapistConfig(parseInt(therapistId));
        console.log("Debug - config from database:", config);


        if (!config) {
            return res.status(404).json({
                error: 'NFS-e configuration not found for this therapist'
            });
        }

        if (!config.default_service_code) {
            return res.status(500).json({
                error: 'Service code not configured - database integrity issue'
            });
        }

        const settings = {
            serviceCode: config.default_service_code,
            taxRate: parseFloat(config.default_tax_rate),
            defaultServiceDescription: config.default_service_description,
            sendEmailToPatient: config.send_email_to_patient !== false,
            includeSessionDetails: config.include_session_details !== false
        };
        console.log("Debug - settings being returned:", settings);
        return res.json({ settings });
    } catch (error) {
        console.error('Get settings error:', error);
        return res.status(500).json({ error: 'Failed to get settings' });
    }
}));

// 9. Test connection (simplified)
router.get("/test-connection", asyncHandler(async (req, res) => {
    try {
        const isConnected = await nfseService.testConnection();
        const testMode = await isTestMode();

        return res.json({
            connected: isConnected,
            currentProvider: 'focus_nfe',
            testMode,
            environment: testMode ? 'sandbox' : 'production'
        });
    } catch (error) {
        console.error('Test connection error:', error);
        return res.status(500).json({
            connected: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));

// 10. Get service codes (simplified)
router.get("/service-codes", asyncHandler(async (req, res) => {
    const { cityCode } = req.query;

    try {
        const serviceCodes = await nfseService.getServiceCodes(cityCode as string);
        return res.json({ serviceCodes });
    } catch (error) {
        console.error('Get service codes error:', error);
        return res.status(500).json({ error: 'Failed to get service codes' });
    }
}));

// 11. Cancel invoice (simplified)
router.post("/invoice/:invoiceId/cancel", asyncHandler(async (req, res) => {
    const { invoiceId } = req.params;
    const { reason } = req.body;

    try {
        const result = await pool.query(
            `SELECT therapist_id FROM nfse_invoices WHERE id = $1`,
            [invoiceId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Invoice not found" });
        }

        const therapistId = result.rows[0].therapist_id;

        const success = await nfseService.cancelInvoice(
            parseInt(invoiceId),
            therapistId,
            reason || 'Cancelamento solicitado pelo usuário'
        );

        return res.json({
            message: 'Invoice cancelled successfully',
            success
        });
    } catch (error) {
        console.error('Invoice cancellation error:', error);
        return res.status(400).json({
            error: `Invoice cancellation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
    }
}));

// 12. Get invoice details for a billing period (simplified)
router.get("/billing-period/:billingPeriodId/invoice", asyncHandler(async (req, res) => {
    const { billingPeriodId } = req.params;

    try {
        const result = await pool.query(
            `SELECT * FROM get_invoice_status_for_billing_period($1)`,
            [billingPeriodId]
        );

        return res.json({
            invoice: result.rows[0] || null
        });
    } catch (error) {
        console.error('Get billing period invoice error:', error);
        return res.status(500).json({ error: 'Failed to get invoice details' });
    }
}));

// Error handling middleware
const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction): void => {
    console.error('NFS-e API Error:', error);

    if (error.message.includes('File too large')) {
        res.status(413).json({ error: 'Certificate file too large (max 5MB)' });
        return;
    }

    if (error.message.includes('certificate files are allowed')) {
        res.status(400).json({ error: error.message });
        return;
    }

    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
};

router.use(errorHandler);

export default router;