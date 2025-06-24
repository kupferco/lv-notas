import { google } from "googleapis";
import path from "path";
import pool from "../config/database.js";
import { GoogleCalendarEvent } from "../types/calendar.js";

const serviceAccountPath = path.join(process.cwd(), "service-account-key.json");

export class GoogleCalendarService {
    private calendar: any;

    constructor() {
        this._initializeAuth();
    }

    private _initializeAuth(): void {
        const auth = new google.auth.GoogleAuth({
            keyFile: serviceAccountPath,
            scopes: [
                "https://www.googleapis.com/auth/calendar.events",
                "https://www.googleapis.com/auth/calendar.readonly"
            ],
        });
        this.calendar = google.calendar({ version: "v3", auth });
    }

    async listUserCalendars(): Promise<any[]> {
        try {
            const response = await this.calendar.calendarList.list({
                showHidden: false,
                showDeleted: false
            });

            return response.data.items.map((calendar: any) => ({
                id: calendar.id,
                summary: calendar.summary,
                description: calendar.description || "",
                accessRole: calendar.accessRole,
                primary: calendar.primary || false
            }));
        } catch (error) {
            console.error("Error listing calendars:", error);
            throw error;
        }
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

    async getRecentEvents(includeDeleted: boolean = true): Promise<GoogleCalendarEvent[]> {
        try {
            const response = await this.calendar.events.list({
                calendarId: process.env.GOOGLE_CALENDAR_ID,
                updatedMin: new Date(Date.now() - 30000).toISOString(),
                showDeleted: includeDeleted,
                orderBy: "updated",
                singleEvents: true,
                maxResults: 10,
                fields: `items(id,status,summary,description,start,end,attendees,organizer,creator)`
            });
            return response.data.items;
        } catch (error) {
            console.error("Error fetching recent events:", error);
            throw error;
        }
    }

    async stopAllWebhooks(): Promise<void> {
        try {
            const result = await pool.query(
                "SELECT channel_id, resource_id FROM calendar_webhooks"
            );

            console.log(`Found ${result.rows.length} webhooks to stop`);

            for (const webhook of result.rows) {
                try {
                    await this.stopWebhook(webhook.channel_id, webhook.resource_id);
                    await pool.query(
                        "DELETE FROM calendar_webhooks WHERE channel_id = $1",
                        [webhook.channel_id]
                    );
                    console.log(`Stopped and removed webhook: ${webhook.channel_id}`);
                } catch (error) {
                    console.error(`Error stopping webhook ${webhook.channel_id}:`, error);
                }
            }
        } catch (error) {
            console.error("Error stopping webhooks:", error);
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
                    type: "web_hook",
                    address: `${webhookUrl}/api/calendar-webhook`,
                    expiration: (Date.now() + 7 * 24 * 60 * 60 * 1000).toString(),
                },
            });

            await pool.query(
                "INSERT INTO calendar_webhooks (channel_id, resource_id, expiration) VALUES ($1, $2, $3)",
                [
                    response.data.id,
                    response.data.resourceId,
                    new Date(parseInt(response.data.expiration))
                ]
            );

            console.log("Webhook created successfully:", response.data);
            return response.data;
        } catch (error) {
            console.error("Error creating webhook:", error);
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
            console.error("Error stopping webhook:", error);
        }
    }

    async debugWebhookWatch(webhookUrl: string): Promise<void> {
        try {
            console.log("Debugging Webhook Watch");
            console.log("Webhook URL:", webhookUrl);
            console.log("Calendar ID:", process.env.GOOGLE_CALENDAR_ID);

            const response = await this.calendar.events.watch({
                calendarId: process.env.GOOGLE_CALENDAR_ID,
                requestBody: {
                    id: `debug-webhook-${Date.now()}`,
                    type: "web_hook",
                    address: `${webhookUrl}/api/calendar-webhook`,
                    expiration: (Date.now() + 7 * 24 * 60 * 60 * 1000).toString(),
                },
            });

            console.log("Webhook Watch Debug Response:", response.data);
        } catch (error) {
            console.error("Webhook Watch Debug Error:", error);
            console.error(JSON.stringify(error, null, 2));
        }
    }
}

export const googleCalendarService = new GoogleCalendarService();
