import express, { Router, Request, Response, NextFunction } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import pool from "../config/database.js";

const router: Router = Router();

// Type definitions
interface CreateTherapistBody {
  name: string;
  email: string;
  googleCalendarId: string;
}

interface UpdateCalendarBody {
  googleCalendarId: string;
}

// Type-safe handler
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

// GET /api/therapists/:email - Get therapist by email
router.get("/:email", asyncHandler(async (req, res) => {
  const { email } = req.params;
  
  try {
    const result = await pool.query(
      "SELECT id, nome as name, email, google_calendar_id as googleCalendarId, created_at FROM therapists WHERE email = $1",
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Therapist not found" });
    }
    
    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching therapist:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}));

// POST /api/therapists - Create new therapist
router.post("/", asyncHandler(async (req: Request<ParamsDictionary, any, CreateTherapistBody>, res) => {
  const { name, email, googleCalendarId } = req.body;
  
  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required" });
  }
  
  try {
    // Check if therapist already exists
    const existingResult = await pool.query(
      "SELECT id FROM therapists WHERE email = $1",
      [email]
    );
    
    if (existingResult.rows.length > 0) {
      return res.status(409).json({ error: "Therapist already exists" });
    }
    
    // Create new therapist
    const result = await pool.query(
      `INSERT INTO therapists (nome, email, google_calendar_id) 
       VALUES ($1, $2, $3) 
       RETURNING id, nome as name, email, google_calendar_id as googleCalendarId, created_at`,
      [name, email, googleCalendarId || null]
    );
    
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating therapist:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}));

// PUT /api/therapists/:email/calendar - Update therapist calendar
router.put("/:email/calendar", asyncHandler(async (req: Request<ParamsDictionary, any, UpdateCalendarBody>, res) => {
  const { email } = req.params;
  const { googleCalendarId } = req.body;
  
  if (!googleCalendarId) {
    return res.status(400).json({ error: "Google Calendar ID is required" });
  }
  
  try {
    const result = await pool.query(
      `UPDATE therapists 
       SET google_calendar_id = $1 
       WHERE email = $2 
       RETURNING id, nome as name, email, google_calendar_id as googleCalendarId, created_at`,
      [googleCalendarId, email]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Therapist not found" });
    }
    
    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating therapist calendar:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}));

export default router;
