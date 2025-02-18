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
  // Verify headers from Google
  const channelId = req.headers["x-goog-channel-id"];
  const resourceId = req.headers["x-goog-resource-id"];
  const resourceState = req.headers["x-goog-resource-state"];
  const messageNumber = req.headers["x-goog-message-number"];

  // Verify required headers are present
  if (!channelId || !resourceId || !resourceState) {
    console.error("Missing required headers");
    return res.status(400).send("Missing required headers");
  }

  console.log("Received webhook:", {
    channelId,
    resourceId,
    resourceState,
    messageNumber,
    body: req.body
  });

  // Always respond quickly to webhook
  res.status(200).send("OK");

  try {
    // Store the event
    await pool.query(
      `INSERT INTO calendar_events (event_type, google_event_id, session_date, email) 
       VALUES ($1, $2, $3, $4)`,
      [
        resourceState === "exists" ? "update" : resourceState === "sync" ? "new" : "cancel",
        req.body.id,
        new Date(req.body.start?.dateTime || req.body.start?.date),
        req.body.creator?.email
      ]
    );
  } catch (error) {
    console.error("Error storing calendar event:", error);
  }
}));

export default router;
