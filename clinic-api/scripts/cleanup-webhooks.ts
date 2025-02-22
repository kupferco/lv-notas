import { google } from "googleapis";
import path from "path";
import "dotenv/config";

async function cleanupWebhooks() {
  try {
    console.log("Starting webhook cleanup...");
    
    // Load the service account credentials
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(process.cwd(), "service-account-key.json"),
      scopes: ["https://www.googleapis.com/auth/calendar.events"],
    });

    const calendar = google.calendar({ version: "v3", auth });
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    
    if (!calendarId) {
      throw new Error("GOOGLE_CALENDAR_ID not set in environment");
    }

    console.log("Fetching existing webhooks...");
    const response = await calendar.events.watch({
      calendarId: calendarId,
      requestBody: {
        id: "cleanup-" + Date.now(),
        type: "web_hook",
        address: "https://example.com", // Temporary webhook for listing
      },
    });

    if (response.data.resourceId) {
      console.log(`Found webhook. Stopping it... ResourceId: ${response.data.resourceId}`);
      await calendar.channels.stop({
        requestBody: {
          id: response.data.id,
          resourceId: response.data.resourceId,
        },
      });
      console.log("Webhook stopped successfully");
    }

    console.log("Cleanup completed!");
  } catch (error) {
    console.error("Error during cleanup:", error);
    process.exit(1);
  }
}

cleanupWebhooks();
