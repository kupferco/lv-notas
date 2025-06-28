// clinic-api/src/routes/payments.ts

import express, { Router, Request, Response, NextFunction } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import pool from "../config/database.js";

const router: Router = Router();

// Type-safe async handler
const asyncHandler = (
    handler: (req: Request, res: Response) => Promise<Response | void>
) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await handler(req, res);
        } catch (error) {
            console.error('Payment API Error:', error);
            next(error);
        }
    };
};

// GET /api/payments/summary - Payment analytics using payment_overview view
router.get("/summary", asyncHandler(async (req, res) => {
    const { therapistEmail, startDate, endDate } = req.query;

    if (!therapistEmail) {
        return res.status(400).json({ error: "therapistEmail is required" });
    }

    const result = await pool.query(`
    SELECT 
      COUNT(*) as total_sessions,
      COUNT(*) FILTER (WHERE payment_status = 'paid') as paid_sessions,
      COUNT(*) FILTER (WHERE payment_status != 'paid') as pending_sessions,
      COALESCE(SUM(session_price), 0) as total_revenue,
      COALESCE(SUM(session_price) FILTER (WHERE payment_status = 'paid'), 0) as paid_revenue,
      COALESCE(SUM(session_price) FILTER (WHERE payment_status != 'paid'), 0) as pending_revenue
    FROM payment_overview
    WHERE therapist_email = $1
      AND ($2::date IS NULL OR session_date::date >= $2::date)
      AND ($3::date IS NULL OR session_date::date <= $3::date)
  `, [therapistEmail, startDate || null, endDate || null]);

    const summary = result.rows[0];

    res.json({
        total_revenue: parseFloat(summary.total_revenue || 0),
        paid_revenue: parseFloat(summary.paid_revenue || 0),
        pending_revenue: parseFloat(summary.pending_revenue || 0),
        total_sessions: parseInt(summary.total_sessions || 0),
        paid_sessions: parseInt(summary.paid_sessions || 0),
        pending_sessions: parseInt(summary.pending_sessions || 0)
    });
}));

// GET /api/payments/patients - Patient payment summaries with payment dates
router.get("/patients", asyncHandler(async (req, res) => {
    const { therapistEmail, startDate, endDate, status } = req.query;

    if (!therapistEmail) {
        return res.status(400).json({ error: "therapistEmail is required" });
    }

    // Build status filter
    let statusFilter = "";
    if (status && status !== "todos") {
        statusFilter = `AND payment_state = '${status}'`;
    }

    const result = await pool.query(`
    SELECT 
      patient_id,
      patient_name,
      COUNT(*) as total_sessions,
      COALESCE(SUM(session_price), 0) as total_amount,
      COALESCE(SUM(session_price) FILTER (WHERE payment_status = 'paid'), 0) as paid_amount,
      COALESCE(SUM(session_price) FILTER (WHERE payment_status != 'paid'), 0) as pending_amount,
      'monthly' as billing_cycle,
      MAX(session_date) as last_session_date,
      BOOL_OR(payment_requested) as payment_requested,
      MAX(payment_request_date) as payment_request_date,
      -- Add payment transaction information
      MAX(payment_date) as last_payment_date,
      STRING_AGG(DISTINCT payment_method, ', ') as payment_methods,
      COUNT(DISTINCT payment_transaction_id) FILTER (WHERE payment_transaction_id IS NOT NULL) as payment_count
    FROM payment_overview
    WHERE therapist_email = $1
      AND ($2::date IS NULL OR session_date::date >= $2::date)
      AND ($3::date IS NULL OR session_date::date <= $3::date)
      ${statusFilter}
    GROUP BY patient_id, patient_name
    ORDER BY patient_name
  `, [therapistEmail, startDate || null, endDate || null]);

    const patients = result.rows.map(row => ({
        patient_id: row.patient_id,
        patient_name: row.patient_name,
        total_sessions: parseInt(row.total_sessions),
        total_amount: parseFloat(row.total_amount),
        paid_amount: parseFloat(row.paid_amount),
        pending_amount: parseFloat(row.pending_amount),
        billing_cycle: row.billing_cycle,
        last_session_date: row.last_session_date,
        payment_requested: row.payment_requested,
        payment_request_date: row.payment_request_date,
        // Add payment transaction data
        last_payment_date: row.last_payment_date,
        payment_methods: row.payment_methods,
        payment_count: parseInt(row.payment_count || 0)
    }));

    res.json(patients);
}));

