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
}));// POST /api/patients - Create a new patient
router.post("/", asyncHandler(async (req, res) => {
  const { nome, email, telefone, therapistEmail } = req.body as PatientBody;

  if (!nome || !therapistEmail) {
    return res.status(400).json({ error: "Nome and therapistEmail are required" });
  }

  // Get therapist ID
  const therapistResult = await pool.query(
    "SELECT id FROM therapists WHERE email = $1",
    [therapistEmail]
  );

  if (therapistResult.rows.length === 0) {
    return res.status(404).json({ error: "Therapist not found" });
  }

  const therapistId = therapistResult.rows[0].id;

  // Create the patient with therapist_id
  const result = await pool.query(
    `INSERT INTO patients (nome, email, telefone, therapist_id) 
     VALUES ($1, $2, $3, $4) 
     RETURNING id, nome as name, email, telefone`,
    [nome, email || null, telefone || null, therapistId]
  );

  return res.json(result.rows[0]);
}));

export default router;
