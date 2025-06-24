import express, { Router, Request, Response, NextFunction } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import pool from "../config/database.js";

const router: Router = Router();

interface TherapistBody {
  name: string;
  email: string;
  googleCalendarId?: string;
  telefone?: string;
}

const asyncHandler = (
  handler: (
    req: Request<ParamsDictionary, any, TherapistBody>, 
    res: Response
  ) => Promise<Response | void>
) => {
  return async (
    req: Request<ParamsDictionary, any, TherapistBody>, 
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

// Get therapist by email
router.get("/by-email/:email", asyncHandler(async (req, res) => {
  const { email } = req.params;
  
  const result = await pool.query(
    "SELECT id, nome as name, email, telefone, google_calendar_id as googleCalendarId FROM therapists WHERE email = $1",
    [email]
  );
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Therapist not found" });
  }
  
  return res.json(result.rows[0]);
}));

// Create new therapist
router.post("/", asyncHandler(async (req, res) => {
  const { name, email, googleCalendarId, telefone } = req.body;
  
  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required" });
  }
  
  const result = await pool.query(
    `INSERT INTO therapists (nome, email, google_calendar_id, telefone) 
     VALUES ($1, $2, $3, $4) 
     RETURNING id, nome as name, email, telefone, google_calendar_id as googleCalendarId`,
    [name, email, googleCalendarId || null, telefone || null]
  );
  
  return res.json(result.rows[0]);
}));

// Get all therapists
router.get("/", asyncHandler(async (req, res) => {
  const result = await pool.query(
    "SELECT id, nome as name, email, telefone, google_calendar_id as googleCalendarId FROM therapists ORDER BY nome"
  );
  
  return res.json(result.rows);
}));

export default router;
