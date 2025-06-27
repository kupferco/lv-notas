// clinic-api/src/routes/therapists.ts
import express, { Router, Request, Response, NextFunction } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import pool from "../config/database.js";
import { 
  Therapist, 
  TherapistOnboarding,
  OnboardingStatusResponse,
  BillingCycleChangeRequest,
  OnboardingStep,
  BillingCycle,
  isOnboardingStep,
  isBillingCycle
} from "../types/index.js";

const router: Router = Router();

// ============================================================================
// YOUR EXISTING TYPE DEFINITIONS (Keep as-is)
// ============================================================================

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

// ============================================================================
// YOUR EXISTING ENDPOINTS (Keep exactly as-is)
// ============================================================================

// GET /api/therapists/:email - Get therapist by email
router.get("/:email", asyncHandler(async (req, res) => {
  const { email } = req.params;
  
  try {
    const result = await pool.query(
      'SELECT id, nome as name, email, google_calendar_id as "googleCalendarId", created_at FROM therapists WHERE email = $1',
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

// ============================================================================
// NEW ENHANCED ENDPOINTS (Onboarding & Billing)
// ============================================================================

// GET /api/therapists/:email/full - Get complete therapist data with billing info
router.get("/:email/full", asyncHandler(async (req, res) => {
  const { email } = req.params;
  
  try {
    const result = await pool.query(
      `SELECT 
        id, nome, email, telefone, google_calendar_id,
        billing_cycle, default_session_price,
        onboarding_completed, onboarding_started_at, 
        onboarding_completed_at, onboarding_current_step,
        created_at
       FROM therapists 
       WHERE email = $1`,
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Therapist not found" });
    }
    
    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching full therapist data:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}));

// GET /api/therapists/:email/onboarding-status - Get complete onboarding status
router.get("/:email/onboarding-status", asyncHandler(async (req, res) => {
  const { email } = req.params;

  try {
    // Get therapist
    const therapistResult = await pool.query(
      `SELECT * FROM therapists WHERE email = $1`,
      [email]
    );

    if (therapistResult.rows.length === 0) {
      return res.status(404).json({ error: "Therapist not found" });
    }

    const therapist = therapistResult.rows[0] as Therapist;

    // Get onboarding steps
    const stepsResult = await pool.query(
      `SELECT * FROM therapist_onboarding 
       WHERE therapist_id = $1 
       ORDER BY created_at ASC`,
      [therapist.id]
    );

    const onboarding_steps = stepsResult.rows as TherapistOnboarding[];
    
    // Calculate progress
    const totalSteps = 6; // calendar_selection, event_import, patient_creation, appointment_linking, dual_date_setup, billing_configuration
    const completedSteps = onboarding_steps.filter(step => step.completed).length;
    const progress_percentage = Math.round((completedSteps / totalSteps) * 100);
    
    // Determine current step
    const incompleteSteps = onboarding_steps.filter(step => !step.completed);
    const current_step = incompleteSteps.length > 0 ? incompleteSteps[0].step : 'completed';
    
    // Determine next step
    const stepOrder: OnboardingStep[] = [
      'calendar_selection', 'event_import', 'patient_creation', 
      'appointment_linking', 'dual_date_setup', 'billing_configuration'
    ];
    const currentIndex = stepOrder.indexOf(current_step as OnboardingStep);
    const next_step = currentIndex >= 0 && currentIndex < stepOrder.length - 1 
      ? stepOrder[currentIndex + 1] 
      : undefined;

    const response: OnboardingStatusResponse = {
      therapist,
      onboarding_steps,
      current_step,
      progress_percentage,
      next_step,
      can_complete: progress_percentage === 100
    };

    return res.json(response);
  } catch (error) {
    console.error("Error fetching onboarding status:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}));

// POST /api/therapists/:email/onboarding-step - Update onboarding step
router.post("/:email/onboarding-step", asyncHandler(async (req, res) => {
  const { email } = req.params;
  const { step, data, completed = true } = req.body;

  if (!isOnboardingStep(step)) {
    return res.status(400).json({ 
      error: "Invalid onboarding step",
      valid_steps: ['calendar_selection', 'event_import', 'patient_creation', 'appointment_linking', 'dual_date_setup', 'billing_configuration']
    });
  }

  try {
    // Get therapist
    const therapistResult = await pool.query(
      `SELECT id FROM therapists WHERE email = $1`,
      [email]
    );

    if (therapistResult.rows.length === 0) {
      return res.status(404).json({ error: "Therapist not found" });
    }

    const therapistId = therapistResult.rows[0].id;

    // Check if step already exists
    const existingStep = await pool.query(
      `SELECT id FROM therapist_onboarding 
       WHERE therapist_id = $1 AND step = $2`,
      [therapistId, step]
    );

    let result;
    if (existingStep.rows.length > 0) {
      // Update existing step
      result = await pool.query(
        `UPDATE therapist_onboarding 
         SET completed = $1, completed_at = $2, data = $3, updated_at = CURRENT_TIMESTAMP
         WHERE therapist_id = $4 AND step = $5
         RETURNING *`,
        [completed, completed ? new Date() : null, JSON.stringify(data), therapistId, step]
      );
    } else {
      // Create new step
      result = await pool.query(
        `INSERT INTO therapist_onboarding 
         (therapist_id, step, completed, completed_at, data)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [therapistId, step, completed, completed ? new Date() : null, JSON.stringify(data)]
      );
    }

    // If all steps are completed, mark therapist as onboarding complete
    if (completed) {
      const allStepsResult = await pool.query(
        `SELECT COUNT(*) as total, COUNT(CASE WHEN completed THEN 1 END) as completed_count
         FROM therapist_onboarding 
         WHERE therapist_id = $1`,
        [therapistId]
      );

      const { total, completed_count } = allStepsResult.rows[0];
      if (total >= 6 && completed_count >= 6) { // All 6 steps completed
        await pool.query(
          `UPDATE therapists 
           SET onboarding_completed = true, 
               onboarding_completed_at = CURRENT_TIMESTAMP,
               onboarding_current_step = 'completed'
           WHERE id = $1`,
          [therapistId]
        );
      }
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating onboarding step:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}));

// PUT /api/therapists/:email/billing-cycle - Change therapist's default billing
router.put("/:email/billing-cycle", asyncHandler(async (req, res) => {
  const { email } = req.params;
  const { billingCycle, sessionPrice, effectiveDate, reason } = req.body as BillingCycleChangeRequest;

  if (!isBillingCycle(billingCycle)) {
    return res.status(400).json({ 
      error: "Invalid billing cycle",
      valid_options: ['monthly', 'weekly', 'per_session', 'ad_hoc']
    });
  }

  if (!sessionPrice || sessionPrice <= 0) {
    return res.status(400).json({ error: "Session price must be greater than 0" });
  }

  const effectiveDateTime = effectiveDate ? new Date(effectiveDate) : new Date();

  try {
    // Get therapist
    const therapistResult = await pool.query(
      `SELECT id FROM therapists WHERE email = $1`,
      [email]
    );

    if (therapistResult.rows.length === 0) {
      return res.status(404).json({ error: "Therapist not found" });
    }

    const therapistId = therapistResult.rows[0].id;

    // Use the database function to change billing cycle
    const result = await pool.query(
      `SELECT change_therapist_billing_cycle($1, $2, $3, $4, $5, $6) as success`,
      [therapistId, billingCycle, sessionPrice, effectiveDateTime, reason || null, email]
    );

    if (result.rows[0].success) {
      // Get updated therapist data
      const updatedTherapist = await pool.query(
        `SELECT * FROM therapists WHERE id = $1`,
        [therapistId]
      );

      return res.json({
        message: "Billing cycle updated successfully",
        therapist: updatedTherapist.rows[0],
        effective_date: effectiveDateTime
      });
    } else {
      return res.status(500).json({ error: "Failed to update billing cycle" });
    }
  } catch (error) {
    console.error("Error updating billing cycle:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}));

// GET /api/therapists/:email/billing-history - Get billing change history
router.get("/:email/billing-history", asyncHandler(async (req, res) => {
  const { email } = req.params;

  try {
    const result = await pool.query(
      `SELECT tbh.*, t.nome as therapist_name
       FROM therapist_billing_history tbh
       JOIN therapists t ON tbh.therapist_id = t.id
       WHERE t.email = $1
       ORDER BY tbh.effective_date DESC`,
      [email]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error("Error fetching billing history:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}));

export default router;