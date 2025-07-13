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
     * Get calendar sessions for a patient in a specific month
     */
    private async getCalendarSessionsForMonth(
        therapistEmail: string,
        patientId: number,
        year: number,
        month: number,
        userAccessToken?: string
    ): Promise<SessionSnapshot[]> {
        try {
            // Create date range for the month (1st to last day)
            const startDate = new Date(year, month - 1, 1); // month is 0-indexed in Date constructor
            const endDate = new Date(year, month, 0); // 0th day of next month = last day of current month
            endDate.setHours(23, 59, 59, 999); // End of day

            console.log(`Getting calendar sessions for patient ${patientId}, ${year}-${month}:`, {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            });

            // Get patient info to match against calendar events
            const patientResult = await pool.query(
                'SELECT nome as name, email, lv_notas_billing_start_date FROM patients WHERE id = $1',
                [patientId]
            );

            if (patientResult.rows.length === 0) {
                throw new Error(`Patient ${patientId} not found`);
            }

            const patient = patientResult.rows[0];
            const billingStartDate = patient.lv_notas_billing_start_date ? new Date(patient.lv_notas_billing_start_date) : null;

            // Skip if billing hasn't started for this patient
            if (!billingStartDate || startDate < billingStartDate) {
                console.log(`Billing not active for patient ${patient.name} in ${year}-${month}`);
                return [];
            }

            // Get events from Google Calendar for this month
            const events = await googleCalendarService.getEventsWithDateFilter(
                startDate,
                endDate,
                undefined, // Use default calendar
                500, // Should be plenty for one month
                userAccessToken
            );

            // Filter events for this specific patient
            const patientSessions: SessionSnapshot[] = [];

            for (const event of events) {
                // Skip cancelled events
                if (event.status === 'cancelled') continue;

                // Only include events with actual appointment times
                if (!event.start?.dateTime) continue;

                // Try to match patient by email or name
                let isPatientMatch = false;

                // Check attendees for patient email
                if (event.attendees && patient.email) {
                    const attendeeEmails = event.attendees.map(a => a.email?.toLowerCase()).filter(Boolean);
                    if (attendeeEmails.includes(patient.email.toLowerCase())) {
                        isPatientMatch = true;
                    }
                }

                // Check event title for patient name
                if (!isPatientMatch && event.summary) {
                    const extractedName = this.extractPatientNameFromTitle(event.summary);
                    if (extractedName && extractedName.toLowerCase().includes(patient.name.toLowerCase())) {
                        isPatientMatch = true;
                    }
                }

                if (isPatientMatch) {
                    const sessionDate = new Date(event.start.dateTime);
                    
                    patientSessions.push({
                        date: sessionDate.toISOString().split('T')[0], // YYYY-MM-DD
                        time: sessionDate.toTimeString().slice(0, 5), // HH:MM
                        googleEventId: event.id,
                        patientName: patient.name,
                        duration: event.end?.dateTime ? 
                            Math.round((new Date(event.end.dateTime).getTime() - sessionDate.getTime()) / (1000 * 60)) : 
                            60 // default 60 minutes
                    });
                }
            }

            console.log(`Found ${patientSessions.length} sessions for patient ${patient.name} in ${year}-${month}`);
            return patientSessions.sort((a, b) => a.date.localeCompare(b.date));

        } catch (error) {
            console.error('Error getting calendar sessions for month:', error);
            return [];
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

            // Check if billing period already exists
            const existingResult = await pool.query(
                'SELECT id FROM monthly_billing_periods WHERE therapist_id = $1 AND patient_id = $2 AND billing_year = $3 AND billing_month = $4',
                [therapistId, patientId, year, month]
            );

            if (existingResult.rows.length > 0) {
                throw new Error(`Billing period already exists for patient ${patientId} in ${year}-${month}`);
            }

            // Get session snapshots from Google Calendar
            const sessionSnapshots = await this.getCalendarSessionsForMonth(
                therapistEmail,
                patientId,
                year,
                month,
                userAccessToken
            );

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
     * Get billing summary for a therapist for a specific month
     */
    async getBillingSummary(
        therapistEmail: string,
        year: number,
        month: number
    ): Promise<BillingSummary[]> {
        try {
            const therapistId = await this.getTherapistIdByEmail(therapistEmail);
            if (!therapistId) {
                throw new Error(`Therapist not found: ${therapistEmail}`);
            }

            // Get all patients for this therapist
            const patientsResult = await pool.query(
                'SELECT id, nome as name FROM patients WHERE therapist_id = $1 ORDER BY nome',
                [therapistId]
            );

            // Get existing billing periods for this month
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

            // Build summary for all patients
            const summary: BillingSummary[] = [];

            for (const patient of patientsResult.rows) {
                const billing = billingMap.get(patient.id);

                if (billing) {
                    // Patient has billing period
                    summary.push({
                        patientName: patient.name,
                        patientId: patient.id,
                        billingPeriodId: billing.billing_period_id,
                        sessionCount: billing.session_count,
                        totalAmount: billing.total_amount,
                        status: billing.status,
                        hasPayment: billing.has_payment,
                        processedAt: new Date(billing.processed_at),
                        canProcess: false
                    });
                } else {
                    // Patient has no billing period yet
                    summary.push({
                        patientName: patient.name,
                        patientId: patient.id,
                        sessionCount: 0,
                        totalAmount: 0,
                        hasPayment: false,
                        canProcess: true
                    });
                }
            }

            return summary;

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
            const result = await pool.query(
                'SELECT void_billing_period($1, $2, $3) as success',
                [billingPeriodId, therapistEmail, reason || 'Voided by therapist']
            );

            return result.rows[0].success;

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
}

export const monthlyBillingService = new MonthlyBillingService();