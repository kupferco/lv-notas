import pool from "../config/database.js";
import { GoogleCalendarEvent, CalendarEventProcessingResult } from "../types/calendar.js";

export class SessionSyncService {
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
        } catch (error) {
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
}

export const sessionSyncService = new SessionSyncService();
