// clinic-api/src/routes/nfse.ts

import express, { Router, Request, Response, NextFunction } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import multer from "multer";
import pool from "../config/database.js";
import { NFSeService } from "../services/nfse-service.js";
import { CertificateStorageService, EncryptionService } from "../utils/encryption.js";
import { buildInvoiceData } from "../services/nfse-invoice-data.js";
import { InvoiceGenerationBody } from "../types/invoice.js";
import { FocusNFeProvider } from "../services/providers/focus-nfe-provider.js";

const router: Router = Router();

// Configure multer for certificate file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept .p12, .pfx, and .pem files
        const allowedExtensions = ['.p12', '.pfx', '.pem'];
        const fileExtension = file.originalname.toLowerCase().slice(-4);

        if (allowedExtensions.some(ext => file.originalname.toLowerCase().endsWith(ext))) {
            cb(null, true);
        } else {
            cb(new Error('Only .p12, .pfx, and .pem certificate files are allowed'));
        }
    }
});

// Initialize NFS-e service
const nfseService = new NFSeService();

// Type definitions for request bodies
interface CertificateUploadBody {
    password: string;
    therapistId: string;
}

interface CompanyRegistrationBody {
    therapistId: string;
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

// Updated to use the shared type and make it compatible with our API
interface NFSeInvoiceGenerationBody {
    therapistId: string;
    sessionId: string;
    customerData?: Partial<InvoiceGenerationBody["customerData"]>;
    serviceData?: Partial<InvoiceGenerationBody["serviceData"]>;
}

interface NFSeSettingsBody {
    therapistId: string;
    settings: {
        serviceCode: string;
        taxRate: number;
        defaultServiceDescription: string;
        issWithholding: boolean;
        additionalInfo?: string;
    };
}

// Helper function to check if we're in test mode
const isTestMode = async (): Promise<boolean> => {
    try {
        const result = await pool.query(
            `SELECT value FROM app_configuration WHERE key = 'nfse_test_mode'`
        );
        return result.rows[0]?.value === 'true';
    } catch (error) {
        console.warn('Could not determine test mode, defaulting to true:', error);
        return true; // Default to safe test mode
    }
};

// Helper function to get current provider
const getCurrentProvider = async (): Promise<string> => {
    try {
        const result = await pool.query(
            `SELECT value FROM app_configuration WHERE key = 'nfse_current_provider'`
        );
        return result.rows[0]?.value || 'focus_nfe'; // Default fallback
    } catch (error) {
        console.warn('Could not determine current provider, defaulting to focus_nfe:', error);
        return 'focus_nfe';
    }
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
            console.error('API Error:', error);
            next(error);
        }
    };
};

// Helper function to get therapist NFS-e config
const getTherapistConfig = async (therapistId: number) => {
    const result = await pool.query(
        `SELECT * FROM therapist_nfse_config WHERE therapist_id = $1`,
        [therapistId]
    );
    return result.rows[0] || null;
};

