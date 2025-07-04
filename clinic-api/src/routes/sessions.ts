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
      message: "patientId, date, and therapistEmail are required"
    });
  }

  try {
    // Get therapist ID and selected calendar
    const therapistResult = await pool.query(
      "SELECT id, google_calendar_id FROM therapists WHERE email = $1",
      [therapistEmail]
    );

    if (!therapistResult.rows[0]) {
      return res.status(404).json({ message: "Therapist not found" });
    }

    const therapist = therapistResult.rows[0];
    const therapistId = therapist.id;

    // Get patient details (including email and name)
    const patientResult = await pool.query(
      "SELECT id, nome, email FROM patients WHERE id = $1 AND therapist_id = $2",
      [patientId, therapistId]
    );

    if (!patientResult.rows[0]) {
      return res.status(404).json({ message: "Patient not found or not accessible" });
    }

    const patient = patientResult.rows[0];

    // Get patient's price for this session
    const patientPriceResult = await pool.query(
      "SELECT preco FROM patients WHERE id = $1",
      [patientId]
    );

    const sessionPrice = patientPriceResult.rows[0]?.preco || null;

    // Create the session in database first
    const result = await pool.query(
      `INSERT INTO sessions (date, patient_id, therapist_id, status, session_price)
   VALUES ($1, $2, $3, $4, $5)
   RETURNING id, date, google_calendar_event_id, patient_id, therapist_id, status, session_price, created_at`,
      [date, patientId, therapistId, status, sessionPrice]
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

      const userAccessToken = req.headers['x-calendar-token'] as string;

      if (userAccessToken) {
        try {
          // Get the calendar's timezone first
          const calendarTimezone = await googleCalendarService.getCalendarTimezone(
            userAccessToken,
            therapist.google_calendar_id
          );

          console.log('Using calendar timezone:', calendarTimezone);

          const eventData = {
            summary: `Sessão - ${patient.nome}`,
            description: `Sessão de terapia para ${patient.nome}\nPaciente: ${patient.email}`,
            start: {
              dateTime: date,
              timeZone: calendarTimezone,
            },
            end: {
              dateTime: new Date(new Date(date).getTime() + 3600000).toISOString(),
              timeZone: calendarTimezone,
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

          let message = "Falha ao criar evento no Google Calendar";

          // Check for specific error types
          if (calendarError.message && calendarError.message.includes('Invalid attendee email')) {
            message = `Email do paciente inválido: O email "${patient.email}" não é um endereço de email válido`;
          } else if (calendarError.status === 401 || calendarError.message?.includes('Invalid Credentials')) {
            message = "Token de acesso expirado - faça login novamente para sincronizar com calendário";
          }

          // Return single message to frontend
          return res.status(400).json({
            message: message,
            session: session // Still return the session since it was created in DB
          });
        }
      } else {
        console.log('No user access token available');
        return res.status(400).json({
          message: "Token de acesso do Google não disponível",
          session: session
        });
      }
    } else {
      if (!patient.email) {
        return res.status(400).json({
          message: "Email do paciente é obrigatório para criar evento no calendário",
          session: session
        });
      }
      if (!therapist.google_calendar_id) {
        return res.status(400).json({
          message: "Calendário do terapeuta não foi selecionado",
          session: session
        });
      }
    }

    return res.status(201).json(session);
  } catch (error) {
    console.error('Error creating session:', error);
    return res.status(500).json({ message: "Internal server error" });
  }
}));

