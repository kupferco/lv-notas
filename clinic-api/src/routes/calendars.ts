// clinic-api/src/routes/calendars.ts

import express, { Router, Request, Response, NextFunction } from "express";
import { googleCalendarService } from "../services/google-calendar.js";
import pool from "../config/database.js";

const router: Router = Router();

const asyncHandler = (
  handler: (req: Request, res: Response) => Promise<Response | void>
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req, res);
    } catch (error) {
      next(error);
    }
  };
};

// ============================================================================
// CALENDAR LISTING ENDPOINTS
// ============================================================================

// GET /api/calendars - List user's Google Calendars
router.get("/", asyncHandler(async (req, res) => {
  try {
    console.log("Fetching user's Google Calendar data...");
    
    // Get the Google access token from request headers
    const googleAccessToken = req.headers['x-google-access-token'] as string;
    
    if (!googleAccessToken) {
      return res.status(400).json({ 
        error: "Google access token required",
        message: "Please sign in with Google Calendar permissions"
      });
    }
    
    // Use the access token to get user's calendars
    const calendars = await googleCalendarService.listUserCalendars(googleAccessToken);
    
    console.log(`Found ${calendars.length} calendars from Google API`);
    
    // Filter out calendars that the user cannot write to
    const writableCalendars = calendars.filter(
      calendar => calendar.accessRole === "owner" || calendar.accessRole === "writer"
    );
    
    console.log(`Returning ${writableCalendars.length} writable calendars`);
    
    return res.json(writableCalendars);
  } catch (error) {
    console.error("Error fetching calendars:", error);
    return res.status(500).json({ 
      error: "Erro ao buscar calendários",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
}));

// ============================================================================
// CALENDAR EVENTS ENDPOINTS
// ============================================================================

// GET /api/calendars/events - Get events from therapist's selected calendar
router.get("/events", asyncHandler(async (req, res) => {
  try {
    console.log("=== FETCHING CALENDAR EVENTS ===");
    
    // Get the Google access token from request headers
    const googleAccessToken = req.headers['x-google-access-token'] as string;
    const { therapistEmail } = req.query;
    
    console.log("Request params:", {
      hasGoogleToken: !!googleAccessToken,
      therapistEmail
    });
    
    if (!googleAccessToken) {
      return res.status(400).json({ 
        error: "Google access token required",
        message: "Please sign in with Google Calendar permissions"
      });
    }
    
    if (!therapistEmail) {
      return res.status(400).json({ 
        error: "therapistEmail parameter is required"
      });
    }
    
    // Get the therapist's selected calendar ID from database
    console.log("Looking up therapist calendar ID for:", therapistEmail);
    const therapistResult = await pool.query(
      "SELECT google_calendar_id FROM therapists WHERE email = $1",
      [therapistEmail]
    );
    
    if (therapistResult.rows.length === 0) {
      return res.status(404).json({ 
        error: "Therapist not found",
        therapistEmail 
      });
    }
    
    const therapistCalendarId = therapistResult.rows[0].google_calendar_id;
    console.log("Found therapist calendar ID:", therapistCalendarId);
    
    if (!therapistCalendarId) {
      return res.status(400).json({ 
        error: "Therapist has no calendar configured",
        message: "Please complete calendar setup in settings"
      });
    }
    
    // Get user's calendar events using their access token AND the therapist's calendar ID
    console.log("Fetching events from calendar:", therapistCalendarId);
    const events = await googleCalendarService.getUserEvents(googleAccessToken, therapistCalendarId);
    
    console.log(`✅ Found ${events.length} events from therapist's calendar`);
    
    return res.json(events || []);
  } catch (error) {
    console.error("❌ Error fetching calendar events:", error);
    return res.status(500).json({ error: "Failed to fetch calendar events" });
  }
}));

export default router;