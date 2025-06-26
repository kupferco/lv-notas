// clinic-api/src/services/session-sync.ts
import pool from "../config/database.js";
import { GoogleCalendarEvent, CalendarEventProcessingResult } from "../types/calendar.js";

export class SessionSyncService {
    
    // ===== EXISTING METHODS (keep these) =====
    
    private async findTherapistByCalendar(calendarId: string): Promise<number | null> {
        const result = await pool.query(
            "SELECT id FROM therapists WHERE google_calendar_id = $1",
            [calendarId]
        );
        return result.rows[0]?.id || null;
    }

    private async findPatientByEmail(email: string): Promise<number | null> {
        const result = await pool.query(
            "SELECT id FROM patients WHERE email = $1",
            [email]
        );
        return result.rows[0]?.id || null;
    }

    private async findExistingSession(googleEventId: string): Promise<number | null> {
        const result = await pool.query(
            `SELECT id FROM sessions 
             WHERE google_calendar_event_id = $1`,
            [googleEventId]
        );
        return result.rows[0]?.id || null;
    }

    async processCalendarEvent(event: GoogleCalendarEvent): Promise<CalendarEventProcessingResult> {
        try {
            // Extract the session date from the event
            const sessionDate = new Date(event.start.dateTime || event.start.date || "");

            // Skip if no valid date
            if (!sessionDate) {
                return {
                    eventType: "new",
                    sessionId: null,
                    therapistId: null,
                    patientId: null,
                    error: "Invalid session date"
                };
            }

            // Find therapist by calendar ID
            const therapistId = await this.findTherapistByCalendar(process.env.GOOGLE_CALENDAR_ID || "");
            if (!therapistId) {
                return {
                    eventType: "new",
                    sessionId: null,
                    therapistId: null,
                    patientId: null,
                    error: "Therapist not found"
                };
            }

            // Find patient by attendee email
            const patientEmail = event.attendees?.[0]?.email || "";
            const patientId = await this.findPatientByEmail(patientEmail);
            if (!patientId) {
                return {
                    eventType: "new",
                    sessionId: null,
                    therapistId: null,
                    patientId: null,
                    error: "Patient not found"
                };
            }

            // Find existing session by Google Calendar event ID
            const sessionId = await this.findExistingSession(event.id);

            // Determine event type based on whether session exists and event status
            const eventType = event.status === "cancelled" ? "cancel"
                : sessionId ? "update"
                    : "new";

            return {
                eventType,
                sessionId,
                therapistId,
                patientId
            };
        } catch (error: any) {
            console.error("Error processing calendar event:", error);
            return {
                eventType: "new",
                sessionId: null,
                therapistId: null,
                patientId: null,
                error: "Error processing event"
            };
        }
    }

    // ===== NEW METHODS FOR REVERSE SYNC =====

    // Find patient by name (for manually created calendar events)
    private async findPatientByName(patientName: string, therapistId: number): Promise<number | null> {
        try {
            // Try exact match first
            let result = await pool.query(
                "SELECT id FROM patients WHERE LOWER(nome) = LOWER($1) AND therapist_id = $2",
                [patientName.trim(), therapistId]
            );

            if (result.rows[0]) {
                return result.rows[0].id;
            }

            // Try partial match (contains)
            result = await pool.query(
                "SELECT id FROM patients WHERE LOWER(nome) LIKE LOWER($1) AND therapist_id = $2 LIMIT 1",
                [`%${patientName.trim()}%`, therapistId]
            );

            return result.rows[0]?.id || null;
        } catch (error: any) {
            console.error("Error finding patient by name:", error);
            return null;
        }
    }

    // Find all therapists who might own this calendar
    private async findTherapistsByCalendarId(calendarId: string): Promise<any[]> {
        try {
            const result = await pool.query(
                "SELECT id, email, google_calendar_id FROM therapists WHERE google_calendar_id = $1",
                [calendarId]
            );
            return result.rows;
        } catch (error: any) {
            console.error("Error finding therapists by calendar ID:", error);
            return [];
        }
    }

