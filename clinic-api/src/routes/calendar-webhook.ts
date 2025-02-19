import express, { Router, Request, Response, NextFunction } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import pool from "../config/database.js";
import { googleCalendarService } from "../services/google-calendar.js";

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
  console.log("===== WEBHOOK RECEIVED =====");
  console.log("Full Headers:", JSON.stringify(req.headers, null, 2));
  console.log("Full Body:", JSON.stringify(req.body, null, 2));

  const channelId = req.headers["x-goog-channel-id"];
  const resourceId = req.headers["x-goog-resource-id"];
  const resourceState = req.headers["x-goog-resource-state"] as string;
  const resourceUri = req.headers["x-goog-resource-uri"] as string;

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
        const event = events[0];  // Most recently updated event

        // Check if this event already exists in our database
        const existingEvent = await pool.query(
          'SELECT id FROM calendar_events WHERE google_event_id = $1',
          [event.id]
        );

        let eventType: EventType;
        if (event.status === 'cancelled') {
          eventType = 'cancel';
        } else {
          eventType = existingEvent.rows.length === 0 ? 'new' : 'update';
        }

        const result = await pool.query(
          `INSERT INTO calendar_events (event_type, google_event_id, session_date, email) 
                 VALUES ($1, $2, $3, $4) RETURNING *`,
          [
            eventType,
            event.id,
            new Date(event.start?.dateTime || event.start?.date || ''),
            event.creator?.email
          ]
        );
        console.log("Event Logged to Database:", result.rows[0]);
      }
    } catch (error) {
      console.error("Error processing calendar event:", error);
    }
  }
}));

export default router;