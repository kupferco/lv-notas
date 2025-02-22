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
    } catch (error) {
      next(error);
    }
  };
};

router.post("/", asyncHandler(async (req, res) => {
  const channelId = req.headers["x-goog-channel-id"];
  const resourceState = req.headers["x-goog-resource-state"] as string;
  
  console.log("\n=== WEBHOOK EVENT RECEIVED ===");
  console.log("Channel ID:", channelId);
  console.log("Resource State:", resourceState);
  console.log("Headers:", JSON.stringify(req.headers, null, 2));

  // Always respond quickly to webhook
  res.status(200).send("OK");

  // Skip sync notifications
  if (resourceState === 'sync') {
    console.log("Skipping sync notification");
    return;
  }

  // For actual calendar changes, fetch the event data
  if (resourceState === 'exists') {
    try {
      const events = await googleCalendarService.getRecentEvents();

      if (events && events.length > 0) {
        const event = events[0] as GoogleCalendarEvent;  // Most recently updated event

        // Process the event using our new service
        const result = await sessionSyncService.processCalendarEvent(event);

        // Log the event in calendar_events table
        const eventResult = await pool.query(
          `INSERT INTO calendar_events (
                    event_type, 
                    google_event_id, 
                    session_date, 
                    email
                ) VALUES ($1, $2, $3, $4) RETURNING *`,
          [
            result.eventType,
            event.id,
            new Date(event.start?.dateTime || event.start?.date || ''),
            event.creator?.email
          ]
        );

        // Now handle the session based on the event type
        if (result.error) {
          console.log("Event processing error:", result.error);
          return;
        }

        console.log(result)
        switch (result.eventType) {
          case 'new':
            if (!result.sessionId) {
              // Create new session
              await pool.query(
                `INSERT INTO sessions (
                                date, 
                                google_calendar_event_id,
                                patient_id,
                                therapist_id,
                                status
                            ) VALUES ($1, $2, $3, $4, $5)`,
                [
                  new Date(event.start?.dateTime || event.start?.date || ''),
                  event.id,
                  result.patientId,
                  result.therapistId,
                  'agendada'
                ]
              );
            }
            break;

          case 'update':
            if (result.sessionId) {
              // Update existing session
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
            }
            break;

          case 'cancel':
            if (result.sessionId) {
              // Update session status to cancelled
              await pool.query(
                `UPDATE sessions 
                             SET status = $1 
                             WHERE id = $2`,
                ['cancelada', result.sessionId]
              );
            }
            break;
        }

        console.log(`Successfully processed ${result.eventType} event for session ${result.sessionId}`);
      }
    } catch (error) {
      console.error("Error processing calendar event:", error);
    }
  }
}));

export default router;