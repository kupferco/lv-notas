// clinic-api/src/services/calendar-only-sessions.ts
import pool from "../config/database.js";
import { googleCalendarService } from "./google-calendar.js";
import { GoogleCalendarEvent } from "../types/index.js";

export interface CalendarSession {
    id: string; // Google Calendar event ID
    patientId: number | null;
    patientName: string;
    patientEmail: string | null;
    date: Date;
    status: 'agendada' | 'compareceu' | 'cancelada';
    googleEventId: string;
    isFromCalendar: boolean; // Always true for this service
    paymentStatus?: string;
}

export interface PatientWithSessions {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    sessionPrice: number;
    billingStartDate: Date | null;
    sessions: CalendarSession[];
}

export class CalendarOnlySessionsService {

    /**
     * Get earliest billing start date for a therapist (dynamic calculation)
     */
    private async getEarliestBillingStartDate(therapistId: number): Promise<Date> {
        try {
            const result = await pool.query(
                'SELECT MIN(lv_notas_billing_start_date) as earliest_date FROM patients WHERE therapist_id = $1 AND lv_notas_billing_start_date IS NOT NULL',
                [therapistId]
            );

            if (result.rows.length > 0 && result.rows[0].earliest_date) {
                return new Date(result.rows[0].earliest_date);
            }

            // Default to 6 months ago if no patients have billing start dates
            const defaultDate = new Date();
            defaultDate.setMonth(defaultDate.getMonth() - 6);
            return defaultDate;
        } catch (error) {
            console.error('Error getting earliest billing start date:', error);
            // Fallback to 6 months ago
            const defaultDate = new Date();
            defaultDate.setMonth(defaultDate.getMonth() - 6);
            return defaultDate;
        }
    }

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
     * Find patient by email or name from calendar event
     */
    private async findPatientFromEvent(event: GoogleCalendarEvent): Promise<{ id: number; name: string; email: string; phone: string | null; sessionPrice: number; billingStartDate: Date | null } | null> {
        try {
            // First try to find by email from attendees
            const attendeeEmail = googleCalendarService.extractPatientEmailFromAttendees(event.attendees || []);
            if (attendeeEmail) {
                const result = await pool.query(
                    'SELECT id, nome as name, email, telefone as phone, preco as session_price, billing_start_date FROM patients WHERE email = $1',
                    [attendeeEmail]
                );
                if (result.rows.length > 0) {
                    const patient = result.rows[0];
                    return {
                        id: patient.id,
                        name: patient.name,
                        email: patient.email,
                        phone: patient.phone,
                        sessionPrice: patient.session_price || 0,
                        billingStartDate: patient.billing_start_date
                    };
                }
            }

            // If no match by email, try by name from event title
            const patientNameFromTitle = googleCalendarService.extractPatientNameFromTitle(event.summary || '');
            if (patientNameFromTitle) {
                const result = await pool.query(
                    'SELECT id, nome as name, email, telefone as phone, preco as session_price, billing_start_date FROM patients WHERE LOWER(nome) = LOWER($1)',
                    [patientNameFromTitle]
                );
                if (result.rows.length > 0) {
                    const patient = result.rows[0];
                    return {
                        id: patient.id,
                        name: patient.name,
                        email: patient.email,
                        phone: patient.phone,
                        sessionPrice: patient.session_price || 0,
                        billingStartDate: patient.billing_start_date
                    };
                }
            }

            return null;
        } catch (error) {
            console.error('Error finding patient from event:', error);
            return null;
        }
    }

    /**
     * Convert Google Calendar event to CalendarSession
     */
    private async convertEventToSession(event: GoogleCalendarEvent): Promise<CalendarSession | null> {
        try {
            const patient = await this.findPatientFromEvent(event);
            const eventDate = new Date(event.start?.dateTime || event.start?.date || '');

            // Determine session status based on event status and date
            let status: 'agendada' | 'compareceu' | 'cancelada' = 'agendada';

            if (event.status === 'cancelled') {
                status = 'cancelada';
            } else if (eventDate < new Date()) {
                // Past events are considered attended (auto check-in logic)
                status = 'compareceu';
            }

            return {
                id: event.id,
                patientId: patient?.id || null,
                patientName: patient?.name || googleCalendarService.extractPatientNameFromTitle(event.summary || '') || 'Unknown Patient',
                patientEmail: patient?.email || googleCalendarService.extractPatientEmailFromAttendees(event.attendees || []),
                date: eventDate,
                status,
                googleEventId: event.id,
                isFromCalendar: true
            };
        } catch (error) {
            console.error('Error converting event to session:', error);
            return null;
        }
    }

