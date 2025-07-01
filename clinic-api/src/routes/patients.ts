// clinic-api/src/routes/patients.ts
import express, { Router, Request, Response, NextFunction } from "express";
import pool from "../config/database.js";
import {
  Patient,
  BulkPatientCreateRequest,
  BillingCycleChangeRequest,
  BillingCycle,
  isBillingCycle
} from "../types/index.js";

const router: Router = Router();

const asyncHandler = (
  handler: (
    req: Request,
    res: Response
  ) => Promise<Response | void>
) => {
  return async (
    req: Request,
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

// ============================================================================
// EXISTING ENDPOINTS
// ============================================================================

// GET /api/patients?therapistEmail=email - Filter patients by therapist
router.get("/", asyncHandler(async (req, res) => {
  const { therapistEmail } = req.query;

  if (!therapistEmail) {
    return res.status(400).json({ error: "therapistEmail parameter is required" });
  }

  // Include all patient fields with proper camelCase aliases
  const result = await pool.query(
    `SELECT 
       p.id, 
       p.nome as name, 
       p.email, 
       p.telefone,
       p.preco as "sessionPrice",
       p.therapy_start_date as "therapyStartDate",
       p.lv_notas_billing_start_date as "lvNotasBillingStartDate",
       p.notes as observacoes
     FROM patients p 
     INNER JOIN therapists t ON p.therapist_id = t.id 
     WHERE t.email = $1 
     ORDER BY p.nome ASC`,
    [therapistEmail]
  );

  return res.json(result.rows);
}));

// POST /api/patients - Create new patient
router.post("/", asyncHandler(async (req, res) => {
  const { nome, email, telefone, therapistEmail, sessionPrice } = req.body;

  console.log("=== CREATE PATIENT REQUEST ===");
  console.log("Request body:", { nome, email, telefone, therapistEmail });

  if (!nome || !email || !therapistEmail) {
    const missingFields = [];
    if (!nome) missingFields.push('nome');
    if (!email) missingFields.push('email');
    if (!therapistEmail) missingFields.push('therapistEmail');

    console.log("Missing required fields:", missingFields);
    return res.status(400).json({
      error: `Missing required fields: ${missingFields.join(', ')}`,
      receivedData: { nome, email, telefone, therapistEmail }
    });
  }

  try {
    // Get therapist ID
    console.log("Looking for therapist with email:", therapistEmail);
    const therapistResult = await pool.query(
      "SELECT id, nome, email FROM therapists WHERE email = $1",
      [therapistEmail]
    );

    console.log("Therapist query result:", therapistResult.rows);

    if (therapistResult.rows.length === 0) {
      console.log("Therapist not found");

      // Get a list of available therapist emails for debugging
      const allTherapists = await pool.query("SELECT email FROM therapists ORDER BY id DESC LIMIT 5");

      return res.status(404).json({
        error: `No therapist found with email: ${therapistEmail}`,
        attemptedEmail: therapistEmail,
        availableEmails: allTherapists.rows.map(t => t.email),
        suggestion: "Check if the therapist email is correct or if the therapist exists in the database"
      });
    }

    const therapistId = therapistResult.rows[0].id;
    console.log("Found therapist:", therapistResult.rows[0]);

    // Create the patient with therapist_id
    console.log("Creating patient with data:", [nome, email || null, telefone || null, therapistId]);
    const result = await pool.query(
      `INSERT INTO patients (nome, email, telefone, therapist_id, preco) 
   VALUES ($1, $2, $3, $4, $5) 
   RETURNING id, nome as name, email, telefone`,
      [nome, email || null, telefone || null, therapistId, sessionPrice || null]
    );

    console.log("Patient created successfully:", result.rows[0]);
    return res.json(result.rows[0]);
  } catch (error: any) {
    console.log("Database error:", error);
    return res.status(500).json({
      error: "Database error occurred while creating patient",
      details: error.message,
      therapistEmail: therapistEmail,
      patientName: nome
    });
  }
}));

// PUT /api/patients/:id - Update patient  
router.put("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    nome,
    email,
    telefone,
    sessionPrice,
    therapyStartDate,
    lvNotasBillingStartDate,
    observacoes
  } = req.body;

  console.log('UPDATE PATIENT DEBUG:');
  console.log('Patient ID:', id);
  console.log('Request body:', req.body);

  if (!nome || !email) {
    return res.status(400).json({ error: "Nome and email are required" });
  }

  try {
    const result = await pool.query(
      `UPDATE patients 
       SET 
         nome = $1, 
         email = $2, 
         telefone = $3,
         preco = $4,
         therapy_start_date = $5,
         lv_notas_billing_start_date = $6,
         notes = $7
       WHERE id = $8 
       RETURNING 
         id, 
         nome as name, 
         email, 
         telefone,
         preco as sessionPrice,
         therapy_start_date as therapyStartDate,
         lv_notas_billing_start_date as lvNotasBillingStartDate,
         notes as observacoes`,
      [
        nome,
        email || null,
        telefone || null,
        sessionPrice || null,
        therapyStartDate || null,
        lvNotasBillingStartDate || null,
        observacoes || null,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Patient not found" });
    }

    return res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Database error:", error);
    return res.status(500).json({ error: "Database error occurred while updating patient" });
  }
}));

