// clinic-api/src/routes/calendar-webhook.ts
import express, { Router, Request, Response, NextFunction } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import pool from "../config/database.js";
import { googleCalendarService } from "../services/google-calendar.js";
import { sessionSyncService } from "../services/session-sync.js";
import { GoogleCalendarEvent } from "../types/calendar.js";

type EventType = 'new' | 'update' | 'cancel';

const router: Router = Router();

// Define type for our webhook payload
interface WebhookBody {
  id?: string;
  start?: {
    dateTime?: string;
    date?: string;
  };
  creator?: {
    email?: string;
  };
}

// Type-safe handler
const asyncHandler = (
  handler: (
    req: Request<ParamsDictionary, any, WebhookBody>,
    res: Response
  ) => Promise<Response | void>
) => {
  return async (
    req: Request<ParamsDictionary, any, WebhookBody>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      await handler(req, res);
    } catch (error: any) {
      next(error);
    }
  };
};

router.post("/", asyncHandler(async (req, res) => {
  const timestamp = new Date().toISOString();
  const channelId = req.headers["x-goog-channel-id"];
  const resourceState = req.headers["x-goog-resource-state"] as string;
  const resourceId = req.headers["x-goog-resource-id"];
  
  console.log(`\n=== WEBHOOK EVENT RECEIVED [${timestamp}] ===`);
  console.log("Channel ID:", channelId);
  console.log("Resource State:", resourceState);
  console.log("Resource ID:", resourceId);
  console.log("Calendar ID from env:", process.env.GOOGLE_CALENDAR_ID);
  console.log("Full Headers:", JSON.stringify(req.headers, null, 2));
  console.log("Request Body:", JSON.stringify(req.body, null, 2));

  // Always respond quickly to webhook
  res.status(200).send("OK");

  // Skip sync notifications
  if (resourceState === 'sync') {
    console.log("✅ Skipping sync notification - this is normal");
    return;
  }

  // For actual calendar changes, fetch the event data
  if (resourceState === 'exists') {
    console.log("🔄 Processing 'exists' notification - calendar change detected");
    
    try {
      console.log("📡 Fetching recent events from Google Calendar...");
      const events = await googleCalendarService.getRecentEvents();
      console.log(`📋 Found ${events?.length || 0} recent events`);

      if (events && events.length > 0) {
        // Log all recent events for debugging
        console.log("📅 Recent events summary:");
        events.forEach((event, index) => {
          console.log(`  ${index + 1}. Event ID: ${event.id}`);
          console.log(`     Title: "${event.summary || 'No title'}"`);
          console.log(`     Status: ${event.status || 'unknown'}`);
          console.log(`     Start: ${event.start?.dateTime || event.start?.date || 'No start time'}`);
          console.log(`     Updated: ${event.updated || 'No update time'}`);
          console.log(`     Attendees: ${event.attendees?.length || 0}`);
        });

        const event = events[0] as GoogleCalendarEvent;  // Most recently updated event
        console.log(`\n🎯 Processing most recent event: ${event.id}`);
        console.log(`   Title: "${event.summary}"`);
        console.log(`   Status: ${event.status}`);
        console.log(`   Is therapy session: ${googleCalendarService.isTherapySession(event)}`);

        // NEW: Try reverse sync first (for manually created events)
        console.log("\n🔄 Attempting reverse sync...");
        const calendarId = process.env.GOOGLE_CALENDAR_ID || '';
        const reverseResult = await sessionSyncService.processReverseSync(event, calendarId);
        
        console.log("🎯 Reverse sync result:", {
          action: reverseResult.action,
          sessionId: reverseResult.sessionId,
          message: reverseResult.message
        });

        // If reverse sync handled it, we're done
        if (reverseResult.action !== 'skip') {
          console.log(`✅ Reverse sync ${reverseResult.action}: ${reverseResult.message}`);
          
          // Log the reverse sync event
          try {
            await pool.query(
              `INSERT INTO calendar_events (
                event_type, 
                google_event_id, 
                session_date, 
                email
              ) VALUES ($1, $2, $3, $4)`,
              [
                reverseResult.action,
                event.id,
                new Date(event.start?.dateTime || event.start?.date || ''),
                event.creator?.email
              ]
            );
            console.log("📝 Logged reverse sync event to database");
          } catch (dbError: any) {
            console.error("❌ Error logging reverse sync event:", dbError);
          }
          
          console.log("✅ Reverse sync processing complete");
          return;
        }

        // EXISTING: Fall back to original logic for LV Notas-created events
        console.log("\n🔄 Reverse sync skipped, trying original event processing...");
        
        const result = await sessionSyncService.processCalendarEvent(event);
        console.log("🎯 Original processing result:", {
          eventType: result.eventType,
          sessionId: result.sessionId,
          therapistId: result.therapistId,
          patientId: result.patientId,
          error: result.error
        });

        // Log the event in calendar_events table
        try {
          await pool.query(
            `INSERT INTO calendar_events (
                      event_type, 
                      google_event_id, 
                      session_date, 
                      email
                  ) VALUES ($1, $2, $3, $4)`,
            [
              result.eventType,
              event.id,
              new Date(event.start?.dateTime || event.start?.date || ''),
              event.creator?.email
            ]
          );
          console.log("📝 Logged original event to database");
        } catch (dbError: any) {
          console.error("❌ Error logging original event:", dbError);
        }

        // Now handle the session based on the event type
        if (result.error) {
          console.log(`❌ Event processing error: ${result.error}`);
          console.log("   This might be expected if the event doesn't match our criteria");
          return;
        }

        console.log(`\n🎯 Executing ${result.eventType} action for session ${result.sessionId}...`);
        
        switch (result.eventType) {
          case 'new':
            if (!result.sessionId) {
              console.log("➕ Creating new session...");
              try {
                const sessionResult = await pool.query(
                  `INSERT INTO sessions (
                                  date, 
                                  google_calendar_event_id,
                                  patient_id,
                                  therapist_id,
                                  status
                              ) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
                  [
                    new Date(event.start?.dateTime || event.start?.date || ''),
                    event.id,
                    result.patientId,
                    result.therapistId,
                    'agendada'
                  ]
                );
                console.log(`✅ Created new session with ID: ${sessionResult.rows[0].id}`);
              } catch (dbError: any) {
                console.error("❌ Error creating session:", dbError);
              }
            }
            break;

          case 'update':
            if (result.sessionId) {
              console.log(`🔄 Updating existing session ${result.sessionId}...`);
              try {
                await pool.query(
                  `UPDATE sessions 
                               SET date = $1,
                                   google_calendar_event_id = $2,
                                   patient_id = $3,
                                   therapist_id = $4
                               WHERE id = $5`,
                  [
                    new Date(event.start?.dateTime || event.start?.date || ''),
                    event.id,
                    result.patientId,
                    result.therapistId,
                    result.sessionId
                  ]
                );
                console.log(`✅ Updated session ${result.sessionId}`);
              } catch (dbError: any) {
                console.error("❌ Error updating session:", dbError);
              }
            }
            break;

          case 'cancel':
            if (result.sessionId) {
              console.log(`❌ Cancelling session ${result.sessionId}...`);
              try {
                await pool.query(
                  `UPDATE sessions 
                               SET status = $1 
                               WHERE id = $2`,
                  ['cancelada', result.sessionId]
                );
                console.log(`✅ Cancelled session ${result.sessionId}`);
              } catch (dbError: any) {
                console.error("❌ Error cancelling session:", dbError);
              }
            }
            break;
        }

        console.log(`✅ Successfully processed ${result.eventType} event for session ${result.sessionId}`);
      } else {
        console.log("📭 No recent events found in calendar");
      }
    } catch (error: any) {
      console.error("❌ Error processing calendar event:", error);
      console.error("Error details:", error.message);
      console.error("Stack trace:", error.stack);
    }
  } else {
    console.log(`ℹ️  Received resource state '${resourceState}' - no action needed`);
  }
  
  console.log("=== WEBHOOK PROCESSING COMPLETE ===\n");
}));

export default router;