// Helper function to create/update therapist config
const upsertTherapistConfig = async (therapistId: number, updates: any) => {
    const setClause = Object.keys(updates)
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ');

    const values = [therapistId, ...Object.values(updates)];

    return await pool.query(
        `INSERT INTO therapist_nfse_config (therapist_id, ${Object.keys(updates).join(', ')})
     VALUES ($1, ${Object.keys(updates).map((_, i) => `$${i + 2}`).join(', ')})
     ON CONFLICT (therapist_id) 
     DO UPDATE SET ${setClause}, updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
        values
    );
};

// 1. Upload and validate certificate
router.post("/certificate", upload.single('certificate'), asyncHandler<CertificateUploadBody>(async (req, res) => {
    const { password, therapistId } = req.body;
    const file = req.file;

    if (!file) {
        return res.status(400).json({ error: "Certificate file is required" });
    }

    if (!password || !therapistId) {
        return res.status(400).json({ error: "Password and therapist ID are required" });
    }

    try {
        // Store certificate securely
        const {
            filePath,
            encryptedPassword,
            certificateInfo
        } = await CertificateStorageService.storeCertificate(
            parseInt(therapistId),
            file.buffer,
            password
        );

        // Update or create therapist config
        const existingConfig = await getTherapistConfig(parseInt(therapistId));

        if (existingConfig) {
            // Update existing record
            await pool.query(
                `UPDATE therapist_nfse_config 
                 SET certificate_file_path = $1,
                     certificate_password_encrypted = $2,
                     certificate_expires_at = $3,
                     certificate_status = $4,
                     certificate_info = $5,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE therapist_id = $6`,
                [
                    filePath,
                    JSON.stringify(encryptedPassword),
                    certificateInfo.notAfter,
                    'active',
                    JSON.stringify(certificateInfo),
                    parseInt(therapistId)
                ]
            );
        } else {
            // Create new record with only certificate fields
            await pool.query(
                `INSERT INTO therapist_nfse_config 
                 (therapist_id, certificate_file_path, certificate_password_encrypted, 
                  certificate_expires_at, certificate_status, certificate_info)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    parseInt(therapistId),
                    filePath,
                    JSON.stringify(encryptedPassword),
                    certificateInfo.notAfter,
                    'active',
                    JSON.stringify(certificateInfo)
                ]
            );
        }

        // Auto-register with Focus NFe if CNPJ is found in certificate
        let autoRegistered = false;
        let companyId = null;

        // Auto-register with Focus NFe if CNPJ is found in certificate
        if (certificateInfo.cnpj) {
            try {
                const config = await getTherapistConfig(parseInt(therapistId));

                // Check if already registered with same CNPJ
                if (config?.company_cnpj === certificateInfo.cnpj) {
                    console.log('Company already registered with same CNPJ, skipping registration');
                    autoRegistered = false;
                } else {
                    // MOCK MODE: Skip real Focus NFe calls
                    if (process.env.USE_MOCK_FOCUS_NFE === 'true' || process.env.FOCUS_NFE_SANDBOX === 'true') {
                        console.log('🔵 MOCK: Simulating company registration for CNPJ:', certificateInfo.cnpj);

                        await pool.query(
                            `UPDATE therapist_nfse_config 
                     SET company_cnpj = $1, 
                         provider_company_id = $2,
                         company_name = $3,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE therapist_id = $4`,
                            [
                                certificateInfo.cnpj,
                                `mock_${certificateInfo.cnpj}`,
                                certificateInfo.companyName || 'Empresa Mock',
                                parseInt(therapistId)
                            ]
                        );

                        autoRegistered = true;
                        companyId = `mock_${certificateInfo.cnpj}`;
                    }
                    // PRODUCTION MODE (commented out for now)
                    else {

                        // Check if already registered
                        const config = await getTherapistConfig(parseInt(therapistId));

                        if (!config.company_cnpj || config.company_cnpj !== certificateInfo.cnpj) {
                            // Not registered yet or different CNPJ - register now
                            const companyData = {
                                cnpj: certificateInfo.cnpj,
                                companyName: certificateInfo.companyName || `Empresa ${certificateInfo.cnpj}`,
                                email: certificateInfo.email || `nfe@empresa.com.br`,
                                address: {
                                    street: 'A definir',
                                    number: 'S/N',
                                    neighborhood: 'Centro',
                                    city: certificateInfo.city || 'São Paulo',
                                    state: certificateInfo.state || 'SP',
                                    zipCode: '00000-000'
                                }
                            };

                            // Register company using the service
                            companyId = await nfseService.registerCompany(parseInt(therapistId), companyData);
                            console.log(`Auto-registered company ${certificateInfo.cnpj} with Focus NFe`);
                            autoRegistered = true;
                        }

                        // Now upload certificate to Focus NFe
                        const provider = new FocusNFeProvider({
                            apiKey: process.env.FOCUS_NFE_API_KEY || '',
                            apiUrl: process.env.FOCUS_NFE_API_URL || 'https://api.focusnfe.com.br',
                            sandbox: process.env.FOCUS_NFE_SANDBOX === 'true'
                        });

                        await provider.uploadCompanyCertificate(certificateInfo.cnpj, {
                            buffer: file.buffer,
                            password
                        });

                        console.log('Certificate uploaded to Focus NFe for CNPJ:', certificateInfo.cnpj);
                    }
                }
            } catch (error) {
                console.warn('Auto-registration or certificate upload failed (non-critical):', error);
                // Don't fail the certificate upload if Focus NFe operations fail
            }
        }

        // Test certificate with provider
        try {
            const validation = await nfseService.validateCertificate(file.buffer, password);
            if (!validation.isValid) {
                console.warn('Certificate validation warning:', validation.error);
            }
        } catch (error) {
            console.warn(`Provider certificate validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        return res.json({
            message: 'Certificate uploaded and validated successfully',
            certificateInfo: {
                commonName: certificateInfo.commonName,
                issuer: certificateInfo.issuer,
                expiresAt: certificateInfo.notAfter,
                isValid: certificateInfo.isValid,
                cnpj: certificateInfo.cnpj,
                companyName: certificateInfo.companyName,
                autoRegistered: autoRegistered,
                companyId: companyId
            }
        });
    } catch (error) {
        console.error('Certificate upload error:', error);
        return res.status(400).json({
            error: `Certificate upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
    }
}));

