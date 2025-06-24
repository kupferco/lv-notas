import express, { Router, Request, Response, NextFunction } from "express";
import pool from "../config/database.js";

const router: Router = Router();

interface PatientBody {
  nome: string;
  email?: string;
  telefone?: string;
  therapistEmail: string;
}

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

// GET /api/patients?therapistEmail=email - Filter patients by therapist
router.get("/", asyncHandler(async (req, res) => {
  const { therapistEmail } = req.query;

  if (!therapistEmail) {
    return res.status(400).json({ error: "therapistEmail parameter is required" });
  }

  // Get patients directly linked to this therapist
  const result = await pool.query(
    `SELECT p.id, p.nome as name 
     FROM patients p 
     INNER JOIN therapists t ON p.therapist_id = t.id 
     WHERE t.email = $1 
     ORDER BY p.nome ASC`,
    [therapistEmail]
  );

  return res.json(result.rows);
}));

// POST /api/patients - Create a new patient
router.post("/", asyncHandler(async (req, res) => {
  const { nome, email, telefone, therapistEmail } = req.body as PatientBody;

  console.log("=== CREATE PATIENT REQUEST ===");
  console.log("Request body:", { nome, email, telefone, therapistEmail });

  if (!nome || !therapistEmail) {
    const missingFields = [];
    if (!nome) missingFields.push('nome');
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
      `INSERT INTO patients (nome, email, telefone, therapist_id) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, nome as name, email, telefone`,
      [nome, email || null, telefone || null, therapistId]
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

export default router;
