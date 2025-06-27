// clinic-api/src/services/google-calendar.ts
import { google } from 'googleapis';
import path from 'path';
import pool from '../config/database.js';
import { GoogleCalendarEvent } from '../types/index.js';

// Use process.cwd() or a fixed path if import.meta is problematic
const serviceAccountPath = path.join(process.cwd(), 'service-account-key.json');

export class GoogleCalendarService {
    private calendar: any;
    private serviceAuth: any; // Keep service account for webhooks

    constructor() {
        this._initializeServiceAuth();
    }

    // Keep service account auth for webhooks and admin operations
    private _initializeServiceAuth(): void {
        const auth = new google.auth.GoogleAuth({
            keyFile: serviceAccountPath,
            scopes: [
                "https://www.googleapis.com/auth/calendar",
                "https://www.googleapis.com/auth/calendar.events",
                "https://www.googleapis.com/auth/calendar.readonly"
            ],
        });
        this.serviceAuth = auth;
        this.calendar = google.calendar({ version: "v3", auth });
    }

    // Create OAuth client for user-specific operations
    private _createUserAuth(accessToken: string): any {
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({
            access_token: accessToken
        });
        return oauth2Client;
    }

    // Get user's calendars using their OAuth token
    async listUserCalendars(userAccessToken: string): Promise<any[]> {
        try {
            console.log("Using user OAuth token to list calendars...");

            const userAuth = this._createUserAuth(userAccessToken);
            const userCalendar = google.calendar({ version: "v3", auth: userAuth });

            const response = await userCalendar.calendarList.list({
                showHidden: false,
                showDeleted: false
            });

            console.log(`Found ${response.data.items?.length || 0} calendars with user auth`);

            return response.data.items?.map((calendar: any) => ({
                id: calendar.id,
                summary: calendar.summary,
                description: calendar.description || "",
                accessRole: calendar.accessRole,
                primary: calendar.primary || false
            })) || [];
        } catch (error) {
            console.error("Error listing user calendars:", error);
            throw error;
        }
    }

    // Get user's calendar events using their OAuth token
    async getUserEvents(userAccessToken: string, calendarId?: string): Promise<any[]> {
        try {
            console.log("Getting user events with OAuth token...");

            const userAuth = this._createUserAuth(userAccessToken);
            const userCalendar = google.calendar({ version: "v3", auth: userAuth });

            // Use primary calendar if no specific calendar provided
            const targetCalendarId = calendarId || 'primary';

            const response = await userCalendar.events.list({
                calendarId: targetCalendarId,
                timeMin: new Date().toISOString(),
                maxResults: 10,
                singleEvents: true,
                orderBy: 'startTime',
            });

            console.log(`Found ${response.data.items?.length || 0} events`);
            return response.data.items || [];
        } catch (error) {
            console.error('Error fetching user events:', error);
            throw error;
        }
    }

    // Create event using user's OAuth token
    async createUserEvent(userAccessToken: string, calendarId: string, eventData: any): Promise<any> {
        try {
            const userAuth = this._createUserAuth(userAccessToken);
            const userCalendar = google.calendar({ version: "v3", auth: userAuth });

            const response = await userCalendar.events.insert({
                calendarId: calendarId,
                requestBody: eventData,
                sendUpdates: 'all' // Send invitations to attendees
            });

            return response.data;
        } catch (error) {
            console.error("Error creating user event:", error);
            throw error;
        }
    }

    // Keep existing service account methods for webhooks
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

    async createEventWithAttendee(patientName: string, sessionDateTime: string, patientEmail: string, calendarId: string): Promise<any> {
        try {
            const event = {
                summary: `Sessão - ${patientName}`,
                description: `Sessão de terapia para ${patientName}\nPaciente: ${patientEmail}`,
                start: {
                    dateTime: sessionDateTime,
                    timeZone: "America/Sao_Paulo",
                },
                end: {
                    dateTime: new Date(new Date(sessionDateTime).getTime() + 3600000).toISOString(),
                    timeZone: "America/Sao_Paulo",
                }
            };

            const response = await this.calendar.events.insert({
                calendarId: calendarId,  // Use the passed calendar ID instead of env variable
                resource: event
            });

            console.log(`Created calendar event in calendar ${calendarId} for patient: ${patientEmail}`);
            return response.data;
        } catch (error) {
            console.error("Error creating calendar event:", error);
            throw error;
        }
    }

