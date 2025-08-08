// clinic-api/src/services/monthly-billing.ts
import pool from "../config/database.js";
import { googleCalendarService } from "./google-calendar.js";

export interface SessionSnapshot {
    date: string; // ISO string
    time: string; // HH:MM format
    googleEventId: string;
    patientName: string;
    duration?: number; // minutes
}

export interface BillingPeriod {
    id: number;
    therapistId: number;
    patientId: number;
    billingYear: number;
    billingMonth: number;
    sessionCount: number;
    totalAmount: number; // in cents
    sessionSnapshots: SessionSnapshot[];
    processedAt: Date;
    processedBy: string;
    status: 'processed' | 'paid' | 'void';
    canBeVoided: boolean;
    payments?: any[];
}

export interface BillingPayment {
    id: number;
    billingPeriodId: number;
    amount: number; // in cents
    paymentMethod: string;
    paymentDate: Date;
    referenceNumber?: string;
    recordedBy: string;
    notes?: string;
}

// ENHANCED: Updated with outstanding balance and payment matching support
export interface BillingSummary {
    patientName: string;
    patientId: number;
    billingPeriodId?: number;
    sessionCount: number;
    totalAmount: number; // in cents
    status?: 'processed' | 'paid' | 'void';
    hasPayment: boolean;
    processedAt?: Date;
    canProcess: boolean; // true if no billing period exists yet
    sessionSnapshots?: SessionSnapshot[];
    // ENHANCED: Outstanding balance fields
    outstandingBalance: number; // in cents - from previous months
    totalOwed: number; // in cents - current + outstanding
    hasOutstandingBalance: boolean;
    oldestUnpaidMonth?: number;
    oldestUnpaidYear?: number;
    // ENHANCED: Payment matching fields
    hasMatchedPayment?: boolean;
    matchedTransaction?: {
        id: string;
        amount: number;
        description: string;
        date: string;
        confidence: number;
        matchType: string;
    };
    canPayCurrentMonth: boolean; // false if outstanding balance blocks current payment
}

interface PatientInfo {
    id: number;
    name: string;
    email: string | null;
    billingStartDate: Date | null;
    sessionPrice: number;
}

// ENHANCED: Add outstanding balance information
export interface OutstandingBalance {
    patientId: number;
    totalOutstanding: number; // in cents
    oldestUnpaidMonth: number;
    oldestUnpaidYear: number;
    unpaidBillingPeriods: Array<{
        id: number;
        year: number;
        month: number;
        amount: number;
        sessionCount: number;
    }>;
}

export class MonthlyBillingService {

    /**
     * Get therapist ID by email
     */
    private async getTherapistIdByEmail(therapistEmail: string): Promise<number | null> {
        try {
            const result = await pool.query(
                'SELECT id FROM therapists WHERE email = $1',
                [therapistEmail]
            );

            return result.rows.length > 0 ? result.rows[0].id : null;
        } catch (error) {
            console.error('Error getting therapist ID:', error);
            return null;
        }
    }

    /**
     * Get patient session price
     */
    private async getPatientSessionPrice(patientId: number): Promise<number> {
        try {
            const result = await pool.query(
                'SELECT preco FROM patients WHERE id = $1',
                [patientId]
            );

            return result.rows[0]?.preco || 0;
        } catch (error) {
            console.error('Error getting patient session price:', error);
            return 0;
        }
    }

    /**
     * Get all active patients for a therapist with billing info
     */
    private async getTherapistPatientsWithBillingInfo(therapistId: number): Promise<PatientInfo[]> {
        try {
            const result = await pool.query(
                `SELECT 
                    id, 
                    nome as name, 
                    email, 
                    lv_notas_billing_start_date as billing_start_date,
                    COALESCE(preco, 0) as session_price
                FROM patients 
                WHERE therapist_id = $1 
                ORDER BY nome`,
                [therapistId]
            );

            return result.rows.map(row => ({
                id: row.id,
                name: row.name,
                email: row.email,
                billingStartDate: row.billing_start_date ? new Date(row.billing_start_date) : null,
                sessionPrice: row.session_price
            }));
        } catch (error) {
            console.error('Error getting therapist patients:', error);
            return [];
        }
    }

