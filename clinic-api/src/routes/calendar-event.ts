// clinic-api/src/routes/calendar-events.ts
import express, { Router, Request, Response, NextFunction } from "express";
import { googleCalendarService } from "../services/google-calendar.js";

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

router.get("/", asyncHandler(async (req, res) => {
  try {
    console.log("Fetching user's calendar events...");
    
    // Get the Google access token from request headers
    const googleAccessToken = req.headers['x-google-access-token'] as string;
    
    if (!googleAccessToken) {
      return res.status(400).json({ 
        error: "Google access token required",
        message: "Please sign in with Google Calendar permissions"
      });
    }
    
    // Get user's calendar events using their access token
    const events = await googleCalendarService.getUserEvents(googleAccessToken);
    
    console.log(`Found ${events.length} events from user's calendar`);
    
    res.json(events || []);
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    res.status(500).json({ error: "Failed to fetch calendar events" });
  }
}));

export default router;