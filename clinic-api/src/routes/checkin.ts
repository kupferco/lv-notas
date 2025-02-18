import { Router } from "express";
import pool from "../../config/database";
import { googleCalendarService } from "../services/google-calendar";

const router = Router();

router.post("/", async (req, res) => {
  try {
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

    // Create calendar event
    await googleCalendarService.createEvent(patient.rows[0].nome, session.rows[0].date);
    
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

    res.json({ message: "Check-in successful" });
  } catch (error) {
    console.error("Error in check-in:", error);
    res.status(500).json({ error: "Failed to process check-in" });
  }
});

export default router;