    // Delete calendar event using user's OAuth token
    async deleteUserEvent(userAccessToken: string, calendarId: string, eventId: string): Promise<void> {
        try {
            const userAuth = this._createUserAuth(userAccessToken);
            const userCalendar = google.calendar({ version: "v3", auth: userAuth });

            await userCalendar.events.delete({
                calendarId: calendarId,
                eventId: eventId,
            });

            console.log(`Deleted calendar event ${eventId} from calendar ${calendarId}`);
        } catch (error) {
            console.error("Error deleting user event:", error);
            throw error;
        }
    }

    // Update calendar event using user's OAuth token
    async updateUserEvent(userAccessToken: string, calendarId: string, eventId: string, eventData: any): Promise<any> {
        try {
            const userAuth = this._createUserAuth(userAccessToken);
            const userCalendar = google.calendar({ version: "v3", auth: userAuth });

            const response = await userCalendar.events.update({
                calendarId: calendarId,
                eventId: eventId,
                requestBody: eventData,
            });

            console.log(`Updated calendar event ${eventId} in calendar ${calendarId}`);
            return response.data;
        } catch (error) {
            console.error("Error updating user event:", error);
            throw error;
        }
    }

    // Keep existing webhook methods with service account
    async getRecentEvents(includeDeleted: boolean = true): Promise<any[]> {
        try {
            const response = await this.calendar.events.list({
                calendarId: process.env.GOOGLE_CALENDAR_ID,
                updatedMin: new Date(Date.now() - 30000).toISOString(),
                showDeleted: includeDeleted,
                orderBy: 'updated',
                singleEvents: true,
                maxResults: 10,
            });
            return response.data.items || [];
        } catch (error) {
            console.error('Error fetching recent events:', error);
            throw error;
        }
    }

    async stopAllWebhooks(): Promise<void> {
        try {
            const result = await pool.query(
                'SELECT channel_id, resource_id FROM calendar_webhooks'
            );

            console.log(`Found ${result.rows.length} webhooks to stop`);

            for (const webhook of result.rows) {
                try {
                    await this.stopWebhook(webhook.channel_id, webhook.resource_id);
                    await pool.query(
                        'DELETE FROM calendar_webhooks WHERE channel_id = $1',
                        [webhook.channel_id]
                    );
                    console.log(`Stopped and removed webhook: ${webhook.channel_id}`);
                } catch (error) {
                    console.error(`Error stopping webhook ${webhook.channel_id}:`, error);
                }
            }
        } catch (error) {
            console.error('Error stopping webhooks:', error);
        }
    }

    async createWebhook(webhookUrl: string): Promise<any> {
        try {
            await this.stopAllWebhooks();

            const channelId = `lv-calendar-webhook-${Date.now()}`;
            const response = await this.calendar.events.watch({
                calendarId: process.env.GOOGLE_CALENDAR_ID,
                requestBody: {
                    id: channelId,
                    type: 'web_hook',
                    address: `${webhookUrl}/api/calendar-webhook`,
                    expiration: (Date.now() + 7 * 24 * 60 * 60 * 1000).toString(),
                },
            });

            await pool.query(
                'INSERT INTO calendar_webhooks (channel_id, resource_id, expiration) VALUES ($1, $2, $3)',
                [
                    response.data.id,
                    response.data.resourceId,
                    new Date(parseInt(response.data.expiration))
                ]
            );

            console.log('Webhook created successfully:', response.data);
            console.log('Webhook URL:', webhookUrl);
            return response.data;
        } catch (error) {
            console.error('Error creating webhook:', error);
            throw error;
        }
    }

    async stopWebhook(channelId: string, resourceId: string): Promise<void> {
        try {
            await this.calendar.channels.stop({
                requestBody: {
                    id: channelId,
                    resourceId: resourceId,
                },
            });

            console.log(`Stopped webhook: ${channelId}`);
        } catch (error) {
            console.error('Error stopping webhook:', error);
        }
    }

    async debugWebhookWatch(webhookUrl: string): Promise<void> {
        try {
            console.log('Debugging Webhook Watch');
            console.log('Webhook URL:', webhookUrl);
            console.log('Calendar ID:', process.env.GOOGLE_CALENDAR_ID);

            const response = await this.calendar.events.watch({
                calendarId: process.env.GOOGLE_CALENDAR_ID,
                requestBody: {
                    id: `debug-webhook-${Date.now()}`,
                    type: 'web_hook',
                    address: `${webhookUrl}/api/calendar-webhook`,
                    expiration: (Date.now() + 7 * 24 * 60 * 60 * 1000).toString(),
                },
            });

            console.log('Webhook Watch Debug Response:', response.data);
        } catch (error) {
            console.error('Webhook Watch Debug Error:', error);
            console.error(JSON.stringify(error, null, 2));
        }
    }