// DELETE /api/patients/:id - Delete patient
router.delete("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // First check if patient has any sessions
    const sessionsResult = await pool.query(
      "SELECT COUNT(*) as count FROM sessions WHERE patient_id = $1",
      [id]
    );

    if (parseInt(sessionsResult.rows[0].count) > 0) {
      return res.status(400).json({
        error: "Cannot delete patient with existing sessions",
        message: "Este paciente possui sessões cadastradas e não pode ser excluído"
      });
    }

    const result = await pool.query(
      "DELETE FROM patients WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Patient not found" });
    }

    return res.json({ message: "Patient deleted successfully" });
  } catch (error: any) {
    console.error("Database error:", error);
    return res.status(500).json({ error: "Database error occurred while deleting patient" });
  }
}));

// ============================================================================
// NEW ENHANCED ENDPOINTS (Dual Date System & Billing)
// ============================================================================

// GET /api/patients/full?therapistEmail=email - Get patients with complete dual date & billing info
router.get("/full", asyncHandler(async (req, res) => {
  const { therapistEmail } = req.query;

  if (!therapistEmail) {
    return res.status(400).json({ error: "therapistEmail parameter is required" });
  }

  try {
    const result = await pool.query(
      `SELECT 
        p.id, p.nome as name, p.email, p.telefone,
        p.therapy_start_date, p.lv_notas_billing_start_date,
        p.billing_cycle_override, p.session_price_override,
        p.created_at,
        t.billing_cycle as therapist_billing_cycle,
        t.default_session_price as therapist_session_price
       FROM patients p 
       INNER JOIN therapists t ON p.therapist_id = t.id 
       WHERE t.email = $1 
       ORDER BY p.nome ASC`,
      [therapistEmail]
    );

    return res.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching full patient data:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}));

// POST /api/patients/enhanced - Create patient with dual date system
router.post("/enhanced", asyncHandler(async (req, res) => {
  const {
    nome,
    email,
    telefone,
    therapistEmail,
    therapy_start_date,
    lv_notas_billing_start_date,
    billing_cycle_override,
    session_price_override
  } = req.body;

  console.log("=== CREATE ENHANCED PATIENT REQUEST ===");
  console.log("Request body:", req.body);

  if (!nome || !email || !therapistEmail || !lv_notas_billing_start_date) {
    const missingFields = [];
    if (!nome) missingFields.push('nome');
    if (!email) missingFields.push('email');
    if (!therapistEmail) missingFields.push('therapistEmail');
    if (!lv_notas_billing_start_date) missingFields.push('lv_notas_billing_start_date');

    return res.status(400).json({
      error: `Missing required fields: ${missingFields.join(', ')}`,
      note: "lv_notas_billing_start_date is required for the dual date system"
    });
  }

  // Validate billing cycle override if provided
  if (billing_cycle_override && !isBillingCycle(billing_cycle_override)) {
    return res.status(400).json({
      error: "Invalid billing cycle override",
      valid_options: ['monthly', 'weekly', 'per_session', 'ad_hoc']
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

    // Create the enhanced patient (simplified - let Google Calendar handle recurring patterns)
    const result = await pool.query(
      `INSERT INTO patients (
        nome, email, telefone, therapist_id,
        therapy_start_date, lv_notas_billing_start_date,
        billing_cycle_override, session_price_override
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *`,
      [
        nome,
        email,
        telefone || null,
        therapistId,
        therapy_start_date ? new Date(therapy_start_date) : null,
        new Date(lv_notas_billing_start_date),
        billing_cycle_override || null,
        session_price_override || null
      ]
    );

    console.log("Enhanced patient created successfully:", result.rows[0]);
    return res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error("Database error:", error);
    return res.status(500).json({
      error: "Database error occurred while creating enhanced patient",
      details: error.message
    });
  }
}));

// POST /api/patients/bulk - Bulk create patients (for onboarding)
router.post("/bulk", asyncHandler(async (req, res) => {
  const { therapistEmail, patients } = req.body as BulkPatientCreateRequest;

  if (!therapistEmail || !patients || !Array.isArray(patients)) {
    return res.status(400).json({
      error: "therapistEmail and patients array are required"
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

    const createdPatients: Patient[] = [];
    const errors: Array<{ index: number; error: string; patient_data: any }> = [];

    // Process each patient
    for (let i = 0; i < patients.length; i++) {
      const patient = patients[i];

      try {
        // Validate required fields
        if (!patient.nome || !patient.lv_notas_billing_start_date) {
          errors.push({
            index: i,
            error: "Missing required fields: nome and lv_notas_billing_start_date",
            patient_data: patient
          });
          continue;
        }

        const result = await pool.query(
          `INSERT INTO patients (
            nome, email, telefone, therapist_id,
            therapy_start_date, lv_notas_billing_start_date
          ) VALUES ($1, $2, $3, $4, $5, $6) 
          RETURNING *`,
          [
            patient.nome,
            patient.email || null,
            patient.telefone || null,
            therapistId,
            patient.therapy_start_date ? new Date(patient.therapy_start_date) : null,
            new Date(patient.lv_notas_billing_start_date)
          ]
        );

        createdPatients.push(result.rows[0]);
      } catch (patientError: any) {
        errors.push({
          index: i,
          error: patientError.message,
          patient_data: patient
        });
      }
    }

    const response = {
      created_patients: createdPatients,
      errors: errors,
      summary: {
        total_requested: patients.length,
        successfully_created: createdPatients.length,
        failed: errors.length
      }
    };

    // Return 207 Multi-Status if some succeeded and some failed
    const statusCode = errors.length > 0 ? (createdPatients.length > 0 ? 207 : 400) : 201;
    return res.status(statusCode).json(response);

  } catch (error: any) {
    console.error("Bulk create error:", error);
    return res.status(500).json({ error: "Internal server error during bulk creation" });
  }
}));

// PUT /api/patients/:id/billing-cycle - Change patient-specific billing
router.put("/:id/billing-cycle", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { billingCycle, sessionPrice, effectiveDate, reason, therapistEmail } = req.body;

  if (!billingCycle || !sessionPrice || !therapistEmail) {
    return res.status(400).json({
      error: "billingCycle, sessionPrice, and therapistEmail are required"
    });
  }

  if (!isBillingCycle(billingCycle)) {
    return res.status(400).json({
      error: "Invalid billing cycle",
      valid_options: ['monthly', 'weekly', 'per_session', 'ad_hoc']
    });
  }

  if (sessionPrice <= 0) {
    return res.status(400).json({ error: "Session price must be greater than 0" });
  }

  const effectiveDateTime = effectiveDate ? new Date(effectiveDate) : new Date();

  try {
    // Verify patient exists and belongs to therapist
    const patientResult = await pool.query(
      `SELECT p.id, t.email 
       FROM patients p 
       JOIN therapists t ON p.therapist_id = t.id 
       WHERE p.id = $1 AND t.email = $2`,
      [id, therapistEmail]
    );

    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: "Patient not found or not accessible" });
    }

    // Use the database function to change patient billing cycle
    const result = await pool.query(
      `SELECT change_patient_billing_cycle($1, $2, $3, $4, $5, $6) as success`,
      [id, billingCycle, sessionPrice, effectiveDateTime, reason || null, therapistEmail]
    );

    if (result.rows[0].success) {
      // Get updated patient data
      const updatedPatient = await pool.query(
        `SELECT * FROM patients WHERE id = $1`,
        [id]
      );

      return res.json({
        message: "Patient billing cycle updated successfully",
        patient: updatedPatient.rows[0],
        effective_date: effectiveDateTime
      });
    } else {
      return res.status(500).json({ error: "Failed to update patient billing cycle" });
    }
  } catch (error: any) {
    console.error("Error updating patient billing cycle:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}));

// GET /api/patients/:id/billing-history - Get patient billing change history
router.get("/:id/billing-history", asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT pbh.*, p.nome as patient_name
       FROM patient_billing_history pbh
       JOIN patients p ON pbh.patient_id = p.id
       WHERE pbh.patient_id = $1
       ORDER BY pbh.effective_date DESC`,
      [id]
    );

    return res.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching patient billing history:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}));

// GET /api/patients/:id/billing-summary - Get current billing settings for patient
router.get("/:id/billing-summary", asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM current_billing_settings WHERE patient_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Patient not found" });
    }

    return res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error fetching patient billing summary:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}));

export default router;