    /**
     * OPTIMIZED: Get calendar sessions for ALL patients in one API call
     */
    private async getAllCalendarSessionsForMonth(
        therapistEmail: string,
        patients: PatientInfo[],
        year: number,
        month: number,
        userAccessToken?: string
    ): Promise<Map<number, SessionSnapshot[]>> {
        try {
            // Create date range for the month
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            endDate.setHours(23, 59, 59, 999);

            console.log(`🚀 OPTIMIZED: Getting ALL calendar sessions for month ${year}-${month} in ONE API call`);
            console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

            // Filter patients who have billing active for this month
            const activePatientsForMonth = patients.filter(patient => {
                if (!patient.billingStartDate) return false;
                return patient.billingStartDate <= endDate;
            });

            console.log(`📊 Processing ${activePatientsForMonth.length} patients with active billing out of ${patients.length} total`);

            // Create email-to-patient lookup map
            const emailToPatientMap = new Map<string, PatientInfo>();
            activePatientsForMonth.forEach(patient => {
                if (patient.email) {
                    emailToPatientMap.set(patient.email.toLowerCase(), patient);
                }
            });

            // Get therapist's selected calendar ID
            const therapistResult = await pool.query(
                'SELECT google_calendar_id FROM therapists WHERE email = $1',
                [therapistEmail]
            );

            if (therapistResult.rows.length === 0) {
                throw new Error(`Therapist not found: ${therapistEmail}`);
            }

            const therapistCalendarId = therapistResult.rows[0].google_calendar_id;
            if (!therapistCalendarId) {
                throw new Error(`No calendar configured for therapist: ${therapistEmail}`);
            }

            console.log(`Using therapist's selected calendar: ${therapistCalendarId}`);

            // 🎯 SINGLE API CALL to get ALL events for the month
            const allEvents = await googleCalendarService.getEventsWithDateFilter(
                startDate,
                endDate,
                therapistCalendarId,
                500, // Should be plenty for one month
                userAccessToken
            );

            console.log(`📅 Retrieved ${allEvents.length} total calendar events in one API call`);
            // console.log(allEvents);

            // Process all events and match to patients
            const patientSessionsMap = new Map<number, SessionSnapshot[]>();

            // Initialize empty arrays for all active patients
            activePatientsForMonth.forEach(patient => {
                patientSessionsMap.set(patient.id, []);
            });

            let totalMatches = 0;

            for (const event of allEvents) {
                // Skip cancelled events
                if (event.status === 'cancelled') continue;

                // Only include events with actual appointment times
                if (!event.start?.dateTime) continue;

                let matchedPatient: PatientInfo | null = null;

                // Try to match patient by email in various places
                for (const [email, patient] of emailToPatientMap) {
                    let isMatch = false;

                    // 1. Check attendees for patient email
                    if (event.attendees && event.attendees.length > 0) {
                        const attendeeEmails = event.attendees.map(a => a.email?.toLowerCase()).filter(Boolean);
                        if (attendeeEmails.includes(email)) {
                            isMatch = true;
                        }
                    }

                    // 2. Check event description for patient email
                    if (!isMatch && event.description) {
                        if (event.description.toLowerCase().includes(email)) {
                            isMatch = true;
                        }
                    }

                    // 3. Check event summary/title for patient email
                    if (!isMatch && event.summary) {
                        if (event.summary.toLowerCase().includes(email)) {
                            isMatch = true;
                        }
                    }

                    if (isMatch) {
                        matchedPatient = patient;
                        console.log(`✅ Patient matched: ${patient.name} (${email}) - Event: "${event.summary}"`);
                        break;
                    }
                }

                // If we found a match, add the session
                if (matchedPatient) {
                    const sessionDate = new Date(event.start.dateTime);
                    const sessions = patientSessionsMap.get(matchedPatient.id) || [];

                    sessions.push({
                        date: sessionDate.toISOString().split('T')[0], // YYYY-MM-DD
                        time: sessionDate.toTimeString().slice(0, 5), // HH:MM
                        googleEventId: event.id,
                        patientName: matchedPatient.name,
                        duration: event.end?.dateTime ?
                            Math.round((new Date(event.end.dateTime).getTime() - sessionDate.getTime()) / (1000 * 60)) :
                            60 // default 60 minutes
                    });

                    patientSessionsMap.set(matchedPatient.id, sessions);
                    totalMatches++;
                }
            }

            // Sort sessions by date for each patient
            patientSessionsMap.forEach((sessions, patientId) => {
                sessions.sort((a, b) => a.date.localeCompare(b.date));
            });

            console.log(`🎯 OPTIMIZATION RESULT: Found ${totalMatches} total session matches across all patients in ONE API call`);

            // Log per-patient results
            patientSessionsMap.forEach((sessions, patientId) => {
                const patient = activePatientsForMonth.find(p => p.id === patientId);
                if (patient && sessions.length > 0) {
                    console.log(`📊 ${patient.name}: ${sessions.length} sessions`);
                }
            });

            return patientSessionsMap;

        } catch (error) {
            console.error('Error getting ALL calendar sessions for month:', error);
            return new Map();
        }
    }

