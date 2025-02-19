import express, { Router, Request, Response, NextFunction } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import pool from "../config/database.js";

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

  console.log("Webhook Details:", {
    channelId,
    resourceId,
    resourceState,
    resourceUri
  });

  // Always respond quickly to webhook
  res.status(200).send("OK");

  // Only process if we have a body with event data
  if (resourceState === 'exists' && Object.keys(req.body).length > 0) {
    try {
      const result = await pool.query(
        `INSERT INTO calendar_events (event_type, google_event_id, session_date, email) 
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [
          "update",
          req.body.id,
          new Date(req.body.start?.dateTime || req.body.start?.date),
          req.body.creator?.email
        ]
      );
      console.log("Event Logged to Database:", result.rows[0]);
    } catch (error) {
      console.error("Error storing calendar event:", error);
    }
  } else {
    console.log(`Skipping database insert - ${resourceState} notification with ${Object.keys(req.body).length === 0 ? 'empty' : 'non-empty'} body`);
  }
}));
export default router;