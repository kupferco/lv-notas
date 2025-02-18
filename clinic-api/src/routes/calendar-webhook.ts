import express, { Router, Request, Response } from "express";
import pool from "../config/database.js";

const router: Router = Router();

router.post("/", async (req: Request, res: Response) => {
  // Verify the request is from Google
  const channelId = req.headers["x-goog-channel-id"];
  const resourceId = req.headers["x-goog-resource-id"];
  const state = req.headers["x-goog-resource-state"];
  
  console.log("Received webhook:", {
    channelId,
    resourceId,
    state,
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
        state === "exists" ? "update" : state === "sync" ? "new" : "cancel",
        req.body.id,
        new Date(req.body.start?.dateTime || req.body.start?.date),
        req.body.creator?.email
      ]
    );
  } catch (error) {
    console.error("Error storing calendar event:", error);
  }
});

export default router;
