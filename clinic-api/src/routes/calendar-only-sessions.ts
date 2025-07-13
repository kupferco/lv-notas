// clinic-api/src/routes/calendar-only-sessions.ts
import express, { Router, Request, Response, NextFunction } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import { calendarOnlySessionsService } from "../services/calendar-only-sessions.js";

const router: Router = Router();

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

// GET /api/calendar-only/patients/:patientId
// Get sessions for a specific patient from Google Calendar
router.get("/patients/:patientId", asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const therapistEmail = req.query.therapistEmail as string;
  const userAccessToken = req.query.userAccessToken as string;

  if (!therapistEmail) {
    return res.status(400).json({ error: "therapistEmail is required" });
  }

  try {
    const sessions = await calendarOnlySessionsService.getPatientSessions(
      parseInt(patientId),
      therapistEmail,
      userAccessToken
    );

    return res.json(sessions);
  } catch (error) {
    console.error('Error getting patient sessions:', error);
    return res.status(500).json({ 
      error: "Failed to get patient sessions from calendar",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// GET /api/calendar-only/patients
// Get all patients with their calendar sessions
router.get("/patients", asyncHandler(async (req, res) => {
  const therapistEmail = req.query.therapistEmail as string;
  const userAccessToken = req.query.userAccessToken as string;
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

  if (!therapistEmail) {
    return res.status(400).json({ error: "therapistEmail is required" });
  }

  try {
    const patientsWithSessions = await calendarOnlySessionsService.getAllPatientsWithSessions(
      therapistEmail,
      userAccessToken,
      startDate,
      endDate
    );

    return res.json(patientsWithSessions);
  } catch (error) {
    console.error('Error getting patients with sessions:', error);
    return res.status(500).json({ 
      error: "Failed to get patients with sessions from calendar",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// GET /api/calendar-only/sessions
// Get calendar sessions with payment information
router.get("/sessions", asyncHandler(async (req, res) => {
  const therapistEmail = req.query.therapistEmail as string;
  const userAccessToken = req.query.userAccessToken as string;
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
  const autoCheckIn = req.query.autoCheckIn === 'true';

  if (!therapistEmail) {
    return res.status(400).json({ error: "therapistEmail is required" });
  }

  try {
    const sessions = await calendarOnlySessionsService.getSessionsWithPayments(
      therapistEmail,
      userAccessToken,
      startDate,
      endDate,
      autoCheckIn
    );

    return res.json(sessions);
  } catch (error) {
    console.error('Error getting sessions with payments:', error);
    return res.status(500).json({ 
      error: "Failed to get sessions with payments from calendar",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// PUT /api/calendar-only/patients/:patientId/billing-start-date
// Update patient billing start date
router.put("/patients/:patientId/billing-start-date", asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const { startDate } = req.body;

  if (!startDate) {
    return res.status(400).json({ error: "startDate is required" });
  }

  try {
    await calendarOnlySessionsService.updatePatientBillingStartDate(
      parseInt(patientId),
      new Date(startDate)
    );

    return res.json({ 
      message: "Patient billing start date updated successfully",
      patientId: parseInt(patientId),
      newStartDate: startDate
    });
  } catch (error) {
    console.error('Error updating patient billing start date:', error);
    return res.status(500).json({ 
      error: "Failed to update patient billing start date",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// GET /api/calendar-only/debug
// Debug endpoint to check calendar connectivity and data
router.get("/debug", asyncHandler(async (req, res) => {
  const therapistEmail = req.query.therapistEmail as string;
  const userAccessToken = req.query.userAccessToken as string;

  if (!therapistEmail) {
    return res.status(400).json({ error: "therapistEmail is required" });
  }

  try {
    // Get basic info about the therapist's calendar data
    const patientsWithSessions = await calendarOnlySessionsService.getAllPatientsWithSessions(
      therapistEmail,
      userAccessToken
    );

    const debugInfo = {
      therapistEmail,
      totalPatients: patientsWithSessions.length,
      patientsWithBillingDates: patientsWithSessions.filter(p => p.billingStartDate).length,
      patientsWithSessions: patientsWithSessions.filter(p => p.sessions.length > 0).length,
      totalSessions: patientsWithSessions.reduce((sum, p) => sum + p.sessions.length, 0),
      earliestBillingDate: patientsWithSessions
        .filter(p => p.billingStartDate)
        .map(p => p.billingStartDate!)
        .sort((a, b) => a.getTime() - b.getTime())[0],
      latestSessionDate: patientsWithSessions
        .flatMap(p => p.sessions)
        .map(s => s.date)
        .sort((a, b) => b.getTime() - a.getTime())[0],
      calendarWritesEnabled: process.env.CALENDAR_WRITES_ENABLED !== 'false',
      patients: patientsWithSessions.map(p => ({
        name: p.name,
        billingStartDate: p.billingStartDate,
        sessionCount: p.sessions.length,
        lastSessionDate: p.sessions.length > 0 ? p.sessions[p.sessions.length - 1].date : null
      }))
    };

    return res.json(debugInfo);
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return res.status(500).json({ 
      error: "Debug endpoint failed",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

export default router;