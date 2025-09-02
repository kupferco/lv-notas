// clinic-api/src/routes/monthly-billing.ts
import express, { Router, Request, Response, NextFunction } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import { monthlyBillingService } from "../services/monthly-billing.js";
import pool from "../config/database.js";
import { googleCalendarService } from "../services/google-calendar.js";
import * as XLSX from 'xlsx';

const router: Router = Router();

// Type-safe handler
const asyncHandler = (
    handler: (
        req: Request<ParamsDictionary, any, any>,
        res: Response
    ) => Promise<Response | void>
) => {
    return async (
        req: Request<ParamsDictionary, any, any>,
        res: Response,
        next: NextFunction
    ) => {
        try {
            await handler(req, res);
        } catch (error) {
            next(error);
        }
    };
};

// GET /api/monthly-billing/summary?therapistEmail=&year=&month=
// Get billing summary for a therapist for a specific month
router.get("/summary", asyncHandler(async (req, res) => {
    const therapistEmail = req.query.therapistEmail as string;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;

    if (!therapistEmail) {
        return res.status(400).json({ error: "therapistEmail is required" });
    }

    if (month < 1 || month > 12) {
        return res.status(400).json({ error: "month must be between 1 and 12" });
    }

    try {
        const userAccessToken = req.headers['x-calendar-token'] as string;
        const summary = await monthlyBillingService.getBillingSummary(
            therapistEmail,
            year,
            month,
            userAccessToken
        );

        // console.log('=== MONTHLY BILLING SUMMARY DEBUG ===');
        // console.log('therapistEmail:', therapistEmail);
        // console.log('year:', year, 'month:', month);
        // console.log('summary:', summary);
        // console.log('userAccessToken:', userAccessToken ? 'Present' : 'Missing');
        // console.log('Headers x-calendar-token:', req.headers['x-calendar-token'] ? 'Present' : 'Missing');
        // console.log('Headers x-google-access-token:', req.headers['x-google-access-token'] ? 'Present' : 'Missing');

        return res.json({
            year,
            month,
            summary
        });
    } catch (error) {
        console.error('Error getting billing summary:', error);
        return res.status(500).json({
            error: "Failed to get billing summary",
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));

// GET /api/monthly-billing/export-csv?therapistEmail=&year=&month=
// Fixed CSV export with correct table names and session dates column
router.get("/export-csv", asyncHandler(async (req, res) => {
    const therapistEmail = req.query.therapistEmail as string;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;

    if (!therapistEmail) {
        return res.status(400).json({ error: "therapistEmail is required" });
    }

    if (month < 1 || month > 12) {
        return res.status(400).json({ error: "month must be between 1 and 12" });
    }

    try {
        const userAccessToken = req.headers['x-calendar-token'] as string;

        // Get billing summary
        const summary = await monthlyBillingService.getBillingSummary(
            therapistEmail,
            year,
            month,
            userAccessToken
        );

        // Filter out patients with zero sessions
        const patientsWithSessions = summary.filter(patient => patient.sessionCount > 0);

        // Get detailed patient info for CSV
        const csvData = await Promise.all(
            patientsWithSessions.map(async (billingSummary) => {
                // Get patient details from database
                const patientResult = await pool.query(
                    `SELECT 
                        p.nome as name,
                        p.email,
                        p.telefone,
                        p.cpf,
                        p.therapy_start_date,
                        p.lv_notas_billing_start_date,
                        CAST(p.preco AS INTEGER) as session_price
                    FROM patients p 
                    INNER JOIN therapists t ON p.therapist_id = t.id 
                    WHERE p.id = $1 AND t.email = $2`,
                    [billingSummary.patientId, therapistEmail]
                );

                const patient = patientResult.rows[0];

                // Get payment details if billing period exists (using correct table name)
                let paymentDate = '';
                let paymentMethod = '';
                let paymentReference = '';

                if (billingSummary.billingPeriodId) {
                    const paymentResult = await pool.query(
                        `SELECT 
                            payment_date,
                            payment_method,
                            reference_number
                        FROM monthly_billing_payments 
                        WHERE billing_period_id = $1 
                        ORDER BY created_at DESC 
                        LIMIT 1`,
                        [billingSummary.billingPeriodId]
                    );

                    if (paymentResult.rows.length > 0) {
                        const payment = paymentResult.rows[0];
                        paymentDate = payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('pt-BR') : '';
                        paymentMethod = payment.payment_method ? payment.payment_method.toUpperCase() : '';
                        paymentReference = payment.reference_number || '';
                    }
                }

                // ✨ NEW: Get session dates from billing period or billing summary
                let sessionDates = '';
                if (billingSummary.billingPeriodId) {
                    // Get session snapshots from stored billing period
                    const sessionResult = await pool.query(
                        'SELECT session_snapshots FROM monthly_billing_periods WHERE id = $1',
                        [billingSummary.billingPeriodId]
                    );

                    if (sessionResult.rows.length > 0 && sessionResult.rows[0].session_snapshots) {
                        const sessions = sessionResult.rows[0].session_snapshots;
                        sessionDates = sessions
                            .map((session: any) => new Date(session.date).getDate())
                            .sort((a: number, b: number) => a - b)
                            .join(' / ');
                    }
                } else if (billingSummary.sessionSnapshots) {
                    // Use session snapshots from billing summary (not processed yet)
                    sessionDates = billingSummary.sessionSnapshots
                        .map(session => new Date(session.date).getDate())
                        .sort((a: number, b: number) => a - b)
                        .join(' / ');
                }

                return {
                    patientName: patient?.name || billingSummary.patientName || 'Nome não encontrado',
                    email: patient?.email || '',
                    telefone: patient?.telefone || '',
                    cpf: patient?.cpf || '',
                    sessionCount: billingSummary.sessionCount,
                    sessionDates, // ✨ NEW: Session dates formatted as "2 / 8 / 22"
                    sessionPrice: patient?.session_price ? (patient.session_price / 100).toFixed(2) : '',
                    totalAmount: (billingSummary.totalAmount / 100).toFixed(2),
                    status: getStatusText(billingSummary.status || 'can_process'),
                    paymentDate,
                    paymentMethod,
                    paymentReference,
                    therapyStartDate: patient?.therapy_start_date ? new Date(patient.therapy_start_date).toLocaleDateString('pt-BR') : '',
                    billingStartDate: patient?.lv_notas_billing_start_date ? new Date(patient.lv_notas_billing_start_date).toLocaleDateString('pt-BR') : ''
                };
            })
        );

        // Helper function to get status text
        function getStatusText(status: string): string {
            switch (status) {
                case 'can_process': return 'Pode Processar';
                case 'processed': return 'Processado';
                case 'paid': return 'Pago';
                case 'void': return 'Cancelado';
                default: return 'Status Desconhecido';
            }
        }

        // ✨ UPDATED: CSV headers with new session dates column
        const csvHeaders = [
            'Nome Completo',
            'Email',
            'Telefone',
            'CPF',
            'Número de Sessões',
            'Datas das Sessões', // ✨ NEW: Session dates column
            'Valor por Sessão',
            'Valor Total',
            'Status do Pagamento',
            'Data do Pagamento',
            'Método de Pagamento',
            'Referência do Pagamento',
            'Início da Terapia',
            'Início Cobrança LV Notas'
        ];

        // ✨ UPDATED: CSV rows with new session dates column
        const csvRows = csvData.map(row => [
            `"${row.patientName}"`,
            `"${row.email}"`,
            `"${row.telefone}"`,
            `"${row.cpf}"`,
            row.sessionCount.toString(),
            `"${row.sessionDates}"`, // ✨ NEW: Session dates data
            `"${row.sessionPrice}"`,
            `"${row.totalAmount}"`,
            `"${row.status}"`,
            `"${row.paymentDate}"`,
            `"${row.paymentMethod}"`,
            `"${row.paymentReference}"`,
            `"${row.therapyStartDate}"`,
            `"${row.billingStartDate}"`
        ]);

        // Sum the total amounts
        const totalAmountSum = csvData.reduce((acc, row) => acc + parseFloat(row.totalAmount), 0).toFixed(2);

        // ✨ UPDATED: Summary row with empty session dates column
        csvRows.push(['', '', '', '', '', '', 'TOTAL', totalAmountSum, '', '', '', '', '', '']);

        // Add UTF-8 BOM for proper Excel encoding
        const BOM = '\uFEFF';
        const csvContent = BOM +
            csvHeaders.join(',') + '\n' +
            csvRows.map(row => row.join(',')).join('\n');

        // Set response headers for file download
        const filename = `cobranca-mensal-${year}-${month.toString().padStart(2, '0')}.csv`;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Cache-Control', 'no-cache');

        console.log(`📊 CSV export generated: ${csvData.length} patients with sessions for ${month}/${year}`);

        // Add this temporary debug code after csvData is created
        console.log('=== CSV DEBUG ===');
        console.log('Number of patients:', csvData.length);
        csvData.forEach((patient, index) => {
            console.log(`Patient ${index + 1}:`, {
                name: patient.patientName,
                sessionDates: patient.sessionDates,
                sessionCount: patient.sessionCount
            });
        });
        console.log('=== END CSV DEBUG ===');

        return res.send(csvContent);

    } catch (error) {
        console.error('Error generating CSV export:', error);
        return res.status(500).json({
            error: "Failed to generate CSV export",
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));

// GET /api/monthly-billing/export-excel?therapistEmail=&year=&month=
// Excel export with correct table names and session dates column
router.get("/export-excel", asyncHandler(async (req, res) => {
    const therapistEmail = req.query.therapistEmail as string;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;

    if (!therapistEmail) {
        return res.status(400).json({ error: "therapistEmail is required" });
    }

    if (month < 1 || month > 12) {
        return res.status(400).json({ error: "month must be between 1 and 12" });
    }

    try {
        const userAccessToken = req.headers['x-calendar-token'] as string;

        // Get billing summary
        const summary = await monthlyBillingService.getBillingSummary(
            therapistEmail,
            year,
            month,
            userAccessToken
        );

        // Filter out patients with zero sessions
        const patientsWithSessions = summary.filter(patient => patient.sessionCount > 0);

        // Get detailed patient info for CSV
        const csvData = await Promise.all(
            patientsWithSessions.map(async (billingSummary) => {
                // Get patient details from database
                const patientResult = await pool.query(
                    `SELECT 
                        p.nome as name,
                        p.email,
                        p.telefone,
                        p.cpf,
                        p.therapy_start_date,
                        p.lv_notas_billing_start_date,
                        CAST(p.preco AS INTEGER) as session_price
                    FROM patients p 
                    INNER JOIN therapists t ON p.therapist_id = t.id 
                    WHERE p.id = $1 AND t.email = $2`,
                    [billingSummary.patientId, therapistEmail]
                );

                const patient = patientResult.rows[0];

                // Get payment details if billing period exists (using correct table name)
                let paymentDate = '';
                let paymentMethod = '';
                let paymentReference = '';

                if (billingSummary.billingPeriodId) {
                    const paymentResult = await pool.query(
                        `SELECT 
                            payment_date,
                            payment_method,
                            reference_number
                        FROM monthly_billing_payments 
                        WHERE billing_period_id = $1 
                        ORDER BY created_at DESC 
                        LIMIT 1`,
                        [billingSummary.billingPeriodId]
                    );

                    if (paymentResult.rows.length > 0) {
                        const payment = paymentResult.rows[0];
                        paymentDate = payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('pt-BR') : '';
                        paymentMethod = payment.payment_method ? payment.payment_method.toUpperCase() : '';
                        paymentReference = payment.reference_number || '';
                    }
                }

                // ✨ NEW: Get session dates from billing period or billing summary
                let sessionDates = '';
                if (billingSummary.billingPeriodId) {
                    // Get session snapshots from stored billing period
                    const sessionResult = await pool.query(
                        'SELECT session_snapshots FROM monthly_billing_periods WHERE id = $1',
                        [billingSummary.billingPeriodId]
                    );
                    
                    if (sessionResult.rows.length > 0 && sessionResult.rows[0].session_snapshots) {
                        const sessions = sessionResult.rows[0].session_snapshots;
                        sessionDates = sessions
                            .map((session: any) => new Date(session.date).getDate())
                            .sort((a: number, b: number) => a - b)
                            .join(' / ');
                    }
                } else if (billingSummary.sessionSnapshots) {
                    // Use session snapshots from billing summary (not processed yet)
                    sessionDates = billingSummary.sessionSnapshots
                        .map(session => new Date(session.date).getDate())
                        .sort((a: number, b: number) => a - b)
                        .join(' / ');
                }

                return {
                    patientName: patient?.name || billingSummary.patientName || 'Nome não encontrado',
                    email: patient?.email || '',
                    telefone: patient?.telefone || '',
                    cpf: patient?.cpf || '',
                    sessionCount: billingSummary.sessionCount,
                    sessionDates, // ✨ NEW: Session dates formatted as "2 / 8 / 22"
                    sessionPrice: patient?.session_price ? (patient.session_price / 100).toFixed(2) : '',
                    totalAmount: (billingSummary.totalAmount / 100).toFixed(2),
                    status: getStatusText(billingSummary.status || 'can_process'),
                    paymentDate,
                    paymentMethod,
                    paymentReference,
                    therapyStartDate: patient?.therapy_start_date ? new Date(patient.therapy_start_date).toLocaleDateString('pt-BR') : '',
                    billingStartDate: patient?.lv_notas_billing_start_date ? new Date(patient.lv_notas_billing_start_date).toLocaleDateString('pt-BR') : ''
                };
            })
        );

        // Helper function to get status text
        function getStatusText(status: string): string {
            switch (status) {
                case 'can_process': return 'Pode Processar';
                case 'processed': return 'Processado';
                case 'paid': return 'Pago';
                case 'void': return 'Cancelado';
                default: return 'Status Desconhecido';
            }
        }

        // ✨ UPDATED: Excel headers with new session dates column
        const excelHeaders = [
            'Nome Completo',
            'Email',
            'Telefone',
            'CPF',
            'Número de Sessões',
            'Datas das Sessões', // ✨ NEW: Session dates column
            'Valor por Sessão',
            'Valor Total',
            'Status do Pagamento',
            'Data do Pagamento',
            'Método de Pagamento',
            'Referência do Pagamento',
            'Início da Terapia',
            'Início Cobrança LV Notas'
        ];

        // ✨ UPDATED: Excel data with new session dates column
        const excelData = csvData.map(row => [
            row.patientName,
            row.email,
            row.telefone,
            row.cpf,
            row.sessionCount,
            row.sessionDates, // ✨ NEW: Session dates data
            row.sessionPrice,
            row.totalAmount,
            row.status,
            row.paymentDate,
            row.paymentMethod,
            row.paymentReference,
            row.therapyStartDate,
            row.billingStartDate
        ]);
        
        // Sum the total amounts
        const totalAmountSum = csvData.reduce((acc, row) => acc + parseFloat(row.totalAmount), 0).toFixed(2);

        // ✨ UPDATED: Summary row with empty session dates column
        excelData.push(['', '', '', '', '', '', 'TOTAL', totalAmountSum, '', '', '', '', '', '']);

        // Create Excel workbook and worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet([excelHeaders, ...excelData]);

        // Set column widths for better readability
        const columnWidths = [
            { wch: 25 }, // Nome Completo
            { wch: 30 }, // Email
            { wch: 15 }, // Telefone
            { wch: 15 }, // CPF
            { wch: 12 }, // Número de Sessões
            { wch: 20 }, // Datas das Sessões
            { wch: 15 }, // Valor por Sessão
            { wch: 12 }, // Valor Total
            { wch: 18 }, // Status do Pagamento
            { wch: 15 }, // Data do Pagamento
            { wch: 18 }, // Método de Pagamento
            { wch: 20 }, // Referência do Pagamento
            { wch: 15 }, // Início da Terapia
            { wch: 20 }  // Início Cobrança LV Notas
        ];
        worksheet['!cols'] = columnWidths;

        // Style the header row (optional - makes it bold)
        const headerRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
            const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
            if (worksheet[cellRef]) {
                worksheet[cellRef].s = {
                    font: { bold: true },
                    fill: { fgColor: { rgb: "E0E0E0" } }
                };
            }
        }

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Cobrança Mensal');

        // Generate Excel buffer
        const excelBuffer = XLSX.write(workbook, { 
            type: 'buffer', 
            bookType: 'xlsx',
            compression: true 
        });

        // Set response headers for Excel file download
        const filename = `cobranca-mensal-${year}-${month.toString().padStart(2, '0')}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', excelBuffer.length.toString());
        res.setHeader('Cache-Control', 'no-cache');

        console.log(`📊 Excel export generated: ${csvData.length} patients with sessions for ${month}/${year}`);

        // Add this temporary debug code after csvData is created
        console.log('=== EXCEL DEBUG ===');
        console.log('Number of patients:', csvData.length);
        csvData.forEach((patient, index) => {
            console.log(`Patient ${index + 1}:`, {
                name: patient.patientName,
                sessionDates: patient.sessionDates,
                sessionCount: patient.sessionCount
            });
        });
        console.log('=== END EXCEL DEBUG ===');

        return res.send(excelBuffer);

    } catch (error) {
        console.error('Error generating CSV export:', error);
        return res.status(500).json({
            error: "Failed to generate CSV export",
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));

// POST /api/monthly-billing/process
// Process monthly charges for a specific patient
router.post("/process", asyncHandler(async (req, res) => {
    const { therapistEmail, patientId, year, month } = req.body;
    const userAccessToken = req.headers['x-calendar-token'] as string;

    if (!therapistEmail || !patientId || !year || !month) {
        return res.status(400).json({
            error: "therapistEmail, patientId, year, and month are required"
        });
    }

    if (month < 1 || month > 12) {
        return res.status(400).json({ error: "month must be between 1 and 12" });
    }

    try {
        const billingPeriod = await monthlyBillingService.processMonthlyCharges(
            therapistEmail,
            parseInt(patientId),
            parseInt(year),
            parseInt(month),
            userAccessToken
        );

        return res.json({
            message: "Monthly charges processed successfully",
            billingPeriod
        });
    } catch (error) {
        console.error('Error processing monthly charges:', error);
        return res.status(500).json({
            error: "Failed to process monthly charges",
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));

// PUT /api/monthly-billing/:billingPeriodId/void
// Void a billing period
router.put("/:billingPeriodId/void", asyncHandler(async (req, res) => {
    const { billingPeriodId } = req.params;
    const { therapistEmail, reason } = req.body;

    if (!therapistEmail) {
        return res.status(400).json({ error: "therapistEmail is required" });
    }

    try {
        const success = await monthlyBillingService.voidBillingPeriod(
            parseInt(billingPeriodId),
            therapistEmail,
            reason
        );

        if (success) {
            return res.json({
                message: "Billing period voided successfully",
                billingPeriodId: parseInt(billingPeriodId)
            });
        } else {
            return res.status(400).json({
                error: "Cannot void billing period",
                details: "Period may have payments or is already voided"
            });
        }
    } catch (error) {

    }
}));

// GET /api/monthly-billing/:billingPeriodId
// Get billing period details by ID
router.get("/:billingPeriodId", asyncHandler(async (req, res) => {
    const { billingPeriodId } = req.params;
    const therapistEmail = req.query.therapistEmail as string;

    if (!billingPeriodId || isNaN(parseInt(billingPeriodId))) {
        return res.status(400).json({ error: "Valid billingPeriodId is required" });
    }

    try {
        const billingPeriod = await monthlyBillingService.getBillingPeriodDetails(
            parseInt(billingPeriodId)
        );

        return res.json(billingPeriod);
    } catch (error) {
        console.error('Error getting billing period details:', error);
        return res.status(500).json({
            error: "Failed to get billing period details",
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));

// Add this new debug route
router.get("/debug-calendars", asyncHandler(async (req, res) => {
    const therapistEmail = req.query.therapistEmail as string;
    const userAccessToken = req.headers['x-calendar-token'] as string;

    if (!therapistEmail || !userAccessToken) {
        return res.status(400).json({ error: "therapistEmail and userAccessToken required" });
    }

    try {
        // List calendars the user has access to
        const calendars = await googleCalendarService.listUserCalendars(userAccessToken);

        // Get therapist's stored calendar ID
        const therapistResult = await pool.query(
            'SELECT google_calendar_id FROM therapists WHERE email = $1',
            [therapistEmail]
        );

        const storedCalendarId = therapistResult.rows[0]?.google_calendar_id;

        return res.json({
            message: "Calendar debug info",
            userAccessibleCalendars: calendars,
            storedCalendarId: storedCalendarId,
            canAccessStoredCalendar: calendars.some(cal => cal.id === storedCalendarId)
        });
    } catch (error) {
        console.error('Calendar debug error:', error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error',
            details: error
        });
    }
}));

// POST /api/monthly-billing/:billingPeriodId/payments
// Record a payment for a billing period
router.post("/:billingPeriodId/payments", asyncHandler(async (req, res) => {
    const { billingPeriodId } = req.params;
    const { amount, paymentMethod, paymentDate, therapistEmail, referenceNumber, notes } = req.body;

    if (!billingPeriodId || isNaN(parseInt(billingPeriodId))) {
        return res.status(400).json({ error: "Valid billingPeriodId is required" });
    }

    if (!amount || !paymentMethod || !paymentDate || !therapistEmail) {
        return res.status(400).json({
            error: "amount, paymentMethod, paymentDate, and therapistEmail are required"
        });
    }

    try {
        const payment = await monthlyBillingService.recordPayment(
            parseInt(billingPeriodId),
            parseInt(amount), // Amount should be in cents
            paymentMethod,
            new Date(paymentDate),
            therapistEmail,
            referenceNumber,
            notes
        );

        return res.json({
            message: "Payment recorded successfully",
            payment
        });
    } catch (error) {
        console.error('Error recording payment:', error);
        return res.status(500).json({
            error: "Failed to record payment",
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));

// DELETE /api/monthly-billing/payments/:paymentId
// Delete a payment (optional - for completeness)
router.delete("/payments/:paymentId", asyncHandler(async (req, res) => {
    const { paymentId } = req.params;

    if (!paymentId || isNaN(parseInt(paymentId))) {
        return res.status(400).json({ error: "Valid paymentId is required" });
    }

    try {
        const success = await monthlyBillingService.deletePayment(parseInt(paymentId));

        if (success) {
            return res.json({
                message: "Payment deleted successfully",
                paymentId: parseInt(paymentId)
            });
        } else {
            return res.status(404).json({
                error: "Payment not found or could not be deleted"
            });
        }
    } catch (error) {
        console.error('Error deleting payment:', error);
        return res.status(500).json({
            error: "Failed to delete payment",
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));

export default router;