    // Process calendar event for reverse sync (when calendar changes come via webhook)
    async processReverseSync(event: GoogleCalendarEvent, calendarId: string): Promise<{
        action: 'create' | 'update' | 'delete' | 'skip';
        sessionId?: number;
        message: string;
    }> {
        try {
            console.log(`Processing reverse sync for event ${event.id} in calendar ${calendarId}`);

            // Check if this is a therapy session
            if (!this.isTherapySession(event)) {
                return {
                    action: 'skip',
                    message: 'Not a therapy session - skipping'
                };
            }

            // Find therapist who owns this calendar
            const therapists = await this.findTherapistsByCalendarId(calendarId);
            if (therapists.length === 0) {
                return {
                    action: 'skip',
                    message: 'No therapist found for this calendar'
                };
            }

            const therapist = therapists[0]; // Use first matching therapist

            // Check if session already exists
            const existingSessionId = await this.findExistingSession(event.id);

            // Handle deleted/cancelled events
            if (event.status === 'cancelled') {
                if (existingSessionId) {
                    await this.deleteSession(existingSessionId);
                    return {
                        action: 'delete',
                        sessionId: existingSessionId,
                        message: 'Session deleted due to calendar event cancellation'
                    };
                } else {
                    return {
                        action: 'skip',
                        message: 'Cancelled event but no matching session found'
                    };
                }
            }

            // Extract patient information
            const patientName = this.extractPatientNameFromTitle(event.summary || '');
            if (!patientName) {
                return {
                    action: 'skip',
                    message: 'Could not extract patient name from event title'
                };
            }

            // Try to find patient by email first, then by name
            let patientId = null;
            const patientEmail = this.extractPatientEmailFromAttendees(event.attendees || []);
            
            if (patientEmail) {
                patientId = await this.findPatientByEmail(patientEmail);
            }
            
            if (!patientId) {
                patientId = await this.findPatientByName(patientName, therapist.id);
            }

            if (!patientId) {
                return {
                    action: 'skip',
                    message: `Patient not found: ${patientName} (${patientEmail || 'no email'})`
                };
            }

            // Extract session date
            const sessionDate = new Date(event.start?.dateTime || event.start?.date || '');
            if (!sessionDate || isNaN(sessionDate.getTime())) {
                return {
                    action: 'skip',
                    message: 'Invalid session date in calendar event'
                };
            }

            // Update existing session or create new one
            if (existingSessionId) {
                await this.updateSession(existingSessionId, {
                    date: sessionDate,
                    patientId: patientId,
                    therapistId: therapist.id
                });

                return {
                    action: 'update',
                    sessionId: existingSessionId,
                    message: 'Session updated from calendar changes'
                };
            } else {
                const newSessionId = await this.createSession({
                    date: sessionDate,
                    googleEventId: event.id,
                    patientId: patientId,
                    therapistId: therapist.id
                });

                return {
                    action: 'create',
                    sessionId: newSessionId,
                    message: 'New session created from calendar event'
                };
            }

        } catch (error: any) {
            console.error('Error in reverse sync processing:', error);
            return {
                action: 'skip',
                message: `Error processing event: ${error.message}`
            };
        }
    }

    // Helper method to check if event is a therapy session
    private isTherapySession(event: GoogleCalendarEvent): boolean {
        if (!event.summary) return false;
        const sessionPattern = /^Sessão\s*-\s*.+/i;
        return sessionPattern.test(event.summary);
    }

    // Helper method to extract patient name from title
    private extractPatientNameFromTitle(title: string): string | null {
        if (!title) return null;
        const match = title.match(/^Sessão\s*-\s*(.+)$/i);
        return match ? match[1].trim() : null;
    }

    // Helper method to extract patient email from attendees
    private extractPatientEmailFromAttendees(attendees: any[]): string | null {
        if (!attendees || attendees.length === 0) return null;
        const attendee = attendees.find(a => a.email && a.responseStatus !== 'declined');
        return attendee ? attendee.email : null;
    }

    // Database operations for sessions
    private async createSession(data: {
        date: Date;
        googleEventId: string;
        patientId: number;
        therapistId: number;
    }): Promise<number> {
        const result = await pool.query(
            `INSERT INTO sessions (date, google_calendar_event_id, patient_id, therapist_id, status, created_at) 
             VALUES ($1, $2, $3, $4, 'agendada', CURRENT_TIMESTAMP) 
             RETURNING id`,
            [data.date, data.googleEventId, data.patientId, data.therapistId]
        );
        
        console.log(`Created session ${result.rows[0].id} from calendar event ${data.googleEventId}`);
        return result.rows[0].id;
    }

    private async updateSession(sessionId: number, data: {
        date: Date;
        patientId: number;
        therapistId: number;
    }): Promise<void> {
        await pool.query(
            `UPDATE sessions 
             SET date = $1, patient_id = $2, therapist_id = $3
             WHERE id = $4`,
            [data.date, data.patientId, data.therapistId, sessionId]
        );
        
        console.log(`Updated session ${sessionId} from calendar changes`);
    }

    private async deleteSession(sessionId: number): Promise<void> {
        // First delete related check-ins
        await pool.query(
            'DELETE FROM check_ins WHERE session_id = $1',
            [sessionId]
        );

        // Then delete the session
        await pool.query(
            'DELETE FROM sessions WHERE id = $1',
            [sessionId]
        );
        
        console.log(`Deleted session ${sessionId} due to calendar event cancellation`);
    }
}

export const sessionSyncService = new SessionSyncService();