    /**
     * Extract patient name from calendar event title
     */
    private extractPatientNameFromTitle(title: string): string | null {
        if (!title) return null;

        // Handle "Sessão - Patient Name" format
        const match = title.match(/^Sessão\s*-\s*(.+)$/i);
        return match ? match[1].trim() : null;
    }

    /**
     * Process monthly charges for a specific patient
     */
    async processMonthlyCharges(
        therapistEmail: string,
        patientId: number,
        year: number,
        month: number,
        userAccessToken?: string
    ): Promise<BillingPeriod> {
        try {
            const therapistId = await this.getTherapistIdByEmail(therapistEmail);
            if (!therapistId) {
                throw new Error(`Therapist not found: ${therapistEmail}`);
            }

            // Check if billing period already exists (excluding voided ones)
            const existingResult = await pool.query(
                'SELECT id, status FROM monthly_billing_periods WHERE therapist_id = $1 AND patient_id = $2 AND billing_year = $3 AND billing_month = $4 AND status != $5',
                [therapistId, patientId, year, month, 'void']
            );

            if (existingResult.rows.length > 0) {
                throw new Error(`Billing period already exists for patient ${patientId} in ${year}-${month} with status: ${existingResult.rows[0].status}`);
            }

            // Get all patients (for the optimized call)
            const allPatients = await this.getTherapistPatientsWithBillingInfo(therapistId);

            // Get ALL sessions with one API call
            const allSessionsMap = await this.getAllCalendarSessionsForMonth(
                therapistEmail,
                allPatients,
                year,
                month,
                userAccessToken
            );

            // Get sessions for this specific patient
            const sessionSnapshots = allSessionsMap.get(patientId) || [];

            // Get patient session price
            const sessionPrice = await this.getPatientSessionPrice(patientId);
            const totalAmount = sessionSnapshots.length * sessionPrice;

            // Create billing period
            const result = await pool.query(
                `INSERT INTO monthly_billing_periods 
                 (therapist_id, patient_id, billing_year, billing_month, session_count, total_amount, session_snapshots, processed_by)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING *`,
                [
                    therapistId,
                    patientId,
                    year,
                    month,
                    sessionSnapshots.length,
                    totalAmount,
                    JSON.stringify(sessionSnapshots),
                    therapistEmail
                ]
            );

            const billingPeriod = result.rows[0];

            console.log(`Created billing period ${billingPeriod.id} for patient ${patientId}: ${sessionSnapshots.length} sessions, R$ ${(totalAmount / 100).toFixed(2)}`);

            return {
                id: billingPeriod.id,
                therapistId: billingPeriod.therapist_id,
                patientId: billingPeriod.patient_id,
                billingYear: billingPeriod.billing_year,
                billingMonth: billingPeriod.billing_month,
                sessionCount: billingPeriod.session_count,
                totalAmount: billingPeriod.total_amount,
                sessionSnapshots: billingPeriod.session_snapshots,
                processedAt: new Date(billingPeriod.processed_at),
                processedBy: billingPeriod.processed_by,
                status: billingPeriod.status,
                canBeVoided: billingPeriod.can_be_voided
            };

        } catch (error) {
            console.error('Error processing monthly charges:', error);
            throw error;
        }
    }