// 2. Get certificate status
router.get("/certificate/status/:therapistId", asyncHandler(async (req, res) => {
    const { therapistId } = req.params;

    try {
        const config = await getTherapistConfig(parseInt(therapistId));

        if (!config || !config.certificate_file_path) {
            return res.json({
                hasValidCertificate: false,
                status: 'not_uploaded'
            });
        }

        const certificateInfo = config.certificate_info ?
            (typeof config.certificate_info === 'string' ?
                JSON.parse(config.certificate_info) :
                config.certificate_info) : {};

        const now = new Date();
        const expiresAt = new Date(config.certificate_expires_at);
        const isExpired = expiresAt < now;
        const expiresIn30Days = (expiresAt.getTime() - now.getTime()) < (30 * 24 * 60 * 60 * 1000);

        return res.json({
            hasValidCertificate: !isExpired,
            status: isExpired ? 'expired' : config.certificate_status,
            expiresAt: config.certificate_expires_at,
            expiresIn30Days,
            certificateInfo: {
                commonName: certificateInfo.commonName,
                issuer: certificateInfo.issuer,
                cnpj: certificateInfo.cnpj,
                companyName: certificateInfo.companyName 
            }
        });
    } catch (error) {
        console.error('Certificate status error:', error);
        return res.status(500).json({ error: 'Failed to get certificate status' });
    }
}));

