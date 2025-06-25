// clinic-api/src/routes/sessions.ts
import express, { Router, Request, Response, NextFunction } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import pool from "../config/database.js";
import { googleCalendarService } from "../services/google-calendar.js";

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
    // Get therapist ID and selected calendar
    const therapistResult = await pool.query(
      "SELECT id, google_calendar_id FROM therapists WHERE email = $1",
      [therapistEmail]
    );

    if (!therapistResult.rows[0]) {
      return res.status(404).json({ error: "Therapist not found" });
    }

    const therapist = therapistResult.rows[0];
    const therapistId = therapist.id;

    // Get patient details (including email and name)
    const patientResult = await pool.query(
      "SELECT id, nome, email FROM patients WHERE id = $1 AND therapist_id = $2",
      [patientId, therapistId]
    );

    if (!patientResult.rows[0]) {
      return res.status(404).json({ error: "Patient not found or not accessible" });
    }

    const patient = patientResult.rows[0];

    // Create the session in database first
    const result = await pool.query(
      `INSERT INTO sessions (date, patient_id, therapist_id, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id, date, google_calendar_event_id, patient_id, therapist_id, status, created_at`,
      [date, patientId, therapistId, status]
    );

    let session = {
      id: result.rows[0].id.toString(),
      date: result.rows[0].date,
      google_calendar_event_id: result.rows[0].google_calendar_event_id,
      patient_id: result.rows[0].patient_id.toString(),
      therapist_id: result.rows[0].therapist_id.toString(),
      status: result.rows[0].status,
      created_at: result.rows[0].created_at
    };

    // Create Google Calendar event if patient has email and therapist has calendar selected
    if (patient.email && therapist.google_calendar_id) {
      console.log('Patient has email:', patient.email);
      console.log('Using therapist calendar:', therapist.google_calendar_id);

      const userAccessToken = req.headers['x-google-access-token'] as string;

      if (userAccessToken) {
        try {
          const eventData = {
            summary: `Sessão - ${patient.nome}`,
            description: `Sessão de terapia para ${patient.nome}\nPaciente: ${patient.email}`,
            start: {
              dateTime: date,
              timeZone: "America/Sao_Paulo",
            },
            end: {
              dateTime: new Date(new Date(date).getTime() + 3600000).toISOString(),
              timeZone: "America/Sao_Paulo",
            },
            attendees: [
              {
                email: patient.email,
                responseStatus: 'needsAction'
              }
            ]
          };

          const calendarEvent = await googleCalendarService.createUserEvent(
            userAccessToken,
            therapist.google_calendar_id,
            eventData
          );

          console.log('Calendar event created successfully:', calendarEvent);
          session.google_calendar_event_id = calendarEvent.id;

          // Update session with Google Calendar event ID
          await pool.query(
            "UPDATE sessions SET google_calendar_event_id = $1 WHERE id = $2",
            [calendarEvent.id, result.rows[0].id]
          );

        } catch (calendarError: any) {
          console.error('Error creating Google Calendar event:', calendarError);

          let errorMessage = "Falha ao criar evento no Google Calendar";
          let errorDetails = calendarError.message || "Erro desconhecido";

          // Check for specific error types
          if (calendarError.message && calendarError.message.includes('Invalid attendee email')) {
            errorMessage = "Email do paciente inválido";
            errorDetails = `O email "${patient.email}" não é um endereço de email válido`;
          }

          // Return detailed error to frontend
          return res.status(400).json({
            error: errorMessage,
            details: errorDetails,
            session: session // Still return the session since it was created in DB
          });
        }
      } else {
        console.log('No user access token available');
        return res.status(400).json({
          error: "Token de acesso do Google não disponível",
          session: session
        });
      }
    } else {
      if (!patient.email) {
        return res.status(400).json({
          error: "Email do paciente é obrigatório para criar evento no calendário",
          session: session
        });
      }
      if (!therapist.google_calendar_id) {
        return res.status(400).json({
          error: "Calendário do terapeuta não foi selecionado",
          session: session
        });
      }
    }

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