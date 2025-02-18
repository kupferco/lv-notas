const { google } = require("googleapis");
const path = require("path");

async function testCalendarAccess() {
  try {
    // Load the service account credentials
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, "service-account-key.json"),
      scopes: ["https://www.googleapis.com/auth/calendar.events"],
    });

    const calendar = google.calendar({ version: "v3", auth });

    // Get calendar ID (you can find this in calendar settings)
    const calendarId = "c_1bf25d56063c4f0462b9d0ddb77c3bc46ddfb41d7df67a541852782e7ffea3a0@group.calendar.google.com"; // We need to replace this

    // Create a test event
    const event = {
      summary: "Test Event from API",
      description: "This is a test event created via Google Calendar API",
      start: {
        dateTime: new Date().toISOString(),
        timeZone: "America/Sao_Paulo",
      },
      end: {
        dateTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour later
        timeZone: "America/Sao_Paulo",
      },
    };

    const response = await calendar.events.insert({
      calendarId: calendarId,
      resource: event,
    });

    console.log("Event created successfully:", response.data);
  } catch (error) {
    console.error("Error testing calendar access:", error.message);
  }
}

testCalendarAccess();