// 3. Register company with NFS-e provider
router.post("/company/register", asyncHandler<CompanyRegistrationBody>(async (req, res) => {
    const { therapistId, companyData } = req.body;

    if (!therapistId || !companyData) {
        return res.status(400).json({ error: "Therapist ID and company data are required" });
    }

    try {
        const config = await getTherapistConfig(parseInt(therapistId));

        if (!config || !config.certificate_file_path) {
            return res.status(400).json({ error: "Certificate must be uploaded first" });
        }

        // Register company with provider
        const companyId = await nfseService.registerCompany(parseInt(therapistId), companyData);

        // Store company data in individual columns (form-friendly approach)
        await pool.query(
            `UPDATE therapist_nfse_config 
             SET provider_company_id = $1,
                 company_cnpj = $2,
                 company_name = $3,
                 company_municipal_registration = $4,
                 company_state_registration = $5,
                 company_email = $6,
                 company_phone = $7,
                 company_address = $8,
                 updated_at = CURRENT_TIMESTAMP
             WHERE therapist_id = $9`,
            [
                companyId,
                companyData.cnpj,
                companyData.companyName,
                companyData.municipalRegistration,
                companyData.stateRegistration,
                companyData.email,
                companyData.phone,
                JSON.stringify(companyData.address),
                parseInt(therapistId)
            ]
        );

        return res.json({
            message: 'Company registered successfully',
            companyId
        });
    } catch (error) {
        console.error('Company registration error:', error);
        return res.status(400).json({
            error: `Company registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
    }
}));

// 4. Generate invoice (single endpoint - test mode controlled by database config)
router.post("/invoice/generate", asyncHandler(async (req, res) => {
    const { therapistId, patientId, year, month, sessionIds, customerData } = req.body;

    console.log("=== INVOICE GENERATION ===");
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    // Validate required fields
    if (!therapistId || !patientId || !year || !month) {
        return res.status(400).json({
            error: "Therapist ID, patient ID, year, and month are required"
        });
    }

    try {
        const testMode = await isTestMode();

        // Check if invoice already exists for this billing period (unless in test mode)
        if (!testMode) {
            const existingInvoice = await pool.query(
                `SELECT i.* 
                 FROM nfse_invoices i
                 JOIN billing_period_invoices bpi ON i.id = bpi.invoice_id
                 JOIN monthly_billing_periods bp ON bpi.billing_period_id = bp.id
                 WHERE bp.therapist_id = $1 
                   AND bp.patient_id = $2 
                   AND bp.billing_year = $3 
                   AND bp.billing_month = $4
                   AND i.invoice_status NOT IN ('cancelled', 'error')`,
                [therapistId, patientId, year, month]
            );

            if (existingInvoice.rows.length > 0) {
                return res.status(400).json({
                    error: "Invoice already exists for this billing period",
                    existingInvoice: existingInvoice.rows[0]
                });
            }
        }

        const config = await getTherapistConfig(parseInt(therapistId));

        if (!config || !config.provider_company_id) {
            return res.status(400).json({ error: "Company must be registered first" });
        }

        // Check if billing period exists
        const billingPeriod = await pool.query(
            `SELECT * FROM monthly_billing_periods 
             WHERE therapist_id = $1 
               AND patient_id = $2 
               AND billing_year = $3 
               AND billing_month = $4
               AND status != 'void'`,
            [therapistId, patientId, year, month]
        );

        if (billingPeriod.rows.length === 0) {
            return res.status(404).json({
                error: "No billing period found for this patient and month. Please process monthly charges first."
            });
        }

        // Generate invoice using the unified method
        const result = await nfseService.generateInvoiceForSessions(
            parseInt(therapistId),
            parseInt(patientId),
            parseInt(year),
            parseInt(month),
            sessionIds, // Optional: specific sessions only
            customerData
        );

        return res.json({
            message: `${testMode ? 'Test' : 'Production'} invoice generated successfully`,
            invoice: result,
            billingPeriod: {
                id: billingPeriod.rows[0].id,
                sessionCount: billingPeriod.rows[0].session_count,
                totalAmount: billingPeriod.rows[0].total_amount
            },
            testMode
        });
    } catch (error) {
        console.error('Invoice generation error:', error);
        return res.status(400).json({
            error: `Invoice generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
    }
}))

// 5. Get therapist's invoices
router.get("/invoices/:therapistId", asyncHandler(async (req, res) => {
    const { therapistId } = req.params;
    const { limit = '50', offset = '0', status } = req.query;

    try {
        let query = `
          SELECT i.*, s.date as session_date, p.nome as patient_name
          FROM nfse_invoices i
          JOIN sessions s ON i.session_id = s.id
          JOIN patients p ON s.patient_id = p.id
          WHERE i.therapist_id = $1
        `;

        const queryParams = [therapistId];
        let paramCount = 1;

        if (status) {
            query += ` AND i.invoice_status = $${++paramCount}`;
            queryParams.push(status as string);
        }

        query += ` ORDER BY i.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
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

// 6. Get invoice status
router.get("/invoice/:invoiceId/status", asyncHandler(async (req, res) => {
    const { invoiceId } = req.params;

    try {
        const result = await pool.query(
            `SELECT i.*, t.provider_company_id 
             FROM nfse_invoices i
             JOIN therapist_nfse_config t ON i.therapist_id = t.therapist_id
             WHERE i.id = $1`,
            [invoiceId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Invoice not found" });
        }

        const invoice = result.rows[0];

        // Get updated status from provider
        const status = await nfseService.getInvoiceStatus(
            invoice.provider_company_id,
            invoice.provider_invoice_id
        );

        // Update database if status changed
        if (status.status !== invoice.invoice_status) {
            await pool.query(
                `UPDATE nfse_invoices 
                 SET invoice_status = $1, pdf_url = $2, xml_url = $3, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $4`,
                [status.status, status.pdfUrl, status.xmlUrl, invoiceId]
            );
        }

        return res.json(status);
    } catch (error) {
        console.error('Get invoice status error:', error);
        return res.status(500).json({ error: 'Failed to get invoice status' });
    }
}));

// 7. Update NFSe settings
router.put("/settings", asyncHandler<NFSeSettingsBody>(async (req, res) => {
    const { therapistId, settings } = req.body;

    if (!therapistId || !settings) {
        return res.status(400).json({ error: "Therapist ID and settings are required" });
    }

    try {
        // Check if config exists first
        const existingConfig = await getTherapistConfig(parseInt(therapistId));

        if (existingConfig) {
            // Update existing record
            await pool.query(
                `UPDATE therapist_nfse_config 
                 SET default_service_code = $1, 
                     default_tax_rate = $2, 
                     default_service_description = $3,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE therapist_id = $4`,
                [settings.serviceCode, settings.taxRate, settings.defaultServiceDescription, parseInt(therapistId)]
            );
        } else {
            // Create new record with required fields
            await pool.query(
                `INSERT INTO therapist_nfse_config 
                 (therapist_id, default_service_code, default_tax_rate, default_service_description)
                 VALUES ($1, $2, $3, $4)`,
                [parseInt(therapistId), settings.serviceCode, settings.taxRate, settings.defaultServiceDescription]
            );
        }

        return res.json({
            message: 'NFS-e settings updated successfully',
            settings
        });
    } catch (error) {
        console.error('Update settings error:', error);
        return res.status(500).json({ error: 'Failed to update settings' });
    }
}));

// 8. Get NFSe settings
router.get("/settings/:therapistId", asyncHandler(async (req, res) => {
    const { therapistId } = req.params;

    try {
        const config = await getTherapistConfig(parseInt(therapistId));

        // Map your existing database columns to the expected settings format
        const settings = config ? {
            serviceCode: config.default_service_code || '14.01',
            taxRate: parseFloat(config.default_tax_rate) || 5,
            defaultServiceDescription: config.default_service_description || 'Serviços de Psicologia',
            issWithholding: false // Default since no column exists for this
        } : {
            serviceCode: '14.01',
            taxRate: 5,
            defaultServiceDescription: 'Serviços de Psicologia',
            issWithholding: false
        };

        return res.json({ settings });
    } catch (error) {
        console.error('Get settings error:', error);
        return res.status(500).json({ error: 'Failed to get settings' });
    }
}));

// 9. Test provider connection
router.get("/test-connection", asyncHandler(async (req, res) => {
    try {
        const isConnected = await nfseService.testConnection();
        const testMode = await isTestMode();
        const currentProvider = await getCurrentProvider();

        return res.json({
            connected: isConnected,
            currentProvider,
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

// 10. Get available service codes
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

// Generate period-based invoice (for monthly billing periods)
router.post("/invoice/generate-period", asyncHandler(async (req, res) => {
    const { therapistId, patientId, year, month, customerData } = req.body;

    console.log("=== PERIOD INVOICE GENERATION ===");
    console.log("Request:", { therapistId, patientId, year, month });

    if (!therapistId || !patientId || !year || !month) {
        return res.status(400).json({
            error: "Therapist ID, patient ID, year, and month are required"
        });
    }

    try {
        // Check if period invoice already exists
        const existingInvoice = await pool.query(
            `SELECT i.* 
             FROM nfse_invoices i
             JOIN billing_period_invoices bpi ON i.id = bpi.invoice_id
             JOIN monthly_billing_periods bp ON bpi.billing_period_id = bp.id
             WHERE bp.therapist_id = $1 
               AND bp.patient_id = $2 
               AND bp.billing_year = $3 
               AND bp.billing_month = $4
               AND i.invoice_status NOT IN ('cancelled', 'error')`,
            [therapistId, patientId, year, month]
        );

        if (existingInvoice.rows.length > 0) {
            return res.status(400).json({
                error: "Invoice already exists for this billing period",
                existingInvoice: existingInvoice.rows[0]
            });
        }

        // Check if billing period exists
        const billingPeriod = await pool.query(
            `SELECT * FROM monthly_billing_periods 
             WHERE therapist_id = $1 
               AND patient_id = $2 
               AND billing_year = $3 
               AND billing_month = $4
               AND status != 'void'`,
            [therapistId, patientId, year, month]
        );

        if (billingPeriod.rows.length === 0) {
            return res.status(404).json({
                error: "No billing period found for this patient and month"
            });
        }

        // Generate the period invoice
        const result = await nfseService.generateInvoiceForSessions(
            parseInt(therapistId),
            parseInt(patientId),
            parseInt(year),
            parseInt(month),
            customerData
        );

        return res.json({
            message: 'Period invoice generated successfully',
            invoice: result,
            billingPeriod: {
                id: billingPeriod.rows[0].id,
                sessionCount: billingPeriod.rows[0].session_count,
                totalAmount: billingPeriod.rows[0].total_amount
            }
        });
    } catch (error) {
        console.error('Period invoice generation error:', error);
        return res.status(400).json({
            error: `Period invoice generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
    }
}));

// In src/routes/nfse.ts
router.get("/billing/first-available/:therapistId", asyncHandler(async (req, res) => {
    const { therapistId } = req.params;

    // Get the most recent billing period with sessions
    const result = await pool.query(
        `SELECT 
            bp.id as billing_period_id,
            bp.patient_id,
            bp.billing_year as year,
            bp.billing_month as month,
            bp.session_count,
            bp.total_amount,
            p.nome as patient_name,
            p.cpf as patient_document
        FROM monthly_billing_periods bp
        JOIN patients p ON bp.patient_id = p.id
        WHERE bp.therapist_id = $1 
            AND bp.status != 'void'
            AND bp.session_count > 0
        ORDER BY bp.billing_year DESC, bp.billing_month DESC
        LIMIT 1`,
        [therapistId]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({
            error: "No billing periods available. Process monthly charges first."
        });
    }

    return res.json(result.rows[0]);
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