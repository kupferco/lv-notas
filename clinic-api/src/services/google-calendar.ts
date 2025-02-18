import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';

// Use process.cwd() or a fixed path if import.meta is problematic
const serviceAccountPath = path.join(process.cwd(), 'service-account-key.json');

export class GoogleCalendarService {
    private calendar: any;

    constructor() {
        this._initializeAuth();
    }

    private _initializeAuth(): void {
        const auth = new google.auth.GoogleAuth({
            keyFile: serviceAccountPath,
            scopes: ["https://www.googleapis.com/auth/calendar.events"],
        });
        this.calendar = google.calendar({ version: "v3", auth });
    }

    async createEvent(patientName: string, sessionDateTime: string): Promise<any> {
        try {
            const event = {
                summary: `Sessão - ${patientName}`,
                description: `Sessão de terapia para ${patientName}`,
                start: {
                    dateTime: sessionDateTime,
                    timeZone: "America/Sao_Paulo",
                },
                end: {
                    // Adding 1 hour to the start time
                    dateTime: new Date(new Date(sessionDateTime).getTime() + 3600000).toISOString(),
                    timeZone: "America/Sao_Paulo",
                },
            };

            const response = await this.calendar.events.insert({
                calendarId: process.env.GOOGLE_CALENDAR_ID,
                resource: event,
            });

            return response.data;
        } catch (error) {
            console.error("Error creating calendar event:", error);
            throw error;
        }
    }
}

// Create and export a singleton instance
export const googleCalendarService = new GoogleCalendarService();