    /**
 * Get sessions for a specific patient from Google Calendar
 */
    async getPatientSessions(
        patientId: number,
        therapistEmail: string,
        userAccessToken?: string
    ): Promise<CalendarSession[]> {
        try {
            // Get patient info including billing start date
            const patientResult = await pool.query(
                'SELECT nome as name, email, lv_notas_billing_start_date FROM patients WHERE id = $1',
                [patientId]
            );

            if (patientResult.rows.length === 0) {
                throw new Error(`Patient with ID ${patientId} not found`);
            }

            const patient = patientResult.rows[0];
            const patientStartDate = patient.lv_notas_billing_start_date ? new Date(patient.lv_notas_billing_start_date) : null;

            if (!patientStartDate) {
                console.log(`Patient ${patient.name} has no billing start date set`);
                return [];
            }

            console.log(`Getting calendar sessions for patient ${patient.name} from ${patientStartDate.toISOString()}`);
            console.log(`🔍 DEBUG: About to call Google Calendar API`);
            console.log(`🔍 DEBUG: Calendar ID from env: ${process.env.GOOGLE_CALENDAR_ID}`);
            console.log(`🔍 DEBUG: User access token present: ${userAccessToken ? 'YES' : 'NO'}`);

            // Set a reasonable end date (3 months from now)
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + 3);

            let events: any[] = [];

            try {
                events = await googleCalendarService.getEventsWithDateFilter(
                    patientStartDate,
                    endDate, // Use end date instead of undefined
                    undefined, // Use default calendar
                    1000,
                    userAccessToken
                );
                console.log(`🔍 DEBUG: Google Calendar API returned ${events.length} events`);
            } catch (calendarError) {
                console.error(`❌ DEBUG: Google Calendar API error:`, calendarError);
                throw calendarError;
            }

            // Filter events for this specific patient and convert to sessions
            const patientSessions: CalendarSession[] = [];

            for (const event of events) {
                const session = await this.convertEventToSession(event);
                console.log(`🔍 DEBUG: Event "${event.summary}" -> Session patientId: ${session?.patientId}, target: ${patientId}`);

                if (session && session.patientId === patientId) {
                    console.log(`✅ MATCH: Event "${event.summary}" matches patient ${patientId}`);
                    patientSessions.push(session);
                } else if (session) {
                    console.log(`❌ NO MATCH: Event "${event.summary}" is for patient ${session.patientId}, not ${patientId}`);
                } else {
                    console.log(`❌ NO SESSION: Could not convert event "${event.summary}" to session`);
                }
            }

            console.log(`Found ${patientSessions.length} calendar sessions for patient ${patient.name}`);
            return patientSessions.sort((a, b) => a.date.getTime() - b.date.getTime());

        } catch (error) {
            console.error('Error getting patient sessions from calendar:', error);
            throw error;
        }
    }

    /**
     * Get all patients with their calendar sessions
     */
    async getAllPatientsWithSessions(
        therapistEmail: string,
        userAccessToken?: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<PatientWithSessions[]> {
        try {
            // Get therapist ID
            const therapistId = await this.getTherapistIdByEmail(therapistEmail);
            if (!therapistId) {
                throw new Error(`Therapist not found: ${therapistEmail}`);
            }

            // Get all patients for this therapist
            const patientsResult = await pool.query(
                'SELECT id, nome as name, email, telefone as phone, preco as session_price, lv_notas_billing_start_date FROM patients WHERE therapist_id = $1 ORDER BY nome',
                [therapistId]
            );

            const patients = patientsResult.rows;

            // Get earliest billing start date dynamically
            const earliestBillingDate = await this.getEarliestBillingStartDate(therapistId);

            // Use the provided start date or the earliest billing date
            const calendarStartDate = startDate || earliestBillingDate;

            console.log(`Loading calendar events from ${calendarStartDate.toISOString()} for ${patients.length} patients`);

            // Get events from Google Calendar
            const events = await googleCalendarService.getEventsWithDateFilter(
                calendarStartDate,
                endDate,
                undefined, // Use default calendar
                2000, // High limit for comprehensive data
                userAccessToken
            );

            console.log(`Retrieved ${events.length} events from Google Calendar`);

            // Group sessions by patient
            const patientsWithSessions: PatientWithSessions[] = [];

            for (const patient of patients) {
                const patientStartDate = patient.lv_notas_billing_start_date ? new Date(patient.lv_notas_billing_start_date) : null;

                // Skip patients without billing start date
                if (!patientStartDate) {
                    patientsWithSessions.push({
                        id: patient.id,
                        name: patient.name,
                        email: patient.email,
                        phone: patient.phone,
                        sessionPrice: patient.session_price || 0,
                        billingStartDate: null,
                        sessions: []
                    });
                    continue;
                }

                const patientSessions: CalendarSession[] = [];

                // Filter events for this patient
                for (const event of events) {
                    const eventDate = new Date(event.start?.dateTime || event.start?.date || '');

                    // Skip events before patient's billing start date
                    if (eventDate < patientStartDate) continue;

                    // Skip events that don't match date range filter
                    if (startDate && eventDate < startDate) continue;
                    if (endDate && eventDate > endDate) continue;

                    const session = await this.convertEventToSession(event);
                    if (session && session.patientId === patient.id) {
                        patientSessions.push(session);
                    }
                }

                patientsWithSessions.push({
                    id: patient.id,
                    name: patient.name,
                    email: patient.email,
                    phone: patient.phone,
                    sessionPrice: patient.session_price || 0,
                    billingStartDate: patientStartDate,
                    sessions: patientSessions.sort((a, b) => a.date.getTime() - b.date.getTime())
                });
            }

            console.log(`Processed ${patientsWithSessions.length} patients with calendar sessions`);
            return patientsWithSessions;

        } catch (error) {
            console.error('Error getting all patients with sessions from calendar:', error);
            throw error;
        }
    }

    /**
     * Get calendar sessions with payment information
     */
    async getSessionsWithPayments(
        therapistEmail: string,
        userAccessToken?: string,
        startDate?: Date,
        endDate?: Date,
        autoCheckIn: boolean = false
    ): Promise<CalendarSession[]> {
        try {
            const patientsWithSessions = await this.getAllPatientsWithSessions(
                therapistEmail,
                userAccessToken,
                startDate,
                endDate
            );

            const allSessions: CalendarSession[] = [];

            for (const patient of patientsWithSessions) {
                for (const session of patient.sessions) {
                    // Apply auto check-in logic if enabled
                    if (autoCheckIn && session.status === 'agendada' && session.date < new Date()) {
                        session.status = 'compareceu';
                    }

                    // TODO: Add payment status logic here when needed
                    // For now, we'll use the session status to infer payment status
                    session.paymentStatus = session.status === 'compareceu' ? 'pendente' : 'nao_cobrado';

                    allSessions.push(session);
                }
            }

            return allSessions.sort((a, b) => b.date.getTime() - a.date.getTime());

        } catch (error) {
            console.error('Error getting sessions with payments from calendar:', error);
            throw error;
        }
    }

    /**
     * Update patient billing start date
     */
    async updatePatientBillingStartDate(patientId: number, startDate: Date | null): Promise<void> {
        try {
            await pool.query(
                'UPDATE patients SET lv_notas_billing_start_date = $1 WHERE id = $2',
                [startDate ? startDate.toISOString().split('T')[0] : null, patientId]
            );
            console.log(`Updated billing start date for patient ${patientId} to ${startDate?.toISOString().split('T')[0] || 'null'}`);
        } catch (error) {
            console.error('Error updating patient billing start date:', error);
            throw error;
        }
    }
}

export const calendarOnlySessionsService = new CalendarOnlySessionsService();