    /**
     * OPTIMIZED: Get billing summary for a therapist for a specific month
     */
    async getBillingSummary(
        therapistEmail: string,
        year: number,
        month: number,
        userAccessToken?: string
    ): Promise<BillingSummary[]> {
        try {
            const therapistId = await this.getTherapistIdByEmail(therapistEmail);
            if (!therapistId) {
                throw new Error(`Therapist not found: ${therapistEmail}`);
            }

            // Get all patients with billing info
            const allPatients = await this.getTherapistPatientsWithBillingInfo(therapistId);

            console.log(`💰 Calculating outstanding balances for ${allPatients.length} patients`);
            const outstandingBalances = await this.calculateOutstandingBalances(therapistId, year, month);

            // Get existing billing periods for this month (only exclude void ones)
            const billingResult = await pool.query(
                `SELECT 
                    bp.id as billing_period_id,
                    bp.patient_id,
                    bp.session_count,
                    bp.total_amount,
                    bp.status,
                    bp.processed_at,
                    bp.can_be_voided,
                    EXISTS(SELECT 1 FROM monthly_billing_payments pay WHERE pay.billing_period_id = bp.id) as has_payment
                 FROM monthly_billing_periods bp
                 WHERE bp.therapist_id = $1 
                 AND bp.billing_year = $2 
                 AND bp.billing_month = $3
                 AND bp.status != 'void'`,
                [therapistId, year, month]
            );

            const billingMap = new Map();
            billingResult.rows.forEach(row => {
                billingMap.set(row.patient_id, row);
            });

            // 🚀 OPTIMIZATION: Get ALL calendar sessions in ONE API call
            let allSessionsMap = new Map<number, SessionSnapshot[]>();
            if (userAccessToken) {
                console.log(`🚀 OPTIMIZED getBillingSummary: Fetching ALL sessions in ONE API call`);
                allSessionsMap = await this.getAllCalendarSessionsForMonth(
                    therapistEmail,
                    allPatients,
                    year,
                    month,
                    userAccessToken
                );
            }

            // Build summary for all patients
            const summary: BillingSummary[] = [];

            for (const patient of allPatients) {
                const billing = billingMap.get(patient.id);
                const outstanding = outstandingBalances.get(patient.id);
                const outstandingAmount = outstanding?.totalOutstanding || 0;

                if (billing) {
                    // Patient has billing period for current month
                    const currentAmount = parseInt(billing.total_amount);
                    const totalOwed = currentAmount + outstandingAmount;

                    summary.push({
                        patientName: patient.name,
                        patientId: patient.id,
                        billingPeriodId: billing.billing_period_id,
                        sessionCount: billing.session_count,
                        totalAmount: currentAmount,
                        status: billing.status,
                        hasPayment: billing.has_payment,
                        processedAt: new Date(billing.processed_at),
                        canProcess: false,
                        // ENHANCED: Outstanding balance fields
                        outstandingBalance: outstandingAmount,
                        totalOwed: totalOwed,
                        hasOutstandingBalance: outstandingAmount > 0,
                        oldestUnpaidMonth: outstanding?.oldestUnpaidMonth,
                        oldestUnpaidYear: outstanding?.oldestUnpaidYear,
                        // ENHANCED: Payment control
                        canPayCurrentMonth: outstandingAmount === 0
                    });
                } else {
                    // Patient has no billing period yet
                    const calendarSessions = allSessionsMap.get(patient.id) || [];
                    const sessionCount = calendarSessions.length;
                    const estimatedAmount = sessionCount * patient.sessionPrice;
                    const totalOwed = estimatedAmount + outstandingAmount;

                    // ... rest of the session snapshots logic ...

                    summary.push({
                        patientName: patient.name,
                        patientId: patient.id,
                        sessionCount: sessionCount,
                        totalAmount: estimatedAmount,
                        hasPayment: false,
                        canProcess: true,
                        sessionSnapshots: calendarSessions,
                        // ENHANCED: Outstanding balance fields
                        outstandingBalance: outstandingAmount,
                        totalOwed: totalOwed,
                        hasOutstandingBalance: outstandingAmount > 0,
                        oldestUnpaidMonth: outstanding?.oldestUnpaidMonth,
                        oldestUnpaidYear: outstanding?.oldestUnpaidYear,
                        // ENHANCED: Payment control
                        canPayCurrentMonth: outstandingAmount === 0
                    });
                }
            }

            // Include patients with: sessions > 0 OR outstandingBalance > 0
            const filteredSummary = summary.filter(patient =>
                patient.sessionCount > 0 || patient.hasOutstandingBalance
            );

            console.log(`📊 Enhanced filtering: ${summary.length} total patients -> ${filteredSummary.length} with sessions or outstanding balances`);

            return filteredSummary;

        } catch (error) {
            console.error('Error getting billing summary:', error);
            throw error;
        }
    }

