// clinic-api/src/routes/onboarding.ts

import express, { Router, Request, Response, NextFunction } from "express";
import pool from "../config/database.js";
import { onboardingService } from "../services/onboarding.js";
import {
  CalendarImportRequest,
  CalendarImportResponse,
  BulkPatientCreateRequest
} from "../types/index.js";

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
// CALENDAR IMPORT ENDPOINTS
// ============================================================================

// POST /api/onboarding/import-calendar - Import calendar events for onboarding
router.post("/import-calendar", asyncHandler(async (req, res) => {
  const { therapistEmail, lookbackMonths = 6, includeAllEvents = false } = req.body as CalendarImportRequest;

  if (!therapistEmail) {
    return res.status(400).json({ error: "therapistEmail is required" });
  }

  try {
    console.log(`Starting calendar import for ${therapistEmail}, looking back ${lookbackMonths} months`);

    const result = await onboardingService.importCalendarEvents({
      therapistEmail,
      lookbackMonths,
      includeAllEvents
    });

    console.log(`Calendar import complete: ${result.total_events} events, ${result.patient_candidates.length} patient candidates`);

    return res.json(result);
  } catch (error: any) {
    console.error("Calendar import failed:", error);
    return res.status(500).json({
      error: "Calendar import failed",
      details: error.message
    });
  }
}));

