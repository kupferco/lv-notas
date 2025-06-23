import express, { Router, Request, Response, NextFunction } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import pool from "../config/database.js";

const router: Router = Router();

// Define types for request bodies
interface CreateTherapistBody {
  name: string;
  email: string;
  phone?: string;
  googleCalendarId?: string;
}

interface UpdateTherapistBody {
  name?: string;
  email?: string;
  phone?: string;
  googleCalendarId?: string;
}

// Type-safe handler
const asyncHandler = (
  handler: (
    req: Request<ParamsDictionary, any, any>, 
    res: Response
  ) => Promise<Response | void>
) => {
  return async (
    req: Request<ParamsDictionary, any, any>, 
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

// GET /api/therapists/by-email/:email
router.get("/by-email/:email", asyncHandler(async (req, res) => {
  const { email } = req.params;
  
  const result = await pool.query(
    "SELECT id, nome as name, email, telefone as phone, google_calendar_id as googleCalendarId FROM therapists WHERE email = $1",
    [email]
  );
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Therapist not found" });
  }
  
  return res.json(result.rows[0]);
}));

// POST /api/therapists
router.post("/", asyncHandler(async (req, res) => {
  const { name, email, phone, googleCalendarId }: CreateTherapistBody = req.body;
  
  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required" });
  }
  
  // Check if therapist already exists
  const existing = await pool.query(
    "SELECT id FROM therapists WHERE email = $1",
    [email]
  );
  
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: "Therapist with this email already exists" });
  }
  
  const result = await pool.query(
    `INSERT INTO therapists (nome, email, telefone, google_calendar_id) 
     VALUES ($1, $2, $3, $4) 
     RETURNING id, nome as name, email, telefone as phone, google_calendar_id as googleCalendarId`,
    [name, email, phone || null, googleCalendarId || null]
  );
  
  return res.status(201).json(result.rows[0]);
}));

// PUT /api/therapists/:id
router.put("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates: UpdateTherapistBody = req.body;
  
  // Build dynamic update query
  const updateFields = [];
  const values = [];
  let paramIndex = 1;
  
  if (updates.name) {
    updateFields.push(`nome = $${paramIndex}`);
    values.push(updates.name);
    paramIndex++;
  }
  
  if (updates.email) {
    updateFields.push(`email = $${paramIndex}`);
    values.push(updates.email);
    paramIndex++;
  }
  
  if (updates.phone !== undefined) {
    updateFields.push(`telefone = $${paramIndex}`);
    values.push(updates.phone);
    paramIndex++;
  }
  
  if (updates.googleCalendarId !== undefined) {
    updateFields.push(`google_calendar_id = $${paramIndex}`);
    values.push(updates.googleCalendarId);
    paramIndex++;
  }
  
  if (updateFields.length === 0) {
    return res.status(400).json({ error: "No valid fields to update" });
  }
  
  values.push(id); // Add ID as last parameter
  
  const result = await pool.query(
    `UPDATE therapists 
     SET ${updateFields.join(", ")} 
     WHERE id = $${paramIndex}
     RETURNING id, nome as name, email, telefone as phone, google_calendar_id as googleCalendarId`,
    values
  );
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Therapist not found" });
  }
  
  return res.json(result.rows[0]);
}));

// GET /api/therapists (list all therapists)
router.get("/", asyncHandler(async (req, res) => {
  const result = await pool.query(
    "SELECT id, nome as name, email, telefone as phone, google_calendar_id as googleCalendarId FROM therapists ORDER BY nome"
  );
  
  return res.json(result.rows);
}));

export default router;
