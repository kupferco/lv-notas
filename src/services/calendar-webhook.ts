// import { google } from "googleapis";
// import path from "path";

// export class CalendarWebhookService {
//   private calendar: any;
//   private channelId: string;
//   private webhookUrl: string;

//   constructor(webhookUrl: string) {
//     this._initializeAuth();
//     this.channelId = "calendar-" + Date.now();
//     this.webhookUrl = webhookUrl;
//   }

//   private _initializeAuth(): void {
//     const auth = new google.auth.GoogleAuth({
//       keyFile: path.join(process.cwd(), "service-account-key.json"),
//       scopes: ["https://www.googleapis.com/auth/calendar.events"],
//     });
//     this.calendar = google.calendar({ version: "v3", auth });
//   }

//   async createWebhook() {
//     try {
//       const response = await this.calendar.events.watch({
//         calendarId: process.env.GOOGLE_CALENDAR_ID,
//         requestBody: {
//           id: this.channelId,
//           type: "web_hook",
//           address: this.webhookUrl,
//         },
//       });

//       console.log("Webhook created successfully:", response.data);
//       return response.data;
//     } catch (error) {
//       console.error("Error creating webhook:", error);
//       throw error;
//     }
//   }

//   async stopWebhook(channelId: string, resourceId: string) {
//     try {
//       const response = await this.calendar.channels.stop({
//         requestBody: {
//           id: channelId,
//           resourceId: resourceId,
//         },
//       });
      
//       console.log("Webhook stopped successfully:", response.data);
//       return response.data;
//     } catch (error) {
//       console.error("Error stopping webhook:", error);
//       throw error;
//     }
//   }
// }

// export const calendarWebhookService = new CalendarWebhookService(
//   process.env.WEBHOOK_URL || "https://your-domain.com/api/calendar-webhook"
// );
