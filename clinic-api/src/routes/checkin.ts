import express, { Router, Request, Response, NextFunction } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import pool from "../config/database.js";
import { googleCalendarService } from "../services/google-calendar.js";

const router: Router = Router();

// Define a type for the request body
interface CheckInBody {
  patientId: string;
  sessionId: string;
}

// More explicit type-safe handler
const asyncHandler = (
  handler: (
    req: Request<ParamsDictionary, any, CheckInBody>, 
    res: Response
  ) => Promise<Response | void>
) => {
  return async (
    req: Request<ParamsDictionary, any, CheckInBody>, 
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

router.post("/", asyncHandler(async (req, res) => {
  const { patientId, sessionId } = req.body;
  
  // First get patient and session details from our database
  const patient = await pool.query(
    "SELECT nome FROM patients WHERE id = $1",
    [patientId]
  );
  
  const session = await pool.query(
    "SELECT date FROM sessions WHERE id = $1",
    [sessionId]
  );
  
  if (!patient.rows[0] || !session.rows[0]) {
    return res.status(404).json({ error: "Patient or session not found" });
  }
  
  // Record check-in in our database
  await pool.query(
    `INSERT INTO check_ins 
     (patient_id, session_id, session_date, created_by, status) 
     VALUES ($1, $2, $3, $4, $5)`,
    [patientId, sessionId, session.rows[0].date, "system", "compareceu"]
  );

  // Update session status
  await pool.query(
    "UPDATE sessions SET status = $1 WHERE id = $2",
    ["compareceu", sessionId]
  );

  return res.json({ message: "Check-in successful" });
}));

export default router;