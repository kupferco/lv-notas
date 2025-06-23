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

// GET /api/patients?therapistEmail=email - Filter patients by therapist
router.get("/", asyncHandler(async (req, res) => {
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
  
  // Get patients associated with this therapist through sessions
  const result = await pool.query(
    `SELECT DISTINCT p.id, p.nome as name 
     FROM patients p 
     INNER JOIN sessions s ON p.id = s.patient_id 
     WHERE s.therapist_id = $1 
     ORDER BY p.nome ASC`,
    [therapistId]
  );
  
  return res.json(result.rows);
}));

export default router;