// GET /api/onboarding/imported-events/:therapistEmail - Get imported events for review
router.get("/imported-events/:therapistEmail", asyncHandler(async (req, res) => {
  const { therapistEmail } = req.params;

  try {
    // Get therapist ID
    const therapistResult = await pool.query(
      "SELECT id FROM therapists WHERE email = $1",
      [therapistEmail]
    );

    if (therapistResult.rows.length === 0) {
      return res.status(404).json({ error: "Therapist not found" });
    }

    const therapistId = therapistResult.rows[0].id;

    // Get imported events
    const eventsResult = await pool.query(
      `SELECT * FROM imported_calendar_events 
       WHERE therapist_id = $1 
       ORDER BY start_time DESC`,
      [therapistId]
    );

    return res.json(eventsResult.rows);
  } catch (error: any) {
    console.error("Error fetching imported events:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}));

// PUT /api/onboarding/mark-therapy-sessions - Mark which events are therapy sessions
router.put("/mark-therapy-sessions", asyncHandler(async (req, res) => {
  const { therapistEmail, eventIds, isTherapySession } = req.body;

  if (!therapistEmail || !eventIds || typeof isTherapySession !== 'boolean') {
    return res.status(400).json({
      error: "therapistEmail, eventIds array, and isTherapySession boolean are required"
    });
  }

  try {
    // Get therapist ID
    const therapistResult = await pool.query(
      "SELECT id FROM therapists WHERE email = $1",
      [therapistEmail]
    );

    if (therapistResult.rows.length === 0) {
      return res.status(404).json({ error: "Therapist not found" });
    }

    const therapistId = therapistResult.rows[0].id;

    // Update the events
    const result = await pool.query(
      `UPDATE imported_calendar_events 
       SET is_therapy_session = $1 
       WHERE id = ANY($2) AND therapist_id = $3
       RETURNING id`,
      [isTherapySession, eventIds, therapistId]
    );

    return res.json({
      message: `Updated ${result.rowCount} events`,
      updated_count: result.rowCount
    });
  } catch (error: any) {
    console.error("Error marking therapy sessions:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}));

// ============================================================================
// PATIENT MATCHING ENDPOINTS
// ============================================================================

// GET /api/onboarding/patient-candidates/:therapistEmail - Get patient candidates from import
router.get("/patient-candidates/:therapistEmail", asyncHandler(async (req, res) => {
  const { therapistEmail } = req.params;

  try {
    // Get therapist ID
    const therapistResult = await pool.query(
      "SELECT id FROM therapists WHERE email = $1",
      [therapistEmail]
    );

    if (therapistResult.rows.length === 0) {
      return res.status(404).json({ error: "Therapist not found" });
    }

    const therapistId = therapistResult.rows[0].id;

    // Get patient candidates with event details
    const candidatesResult = await pool.query(
      `SELECT 
        pmc.*,
        ice.summary as event_summary,
        ice.start_time as event_start_time,
        ice.confidence_score as event_confidence
       FROM patient_matching_candidates pmc
       JOIN imported_calendar_events ice ON pmc.imported_event_id = ice.id
       WHERE pmc.therapist_id = $1
       ORDER BY pmc.confidence_score DESC, pmc.extracted_name ASC`,
      [therapistId]
    );

    return res.json(candidatesResult.rows);
  } catch (error: any) {
    console.error("Error fetching patient candidates:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}));

// POST /api/onboarding/match-existing-patients - Try to match candidates to existing patients
router.post("/match-existing-patients", asyncHandler(async (req, res) => {
  const { therapistEmail } = req.body;

  if (!therapistEmail) {
    return res.status(400).json({ error: "therapistEmail is required" });
  }

  try {
    // Get therapist ID
    const therapistResult = await pool.query(
      "SELECT id FROM therapists WHERE email = $1",
      [therapistEmail]
    );

    if (therapistResult.rows.length === 0) {
      return res.status(404).json({ error: "Therapist not found" });
    }

    const therapistId = therapistResult.rows[0].id;

    // Run the matching process
    await onboardingService.matchCandidatesToExistingPatients(therapistId);

    // Get updated candidates
    const updatedCandidates = await pool.query(
      `SELECT 
        pmc.*,
        p.nome as matched_patient_name
       FROM patient_matching_candidates pmc
       LEFT JOIN patients p ON pmc.matched_patient_id = p.id
       WHERE pmc.therapist_id = $1
       ORDER BY pmc.confidence_score DESC`,
      [therapistId]
    );

    const matchedCount = updatedCandidates.rows.filter(c => c.matched_patient_id).length;
    const unmatchedCount = updatedCandidates.rows.filter(c => !c.matched_patient_id).length;

    return res.json({
      message: "Patient matching complete",
      matched_count: matchedCount,
      unmatched_count: unmatchedCount,
      candidates: updatedCandidates.rows
    });
  } catch (error: any) {
    console.error("Error matching existing patients:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}));

// ============================================================================
// BULK PATIENT CREATION
// ============================================================================

// POST /api/onboarding/create-patients-from-candidates - Create patients from unmatched candidates
router.post("/create-patients-from-candidates", asyncHandler(async (req, res) => {
  const { therapistEmail, candidateIds, billingStartDate } = req.body;

  if (!therapistEmail || !candidateIds || !Array.isArray(candidateIds) || !billingStartDate) {
    return res.status(400).json({
      error: "therapistEmail, candidateIds array, and billingStartDate are required"
    });
  }

  try {
    // Get therapist ID
    const therapistResult = await pool.query(
      "SELECT id FROM therapists WHERE email = $1",
      [therapistEmail]
    );

    if (therapistResult.rows.length === 0) {
      return res.status(404).json({ error: "Therapist not found" });
    }

    const therapistId = therapistResult.rows[0].id;

    // Get the selected candidates
    const candidatesResult = await pool.query(
      `SELECT * FROM patient_matching_candidates 
       WHERE id = ANY($1) AND therapist_id = $2 AND matched_patient_id IS NULL`,
      [candidateIds, therapistId]
    );

    const candidates = candidatesResult.rows;
    const createdPatients = [];
    const errors = [];

    for (const candidate of candidates) {
      try {
        // Create patient from candidate
        const patientResult = await pool.query(
          `INSERT INTO patients (
            nome, email, therapist_id, lv_notas_billing_start_date
          ) VALUES ($1, $2, $3, $4) 
          RETURNING *`,
          [
            candidate.extracted_name,
            candidate.extracted_email || null,
            therapistId,
            new Date(billingStartDate)
          ]
        );

        const newPatient = patientResult.rows[0];
        createdPatients.push(newPatient);

        // Update candidate to mark it as matched
        await pool.query(
          `UPDATE patient_matching_candidates 
           SET matched_patient_id = $1, requires_new_patient = false 
           WHERE id = $2`,
          [newPatient.id, candidate.id]
        );

      } catch (error: any) {
        errors.push({
          candidate_id: candidate.id,
          candidate_name: candidate.extracted_name,
          error: error.message
        });
      }
    }

    return res.json({
      message: "Patient creation complete",
      created_patients: createdPatients,
      errors: errors,
      summary: {
        total_requested: candidates.length,
        successfully_created: createdPatients.length,
        failed: errors.length
      }
    });
  } catch (error: any) {
    console.error("Error creating patients from candidates:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}));

// ============================================================================
// SESSION LINKING ENDPOINTS
// ============================================================================

// POST /api/onboarding/link-events-to-patients - Link imported events to patients
router.post("/link-events-to-patients", asyncHandler(async (req, res) => {
  const { therapistEmail, links } = req.body;

  // links = [{ candidateId: 123, patientId: 456, createSession: true, countsForBilling: false }]
  if (!therapistEmail || !links || !Array.isArray(links)) {
    return res.status(400).json({
      error: "therapistEmail and links array are required"
    });
  }

  try {
    // Get therapist ID
    const therapistResult = await pool.query(
      "SELECT id FROM therapists WHERE email = $1",
      [therapistEmail]
    );

    if (therapistResult.rows.length === 0) {
      return res.status(404).json({ error: "Therapist not found" });
    }

    const therapistId = therapistResult.rows[0].id;

    const linkedSessions = [];
    const errors = [];

    for (const link of links) {
      try {
        const { candidateId, patientId, createSession = true, countsForBilling = false } = link;

        // Get the candidate and its associated event
        const candidateResult = await pool.query(
          `SELECT pmc.*, ice.start_time, ice.end_time, ice.google_event_id
           FROM patient_matching_candidates pmc
           JOIN imported_calendar_events ice ON pmc.imported_event_id = ice.id
           WHERE pmc.id = $1 AND pmc.therapist_id = $2`,
          [candidateId, therapistId]
        );

        if (candidateResult.rows.length === 0) {
          errors.push({
            candidate_id: candidateId,
            error: "Candidate not found"
          });
          continue;
        }

        const candidate = candidateResult.rows[0];

        // Create session if requested
        if (createSession) {
          console.log("🔥 CALENDAR IMPORT SESSION CREATION");
          console.log("📝 Session data being inserted:");
          console.log("  📅 Date:", candidate.start_time);
          console.log("  👤 Patient ID:", patientId);
          console.log("  👨‍⚕️ Therapist ID:", therapistId);
          console.log("  📆 Google Event ID:", candidate.google_event_id);
          console.log("  📊 Status: 'compareceu'");
          console.log("  💰 Counts for billing:", countsForBilling);
          console.log("  💵 Session price query: (SELECT preco FROM patients WHERE id = $2)");
          console.log("  🔍 Patient ID for price lookup:", patientId);

          // Check what the patient's price actually is
          const priceCheck = await pool.query("SELECT preco FROM patients WHERE id = $1", [patientId]);
          console.log("  💰 Patient's actual price from DB:", priceCheck.rows[0]?.preco);

          const sessionResult = await pool.query(
            `INSERT INTO sessions (
      date, patient_id, therapist_id, google_calendar_event_id, 
      status, counts_for_billing, session_price
    ) VALUES ($1, $2, $3, $4, $5, $6, (SELECT preco FROM patients WHERE id = $2))
    RETURNING *`,
            [
              candidate.start_time,
              patientId,
              therapistId,
              candidate.google_event_id,
              'compareceu',
              countsForBilling
            ]
          );

          console.log("✅ Session created with data:", {
            id: sessionResult.rows[0].id,
            session_price: sessionResult.rows[0].session_price,
            patient_id: sessionResult.rows[0].patient_id,
            date: sessionResult.rows[0].date
          });

          linkedSessions.push(sessionResult.rows[0]);
        }

        // Update candidate to show it's been processed
        await pool.query(
          `UPDATE patient_matching_candidates 
           SET matched_patient_id = $1 
           WHERE id = $2`,
          [patientId, candidateId]
        );

      } catch (error: any) {
        errors.push({
          candidate_id: link.candidateId,
          error: error.message
        });
      }
    }

    return res.json({
      message: "Event linking complete",
      linked_sessions: linkedSessions,
      errors: errors,
      summary: {
        total_requested: links.length,
        successfully_linked: linkedSessions.length,
        failed: errors.length
      }
    });
  } catch (error: any) {
    console.error("Error linking events to patients:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}));

// ============================================================================
// ONBOARDING SUMMARY & CLEANUP
// ============================================================================

// GET /api/onboarding/summary/:therapistEmail - Get onboarding import summary
router.get("/summary/:therapistEmail", asyncHandler(async (req, res) => {
  const { therapistEmail } = req.params;

  try {
    // Get therapist ID
    const therapistResult = await pool.query(
      "SELECT id FROM therapists WHERE email = $1",
      [therapistEmail]
    );

    if (therapistResult.rows.length === 0) {
      return res.status(404).json({ error: "Therapist not found" });
    }

    const therapistId = therapistResult.rows[0].id;

    // Get summary statistics
    const [eventsResult, candidatesResult, sessionsResult] = await Promise.all([
      // Imported events
      pool.query(
        `SELECT COUNT(*) as total_events,
         COUNT(CASE WHEN is_therapy_session = true THEN 1 END) as therapy_sessions,
         MIN(start_time) as earliest_event,
         MAX(start_time) as latest_event
         FROM imported_calendar_events 
         WHERE therapist_id = $1`,
        [therapistId]
      ),

      // Patient candidates
      pool.query(
        `SELECT COUNT(*) as total_candidates,
         COUNT(CASE WHEN matched_patient_id IS NOT NULL THEN 1 END) as matched_candidates,
         COUNT(CASE WHEN requires_new_patient = true AND matched_patient_id IS NULL THEN 1 END) as needs_new_patients
         FROM patient_matching_candidates 
         WHERE therapist_id = $1`,
        [therapistId]
      ),

      // Created sessions
      pool.query(
        `SELECT COUNT(*) as imported_sessions,
         COUNT(CASE WHEN counts_for_billing = true THEN 1 END) as billable_sessions
         FROM sessions 
         WHERE therapist_id = $1 AND google_calendar_event_id IS NOT NULL`,
        [therapistId]
      )
    ]);

    const summary = {
      import_stats: eventsResult.rows[0],
      matching_stats: candidatesResult.rows[0],
      session_stats: sessionsResult.rows[0],
      generated_at: new Date()
    };

    return res.json(summary);
  } catch (error: any) {
    console.error("Error generating onboarding summary:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}));

// DELETE /api/onboarding/cleanup/:therapistEmail - Clean up onboarding data
router.delete("/cleanup/:therapistEmail", asyncHandler(async (req, res) => {
  const { therapistEmail } = req.params;
  const { keepSessions = true } = req.query;

  try {
    // Get therapist ID
    const therapistResult = await pool.query(
      "SELECT id FROM therapists WHERE email = $1",
      [therapistEmail]
    );

    if (therapistResult.rows.length === 0) {
      return res.status(404).json({ error: "Therapist not found" });
    }

    const therapistId = therapistResult.rows[0].id;

    // Clean up candidates
    const candidatesResult = await pool.query(
      "DELETE FROM patient_matching_candidates WHERE therapist_id = $1 RETURNING id",
      [therapistId]
    );

    // Clean up imported events  
    const eventsResult = await pool.query(
      "DELETE FROM imported_calendar_events WHERE therapist_id = $1 RETURNING id",
      [therapistId]
    );

    // Optionally clean up imported sessions
    let sessionsResult = { rowCount: 0 };
    if (keepSessions !== 'true') {
      const deletedSessions = await pool.query(
        `DELETE FROM sessions 
         WHERE therapist_id = $1 AND google_calendar_event_id IS NOT NULL 
         RETURNING id`,
        [therapistId]
      );
      sessionsResult = { rowCount: deletedSessions.rowCount || 0 };
    }

    return res.json({
      message: "Onboarding data cleanup complete",
      deleted_candidates: candidatesResult.rowCount || 0,
      deleted_events: eventsResult.rowCount || 0,
      deleted_sessions: sessionsResult.rowCount || 0
    });
  } catch (error: any) {
    console.error("Error cleaning up onboarding data:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}));

export default router;