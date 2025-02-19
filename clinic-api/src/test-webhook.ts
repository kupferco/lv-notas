import { googleCalendarService } from "../src/services/google-calendar.js";
import "dotenv/config";

async function testWebhookSetup() {
    try {
        const webhookUrl = process.env.WEBHOOK_URL;
        const calendarId = process.env.GOOGLE_CALENDAR_ID;
        
        console.log("Environment variables:");
        console.log("WEBHOOK_URL:", webhookUrl);
        console.log("GOOGLE_CALENDAR_ID:", calendarId);
        
        if (!webhookUrl || !calendarId) {
            throw new Error("Missing required environment variables");
        }
        
        console.log("\nTesting webhook setup with URL:", webhookUrl);
        await googleCalendarService.debugWebhookWatch(webhookUrl);
        
        console.log("Webhook test completed");
    } catch (error) {
        console.error("Webhook test failed:", error);
    }
}

testWebhookSetup();