    // Add this to your GoogleCalendarService in google-calendar.ts
    async getCalendarTimezone(userAccessToken: string, calendarId: string): Promise<string> {
        try {
            const userAuth = this._createUserAuth(userAccessToken);
            const userCalendar = google.calendar({ version: "v3", auth: userAuth });

            const response = await userCalendar.calendars.get({
                calendarId: calendarId
            });

            return response.data.timeZone || 'America/Sao_Paulo';
        } catch (error) {
            console.error("Error getting calendar timezone:", error);
            return 'UTC'; // Fallback to 'America/Sao_Paulo';
        }
    }

    // Get a specific event by ID using service account (for webhook processing)
    async getEventById(eventId: string, calendarId?: string): Promise<GoogleCalendarEvent | null> {
        try {
            const targetCalendarId = calendarId || process.env.GOOGLE_CALENDAR_ID;

            const response = await this.calendar.events.get({
                calendarId: targetCalendarId,
                eventId: eventId,
                fields: 'id,status,summary,description,start,end,attendees,organizer,creator,updated,recurringEventId'
            });

            return response.data;
        } catch (error: any) {
            if (error.code === 404) {
                console.log(`Event ${eventId} not found (likely deleted)`);
                return null;
            }
            console.error('Error fetching event by ID:', error);
            throw error;
        }
    }

    // Get events updated since a specific time using service account
    async getUpdatedEventsSince(since: Date, calendarId?: string): Promise<GoogleCalendarEvent[]> {
        try {
            const targetCalendarId = calendarId || process.env.GOOGLE_CALENDAR_ID;

            const response = await this.calendar.events.list({
                calendarId: targetCalendarId,
                updatedMin: since.toISOString(),
                showDeleted: true,
                orderBy: 'updated',
                singleEvents: true,
                maxResults: 50,
                fields: `items(id,status,summary,description,start,end,attendees,organizer,creator,updated,recurringEventId)`
            });

            return response.data.items || [];
        } catch (error) {
            console.error('Error fetching updated events:', error);
            throw error;
        }
    }

    async getEventsInRange(calendarId: string, startDate: Date, endDate: Date): Promise<GoogleCalendarEvent[]> {
        try {
            const response = await this.calendar.events.list({
                calendarId: calendarId,
                timeMin: startDate.toISOString(),
                timeMax: endDate.toISOString(),
                singleEvents: true,
                orderBy: 'startTime',
                maxResults: 2500, // Google's max limit
                fields: `items(id,status,summary,description,start,end,attendees,organizer,creator,updated)`
            });

            console.log(`Found ${response.data.items?.length || 0} events in range ${startDate.toISOString().substring(0, 10)} to ${endDate.toISOString().substring(0, 10)}`);

            return response.data.items || [];
        } catch (error) {
            console.error('Error fetching events in range:', error);
            throw error;
        }
    }

    // Check if an event is a therapy session based on our naming convention
    isTherapySession(event: GoogleCalendarEvent): boolean {
        if (!event.summary) return false;

        // Check if it matches our session naming pattern "Sessão - [Patient Name]"
        const sessionPattern = /^Sessão\s*-\s*.+/i;
        return sessionPattern.test(event.summary);
    }

    // Extract patient name from session title
    extractPatientNameFromTitle(title: string): string | null {
        if (!title) return null;

        const match = title.match(/^Sessão\s*-\s*(.+)$/i);
        return match ? match[1].trim() : null;
    }

    // Get patient email from event attendees
    extractPatientEmailFromAttendees(attendees: any[]): string | null {
        if (!attendees || attendees.length === 0) return null;

        // Return the first attendee's email (assuming the patient is invited)
        const attendee = attendees.find(a => a.email && a.responseStatus !== 'declined');
        return attendee ? attendee.email : null;
    }

    // Check if event was deleted
    isEventDeleted(event: GoogleCalendarEvent): boolean {
        return event.status === 'cancelled';
    }
}

export const googleCalendarService = new GoogleCalendarService();