import { calendar_v3, google } from 'googleapis';
import path from 'path';

export class CalendarWebhookService {
  static createWebhook() {
      throw new Error('Method not implemented.');
  }
  private calendar: calendar_v3.Calendar;

  constructor() {
    this._initializeAuth();
  }

  private _initializeAuth(): void {
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(process.cwd(), "service-account-key.json"),
      scopes: ["https://www.googleapis.com/auth/calendar.events"],
    });
    this.calendar = google.calendar({ version: "v3", auth });
  }

  async createWebhook(webhookUrl: string): Promise<calendar_v3.Schema$Channel> {
    if (!webhookUrl) {
      throw new Error("Webhook URL is required");
    }

    try {
      const channelId = `calendar-webhook-${Date.now()}`;

      const response = await this.calendar.events.watch({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        requestBody: {
          id: channelId,
          type: "web_hook",
          address: webhookUrl,
          expiration: (Date.now() + 7 * 24 * 60 * 60 * 1000).toString(), // 7 days
        },
      });

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
      
      console.log("Webhook stopped successfully");
    } catch (error) {
      console.error("Error stopping webhook:", error);
      throw error;
    }
  }
}

export const createCalendarWebhookService = () => new CalendarWebhookService();