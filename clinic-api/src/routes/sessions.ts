import express, { Router, Request, Response, NextFunction } from "express";
import pool from "../config/database.js";

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

// GET /api/sessions/:patientId?therapistEmail=email - Get sessions for a patient, filtered by therapist
router.get("/:patientId", asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const { therapistEmail } = req.query;
  
  if (!therapistEmail) {
    return res.status(400).json({ error: "therapistEmail parameter is required" });
  }
  
  // First, get the therapist ID
  const therapistResult = await pool.query(
    "SELECT id FROM therapists WHERE email = $1",
    [therapistEmail]
  );
  
  if (therapistResult.rows.length === 0) {
    return res.status(404).json({ error: "Therapist not found" });
  }
  
  const therapistId = therapistResult.rows[0].id;
  
  // Get sessions for this patient, but only if they belong to this therapist
  const result = await pool.query(
    `SELECT id, to_char(date, 'DD/MM/YYYY HH24:MI') as date 
     FROM sessions 
     WHERE patient_id = $1 
     AND therapist_id = $2
     AND status = 'agendada'
     ORDER BY date ASC`,
    [patientId, therapistId]
  );
  
  return res.json(result.rows);
}));

export default router;
