import { google } from "googleapis";
import path from "path";

class GoogleCalendarService {
  private calendar;

  constructor() {
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, "../../service-account-key.json"),
      scopes: ["https://www.googleapis.com/auth/calendar.events"],
    });

    this.calendar = google.calendar({ version: "v3", auth });
  }

  async createEvent(patientName: string, sessionDateTime: string) {
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

export const googleCalendarService = new GoogleCalendarService();