// PUT /api/sessions/:id - Update a session
router.put("/:id", asyncHandler(async (req, res) => {
  const sessionId = req.params.id;
  const { patientId, date, status }: UpdateSessionBody = req.body;

  if (!sessionId) {
    return res.status(400).json({ message: "Session ID is required" });
  }

  try {
    // Get current session details including therapist and patient info
    const sessionResult = await pool.query(
      `SELECT s.id, s.google_calendar_event_id, s.therapist_id, s.patient_id, s.date,
              t.google_calendar_id, t.email as therapist_email,
              p.nome as patient_name, p.email as patient_email
       FROM sessions s
       JOIN therapists t ON s.therapist_id = t.id
       LEFT JOIN patients p ON s.patient_id = p.id
       WHERE s.id = $1`,
      [sessionId]
    );

    if (!sessionResult.rows[0]) {
      return res.status(404).json({ message: "Session not found" });
    }

    const currentSession = sessionResult.rows[0];

    // If patient is being changed, get new patient details
    let updatedPatient = {
      nome: currentSession.patient_name,
      email: currentSession.patient_email
    };

    if (patientId !== undefined && patientId !== currentSession.patient_id.toString()) {
      const patientResult = await pool.query(
        "SELECT nome, email FROM patients WHERE id = $1 AND therapist_id = $2",
        [patientId, currentSession.therapist_id]
      );

      if (!patientResult.rows[0]) {
        return res.status(404).json({ message: "New patient not found or not accessible" });
      }

      updatedPatient = patientResult.rows[0];
    }

    // Build dynamic update query for database
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
      return res.status(400).json({ message: "No update fields provided" });
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

    // Update Google Calendar event if it exists and we have changes
    const userAccessToken = req.headers['x-calendar-token'] as string;

    if (currentSession.google_calendar_event_id &&
      currentSession.google_calendar_id &&
      userAccessToken &&
      (date !== undefined || patientId !== undefined)) {

      try {
        // Get the calendar's timezone first
        const calendarTimezone = await googleCalendarService.getCalendarTimezone(
          userAccessToken,
          currentSession.google_calendar_id
        );

        console.log('Using calendar timezone for update:', calendarTimezone);

        const eventData = {
          summary: `Sessão - ${updatedPatient.nome}`,
          description: `Sessão de terapia para ${updatedPatient.nome}\nPaciente: ${updatedPatient.email}`,
          start: {
            dateTime: date || currentSession.date,
            timeZone: calendarTimezone,
          },
          end: {
            dateTime: new Date(new Date(date || currentSession.date).getTime() + 3600000).toISOString(),
            timeZone: calendarTimezone,
          },
          attendees: updatedPatient.email ? [
            {
              email: updatedPatient.email,
              responseStatus: 'needsAction'
            }
          ] : []
        };

        await googleCalendarService.updateUserEvent(
          userAccessToken,
          currentSession.google_calendar_id,
          currentSession.google_calendar_event_id,
          eventData
        );

        console.log(`Updated calendar event ${currentSession.google_calendar_event_id}`);
      } catch (calendarError: any) {
        console.error('Error updating calendar event:', calendarError);

        // Handle specific auth errors
        if (calendarError.status === 401 || calendarError.message?.includes('Invalid Credentials')) {
          return res.status(200).json({
            ...session,
            message: "Sessão atualizada, mas falha na sincronização do calendário. Token de acesso expirado - faça login novamente."
          });
        } else {
          return res.status(200).json({
            ...session,
            message: "Sessão atualizada, mas falha na sincronização do calendário."
          });
        }
      }
    }

    return res.json(session);
  } catch (error) {
    console.error('Error updating session:', error);
    return res.status(500).json({ message: "Internal server error" });
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
       WHERE patient_id = $1 AND therapist_id = $2 AND status = 'agendada'
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

// DELETE /api/sessions/:id - Delete a session
router.delete("/:id", asyncHandler(async (req, res) => {
  const sessionId = req.params.id;

  if (!sessionId) {
    return res.status(400).json({ message: "Session ID is required" });
  }

  try {
    // Get session details including calendar event ID and therapist info
    const sessionResult = await pool.query(
      `SELECT s.id, s.google_calendar_event_id, s.therapist_id,
              t.google_calendar_id, t.email as therapist_email
       FROM sessions s
       JOIN therapists t ON s.therapist_id = t.id
       WHERE s.id = $1`,
      [sessionId]
    );

    if (!sessionResult.rows[0]) {
      return res.status(404).json({ message: "Session not found" });
    }

    const session = sessionResult.rows[0];
    const userAccessToken = req.headers['x-calendar-token'] as string;

    // Delete from Google Calendar if event exists and we have access token
    if (session.google_calendar_event_id && session.google_calendar_id && userAccessToken) {
      try {
        await googleCalendarService.deleteUserEvent(
          userAccessToken,
          session.google_calendar_id,
          session.google_calendar_event_id
        );
        console.log(`Deleted calendar event ${session.google_calendar_event_id}`);
      } catch (calendarError) {
        console.error('Error deleting calendar event:', calendarError);
        // Continue with database deletion even if calendar deletion fails
      }
    }

    // Delete associated check-ins first
    const checkInsResult = await pool.query(
      "DELETE FROM check_ins WHERE session_id = $1 RETURNING id",
      [sessionId]
    );

    const deletedCheckIns = checkInsResult.rowCount || 0;
    console.log(`Deleted ${deletedCheckIns} check-ins for session ${sessionId}`);

    // Then delete the session
    await pool.query("DELETE FROM sessions WHERE id = $1", [sessionId]);

    return res.status(200).json({
      message: deletedCheckIns > 0
        ? `Session and ${deletedCheckIns} associated check-in(s) deleted successfully`
        : "Session deleted successfully"
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    return res.status(500).json({ message: "Internal server error" });
  }
}));

export default router;