// GET /api/payments/sessions - Session payment details using payment_overview
router.get("/sessions", asyncHandler(async (req, res) => {
    const { therapistEmail, startDate, endDate, status } = req.query;

    if (!therapistEmail) {
        return res.status(400).json({ error: "therapistEmail is required" });
    }

    // Build status filter for sessions
    let statusFilter = "";
    if (status && status !== "todos") {
        if (status === "paid") {
            statusFilter = "AND payment_status = 'paid'";
        } else if (status === "pending") {
            statusFilter = "AND payment_status = 'pending'";
        } else if (status === "overdue") {
            statusFilter = "AND payment_state = 'pendente'";
        }
    }

    const result = await pool.query(`
    SELECT 
      session_id,
      session_date,
      patient_name,
      patient_id,
      session_price,
      payment_status,
      days_since_session
    FROM payment_overview
    WHERE therapist_email = $1
      AND ($2::date IS NULL OR session_date::date >= $2::date)
      AND ($3::date IS NULL OR session_date::date <= $3::date)
      ${statusFilter}
    ORDER BY session_date DESC
  `, [therapistEmail, startDate || null, endDate || null]);

    const sessions = result.rows.map(row => ({
        session_id: row.session_id,
        session_date: row.session_date,
        patient_name: row.patient_name,
        patient_id: row.patient_id,
        session_price: parseFloat(row.session_price),
        payment_status: row.payment_status,
        days_since_session: row.days_since_session
    }));

    res.json(sessions);
}));

// POST /api/payments/request - Send payment request
router.post("/request", asyncHandler(async (req, res) => {
    const { patientId, sessionIds, amount } = req.body;

    if (!patientId) {
        return res.status(400).json({ error: "patientId is required" });
    }

    // Get patient and therapist info
    const patientResult = await pool.query(`
    SELECT p.*, t.id as therapist_id, t.email as therapist_email 
    FROM patients p 
    JOIN therapists t ON p.therapist_id = t.id 
    WHERE p.id = $1
  `, [patientId]);

    if (patientResult.rows.length === 0) {
        return res.status(404).json({ error: "Patient not found" });
    }

    const patient = patientResult.rows[0];

    // Get unpaid sessions for this patient
    const unpaidSessions = await pool.query(`
    SELECT id FROM sessions 
    WHERE patient_id = $1 
      AND status = 'compareceu' 
      AND payment_status = 'pending'
      AND payment_requested = false
  `, [patientId]);

    const sessionIdArray = unpaidSessions.rows.map(row => row.id);
    const totalAmount = unpaidSessions.rows.length * parseFloat(patient.session_price || patient.preco || 180);

    // Create payment request record
    await pool.query(`
    INSERT INTO payment_requests (
      patient_id, therapist_id, session_ids, total_amount, 
      request_type, whatsapp_sent, whatsapp_message
    ) VALUES ($1, $2, $3, $4, 'invoice', true, $5)
  `, [
        patientId,
        patient.therapist_id,
        sessionIdArray,
        totalAmount,
        `Olá ${patient.nome}! Sua cobrança de R$ ${totalAmount.toFixed(2).replace('.', ',')} está disponível para pagamento.`
    ]);

    // Update sessions to mark as payment requested
    await pool.query(`
    UPDATE sessions 
    SET payment_requested = true, payment_request_date = CURRENT_TIMESTAMP
    WHERE id = ANY($1)
  `, [sessionIdArray]);

    console.log(`Payment request: Patient ${patient.nome}, Sessions: ${sessionIdArray.length}, Amount: R$ ${totalAmount}`);

    res.json({
        success: true,
        message: 'Payment request sent successfully',
        patient_id: patientId,
        session_ids: sessionIdArray,
        total_amount: totalAmount,
        request_date: new Date().toISOString()
    });
}));

// PUT /api/payments/status - Update payment status
router.put("/status", asyncHandler(async (req, res) => {
    const { patientId, newStatus } = req.body;

    if (!patientId || !newStatus) {
        return res.status(400).json({ error: "patientId and newStatus are required" });
    }

    if (newStatus === 'pago') {
        // Mark all patient's sessions as paid
        await pool.query(`
      UPDATE sessions 
      SET payment_status = 'paid', paid_date = CURRENT_TIMESTAMP
      WHERE patient_id = $1 AND status = 'compareceu' AND payment_status != 'paid'
    `, [patientId]);

        // Create payment transaction record
        const sessionResult = await pool.query(`
      SELECT SUM(session_price) as total, therapist_id 
      FROM sessions 
      WHERE patient_id = $1 AND status = 'compareceu' AND paid_date IS NOT NULL
      GROUP BY therapist_id
    `, [patientId]);

        if (sessionResult.rows.length > 0) {
            await pool.query(`
        INSERT INTO payment_transactions (
          patient_id, therapist_id, amount, payment_method, 
          payment_date, created_by, notes
        ) VALUES ($1, $2, $3, 'manual', CURRENT_TIMESTAMP, 'system', 'Status updated to paid')
      `, [patientId, sessionResult.rows[0].therapist_id, sessionResult.rows[0].total]);
        }
    }

    console.log(`Status update: Patient ${patientId} to ${newStatus}`);

    res.json({
        success: true,
        message: 'Payment status updated successfully',
        patient_id: patientId,
        new_status: newStatus,
        updated_at: new Date().toISOString()
    });
}));

export default router;