    /**
     * Void a billing period
     */
    async voidBillingPeriod(
        billingPeriodId: number,
        therapistEmail: string,
        reason?: string
    ): Promise<boolean> {
        try {
            // First check if billing period has any payments
            const paymentsResult = await pool.query(
                'SELECT COUNT(*) as payment_count FROM monthly_billing_payments WHERE billing_period_id = $1',
                [billingPeriodId]
            );

            const hasPayments = parseInt(paymentsResult.rows[0].payment_count) > 0;

            if (hasPayments) {
                console.log(`Cannot delete billing period ${billingPeriodId} - has payments, marking as void instead`);
                // If has payments, just mark as void (can't delete)
                const result = await pool.query(
                    'UPDATE monthly_billing_periods SET status = $1 WHERE id = $2',
                    ['void', billingPeriodId]
                );
                return result.rowCount ? result.rowCount > 0 : false;
            } else {
                console.log(`Deleting billing period ${billingPeriodId} - no payments recorded`);
                // If no payments, actually delete the billing period
                const result = await pool.query(
                    'DELETE FROM monthly_billing_periods WHERE id = $1',
                    [billingPeriodId]
                );
                return result.rowCount ? result.rowCount > 0 : false;
            }

        } catch (error) {
            console.error('Error voiding billing period:', error);
            return false;
        }
    }

    /**
     * Record a payment for a billing period
     */
    async recordPayment(
        billingPeriodId: number,
        amount: number, // in cents
        paymentMethod: string,
        paymentDate: Date,
        therapistEmail: string,
        referenceNumber?: string,
        notes?: string
    ): Promise<BillingPayment> {
        try {
            const therapistId = await this.getTherapistIdByEmail(therapistEmail);
            if (!therapistId) {
                throw new Error(`Therapist not found: ${therapistEmail}`);
            }

            // Get billing period info
            const billingResult = await pool.query(
                'SELECT patient_id, status FROM monthly_billing_periods WHERE id = $1',
                [billingPeriodId]
            );

            if (billingResult.rows.length === 0) {
                throw new Error(`Billing period ${billingPeriodId} not found`);
            }

            const { patient_id: patientId, status } = billingResult.rows[0];

            if (status === 'void') {
                throw new Error('Cannot record payment for voided billing period');
            }

            // Record the payment
            const result = await pool.query(
                `INSERT INTO monthly_billing_payments 
                 (billing_period_id, therapist_id, patient_id, amount, payment_method, payment_date, reference_number, recorded_by, notes)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 RETURNING *`,
                [billingPeriodId, therapistId, patientId, amount, paymentMethod, paymentDate, referenceNumber, therapistEmail, notes]
            );

            const payment = result.rows[0];

            console.log(`Recorded payment ${payment.id} for billing period ${billingPeriodId}: R$ ${(amount / 100).toFixed(2)}`);

            return {
                id: payment.id,
                billingPeriodId: payment.billing_period_id,
                amount: payment.amount,
                paymentMethod: payment.payment_method,
                paymentDate: new Date(payment.payment_date),
                referenceNumber: payment.reference_number,
                recordedBy: payment.recorded_by,
                notes: payment.notes
            };

        } catch (error) {
            console.error('Error recording payment:', error);
            throw error;
        }
    }

    /**
     * Delete a payment (allows voiding again)
     */
    async deletePayment(paymentId: number): Promise<boolean> {
        try {
            const result = await pool.query(
                'DELETE FROM monthly_billing_payments WHERE id = $1',
                [paymentId]
            );

            return result.rowCount ? result.rowCount > 0 : false;

        } catch (error) {
            console.error('Error deleting payment:', error);
            return false;
        }
    }

