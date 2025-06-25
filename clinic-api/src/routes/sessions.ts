// clinic-api/src/routes/sessions.ts
import express, { Router, Request, Response, NextFunction } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import pool from "../config/database.js";

const router: Router = Router();

// Type definitions for request bodies
interface CreateSessionBody {
  patientId: string;
  date: string;
  status: 'agendada' | 'compareceu' | 'cancelada';
  therapistEmail: string;
}

interface UpdateSessionBody {
  patientId?: string;
  date?: string;
  status?: 'agendada' | 'compareceu' | 'cancelada';
}

// Type-safe async handler
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

// GET /api/sessions - Get all sessions for a therapist
router.get("/", asyncHandler(async (req, res) => {
  const therapistEmail = req.query.therapistEmail as string;
  
  if (!therapistEmail) {
    return res.status(400).json({ error: "therapistEmail query parameter is required" });
  }

  try {
    // First get the therapist ID
    const therapistResult = await pool.query(
      "SELECT id FROM therapists WHERE email = $1",
      [therapistEmail]
    );

    if (!therapistResult.rows[0]) {
      return res.status(404).json({ error: "Therapist not found" });
    }

    const therapistId = therapistResult.rows[0].id;

    // Get all sessions for this therapist
    const result = await pool.query(
      `SELECT s.id, s.date, s.google_calendar_event_id, s.patient_id, 
              s.therapist_id, s.status, s.created_at,
              p.nome as patient_name
       FROM sessions s
       LEFT JOIN patients p ON s.patient_id = p.id
       WHERE s.therapist_id = $1
       ORDER BY s.date DESC`,
      [therapistId]
    );

    const sessions = result.rows.map(row => ({
      id: row.id.toString(),
      date: row.date,
      google_calendar_event_id: row.google_calendar_event_id,
      patient_id: row.patient_id.toString(),
      therapist_id: row.therapist_id.toString(),
      status: row.status,
      created_at: row.created_at,
      patient_name: row.patient_name
    }));

    return res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return res.status(500).json({ error: "Internal server error" });
  }
}));

// POST /api/sessions - Create a new session
router.post("/", asyncHandler(async (req, res) => {
  const { patientId, date, status = 'agendada', therapistEmail }: CreateSessionBody = req.body;

  if (!patientId || !date || !therapistEmail) {
    return res.status(400).json({ 
      error: "patientId, date, and therapistEmail are required" 
    });
  }

  try {
    // Get therapist ID
    const therapistResult = await pool.query(
      "SELECT id FROM therapists WHERE email = $1",
      [therapistEmail]
    );

    if (!therapistResult.rows[0]) {
      return res.status(404).json({ error: "Therapist not found" });
    }

    const therapistId = therapistResult.rows[0].id;

    // Verify patient exists and belongs to this therapist
    const patientResult = await pool.query(
      "SELECT id FROM patients WHERE id = $1 AND therapist_id = $2",
      [patientId, therapistId]
    );

    if (!patientResult.rows[0]) {
      return res.status(404).json({ error: "Patient not found or not accessible" });
    }

    // Create the session
    const result = await pool.query(
      `INSERT INTO sessions (date, patient_id, therapist_id, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id, date, google_calendar_event_id, patient_id, therapist_id, status, created_at`,
      [date, patientId, therapistId, status]
    );

    const session = {
      id: result.rows[0].id.toString(),
      date: result.rows[0].date,
      google_calendar_event_id: result.rows[0].google_calendar_event_id,
      patient_id: result.rows[0].patient_id.toString(),
      therapist_id: result.rows[0].therapist_id.toString(),
      status: result.rows[0].status,
      created_at: result.rows[0].created_at
    };

    return res.status(201).json(session);
  } catch (error) {
    console.error('Error creating session:', error);
    return res.status(500).json({ error: "Internal server error" });
  }
}));

// PUT /api/sessions/:id - Update a session
router.put("/:id", asyncHandler(async (req, res) => {
  const sessionId = req.params.id;
  const { patientId, date, status }: UpdateSessionBody = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: "Session ID is required" });
  }

  try {
    // Check if session exists
    const existingSession = await pool.query(
      "SELECT id, therapist_id FROM sessions WHERE id = $1",
      [sessionId]
    );

    if (!existingSession.rows[0]) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (patientId !== undefined) {
      updates.push(`patient_id = $${paramCount}`);
      values.push(patientId);
      paramCount++;
    }

    if (date !== undefined) {
      updates.push(`date = $${paramCount}`);
      values.push(date);
      paramCount++;
    }

    if (status !== undefined) {
      updates.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No update fields provided" });
    }

    // Add session ID as the last parameter
    values.push(sessionId);

    const query = `
      UPDATE sessions 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, date, google_calendar_event_id, patient_id, therapist_id, status, created_at
    `;

    const result = await pool.query(query, values);

    const session = {
      id: result.rows[0].id.toString(),
      date: result.rows[0].date,
      google_calendar_event_id: result.rows[0].google_calendar_event_id,
      patient_id: result.rows[0].patient_id.toString(),
      therapist_id: result.rows[0].therapist_id.toString(),
      status: result.rows[0].status,
      created_at: result.rows[0].created_at
    };

    return res.json(session);
  } catch (error) {
    console.error('Error updating session:', error);
    return res.status(500).json({ error: "Internal server error" });
  }
}));

// GET /api/sessions/:patientId - Get sessions for a specific patient (existing endpoint)
router.get("/:patientId", asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const therapistEmail = req.query.therapistEmail as string;

  if (!therapistEmail) {
    return res.status(400).json({ error: "therapistEmail query parameter is required" });
  }

  try {
    // Get therapist ID
    const therapistResult = await pool.query(
      "SELECT id FROM therapists WHERE email = $1",
      [therapistEmail]
    );

    if (!therapistResult.rows[0]) {
      return res.status(404).json({ error: "Therapist not found" });
    }

    const therapistId = therapistResult.rows[0].id;

    // Get sessions for the specific patient
    const result = await pool.query(
      `SELECT id, date, google_calendar_event_id, patient_id, therapist_id, status, created_at
       FROM sessions 
       WHERE patient_id = $1 AND therapist_id = $2 AND status != 'cancelada'
       ORDER BY date ASC`,
      [patientId, therapistId]
    );

    const sessions = result.rows.map(row => ({
      id: row.id.toString(),
      date: new Date(row.date).toLocaleString('pt-BR'),
      google_calendar_event_id: row.google_calendar_event_id,
      patient_id: row.patient_id.toString(),
      therapist_id: row.therapist_id.toString(),
      status: row.status,
      created_at: row.created_at
    }));

    return res.json(sessions);
  } catch (error) {
    console.error('Error fetching patient sessions:', error);
    return res.status(500).json({ error: "Internal server error" });
  }
}));

export default router;