    /**
     * Get billing period details by ID
     */
    async getBillingPeriodDetails(billingPeriodId: number): Promise<BillingPeriod> {
        try {
            const result = await pool.query(
                `SELECT 
                    id,
                    therapist_id,
                    patient_id,
                    billing_year,
                    billing_month,
                    session_count,
                    total_amount,
                    session_snapshots,
                    processed_at,
                    processed_by,
                    status,
                    (SELECT COUNT(*) FROM monthly_billing_payments WHERE billing_period_id = $1) = 0 as can_be_voided
                 FROM monthly_billing_periods 
                 WHERE id = $1`,
                [billingPeriodId]
            );

            if (result.rows.length === 0) {
                throw new Error(`Billing period ${billingPeriodId} not found`);
            }

            // Get associated payments
            const paymentsResult = await pool.query(
                `SELECT id, amount, payment_method, payment_date, reference_number
                 FROM monthly_billing_payments 
                 WHERE billing_period_id = $1`,
                [billingPeriodId]
            );

            const row = result.rows[0];

            return {
                id: row.id,
                therapistId: row.therapist_id,
                patientId: row.patient_id,
                billingYear: row.billing_year,
                billingMonth: row.billing_month,
                sessionCount: row.session_count,
                totalAmount: row.total_amount,
                sessionSnapshots: row.session_snapshots,
                processedAt: new Date(row.processed_at),
                processedBy: row.processed_by,
                status: row.status,
                canBeVoided: row.can_be_voided,
                payments: paymentsResult.rows
            };

        } catch (error) {
            console.error('Error getting billing period details:', error);
            throw error;
        }
    }

    /**
 * ENHANCED: Calculate outstanding balances for all patients
 */
    private async calculateOutstandingBalances(
        therapistId: number,
        currentYear: number,
        currentMonth: number
    ): Promise<Map<number, OutstandingBalance>> {
        try {
            console.log(`💰 Calculating outstanding balances for therapist ${therapistId}, excluding ${currentYear}-${currentMonth}`);

            // Get all unpaid billing periods BEFORE the current month
            const result = await pool.query(
                `SELECT 
                bp.id,
                bp.patient_id,
                bp.billing_year,
                bp.billing_month,
                bp.total_amount,
                bp.session_count,
                COALESCE(SUM(pay.amount), 0) as total_paid
            FROM monthly_billing_periods bp
            LEFT JOIN monthly_billing_payments pay ON bp.id = pay.billing_period_id
            WHERE bp.therapist_id = $1 
            AND bp.status != 'void'
            AND (
                bp.billing_year < $2 
                OR (bp.billing_year = $2 AND bp.billing_month < $3)
            )
            GROUP BY bp.id, bp.patient_id, bp.billing_year, bp.billing_month, bp.total_amount, bp.session_count
            HAVING bp.total_amount > COALESCE(SUM(pay.amount), 0)
            ORDER BY bp.patient_id, bp.billing_year, bp.billing_month`,
                [therapistId, currentYear, currentMonth]
            );

            const outstandingMap = new Map<number, OutstandingBalance>();

            for (const row of result.rows) {
                const patientId = row.patient_id;
                const unpaidAmount = row.total_amount - row.total_paid;

                if (!outstandingMap.has(patientId)) {
                    outstandingMap.set(patientId, {
                        patientId,
                        totalOutstanding: 0,
                        oldestUnpaidMonth: row.billing_month,
                        oldestUnpaidYear: row.billing_year,
                        unpaidBillingPeriods: []
                    });
                }

                const outstanding = outstandingMap.get(patientId)!;
                outstanding.totalOutstanding += unpaidAmount;
                outstanding.unpaidBillingPeriods.push({
                    id: row.id,
                    year: row.billing_year,
                    month: row.billing_month,
                    amount: unpaidAmount,
                    sessionCount: row.session_count
                });

                // Keep track of oldest unpaid period
                if (row.billing_year < outstanding.oldestUnpaidYear ||
                    (row.billing_year === outstanding.oldestUnpaidYear && row.billing_month < outstanding.oldestUnpaidMonth)) {
                    outstanding.oldestUnpaidMonth = row.billing_month;
                    outstanding.oldestUnpaidYear = row.billing_year;
                }
            }

            console.log(`💰 Found outstanding balances for ${outstandingMap.size} patients`);
            return outstandingMap;

        } catch (error) {
            console.error('Error calculating outstanding balances:', error);
            return new Map();
        }
    }
}

export const monthlyBillingService = new MonthlyBillingService();