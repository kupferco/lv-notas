// clinic-api/src/routes/payments.ts - Safe version that builds on your working code

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

// GET /api/payments/summary - Payment analytics with auto check-in support
router.get("/summary", asyncHandler(async (req, res) => {
  const { therapistEmail, startDate, endDate, autoCheckIn, status, patientFilter } = req.query;

  if (!therapistEmail) {
    return res.status(400).json({ error: "therapistEmail is required" });
  }

  const isAutoCheckIn = autoCheckIn === 'true';
  const statusFilter = status as string;
  const patientFilterStr = patientFilter as string;
  
  console.log(`💰 Payment Summary Request - Auto Check-in: ${isAutoCheckIn}, Status: ${statusFilter}, Patient: ${patientFilterStr}`);

  let result;

  if (isAutoCheckIn) {
    console.log('🔄 Using AUTO CHECK-IN mode for summary - including past scheduled sessions');
    
    // Build patient filter for auto check-in mode
    let patientFilterClause = "";
    if (patientFilterStr && patientFilterStr !== "todos") {
      patientFilterClause = `AND abs.patient_id = ${parseInt(patientFilterStr)}`;
    }

    // Auto check-in mode: Add past scheduled sessions to the existing payment_overview data
    result = await pool.query(`
      WITH all_billable_sessions AS (
        -- Get existing payment_overview sessions
        SELECT 
          session_price,
          payment_status,
          patient_id
        FROM payment_overview
        WHERE therapist_email = $1
          AND ($2::date IS NULL OR session_date::date >= $2::date)
          AND ($3::date IS NULL OR session_date::date <= $3::date)
        
        UNION ALL
        
        -- Get additional past scheduled sessions
        SELECT 
          COALESCE(s.session_price, 25000) as session_price,
          COALESCE(s.payment_status, 'pending') as payment_status,
          s.patient_id
        FROM sessions s
        JOIN therapists t ON s.therapist_id = t.id
        WHERE t.email = $1
          AND s.status = 'agendada'
          AND s.date < NOW()
          AND ($2::date IS NULL OR s.date::date >= $2::date)
          AND ($3::date IS NULL OR s.date::date <= $3::date)
          AND s.id NOT IN (
            SELECT session_id FROM payment_overview 
            WHERE therapist_email = $1
          )
      ),
      filtered_sessions AS (
        SELECT * FROM all_billable_sessions abs
        WHERE 1=1 ${patientFilterClause}
      )
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(*) FILTER (WHERE payment_status = 'paid') as paid_sessions,
        COUNT(*) FILTER (WHERE payment_status != 'paid') as pending_sessions,
        COALESCE(SUM(session_price), 0) / 100.0 as total_revenue,
        COALESCE(SUM(session_price) FILTER (WHERE payment_status = 'paid'), 0) / 100.0 as paid_revenue,
        COALESCE(SUM(session_price) FILTER (WHERE payment_status != 'paid'), 0) / 100.0 as pending_revenue,
        COALESCE(SUM(session_price) FILTER (WHERE payment_status = 'pending'), 0) / 100.0 as nao_cobrado_revenue,
        COALESCE(SUM(session_price) FILTER (WHERE payment_status = 'aguardando_pagamento'), 0) / 100.0 as aguardando_revenue,
        COALESCE(SUM(session_price) FILTER (WHERE payment_status = 'pendente'), 0) / 100.0 as pendente_revenue
      FROM filtered_sessions
    `, [therapistEmail, startDate || null, endDate || null]);
    
  } else {
    console.log('🔄 Using MANUAL mode for summary - only payment_overview sessions');
    
    // Build filters for manual mode
    let manualFilters = "";
    if (patientFilterStr && patientFilterStr !== "todos") {
      manualFilters += ` AND patient_id = ${parseInt(patientFilterStr)}`;
    }
    
    // Manual mode: Use your existing working query with filters
    result = await pool.query(`
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(*) FILTER (WHERE payment_status = 'paid') as paid_sessions,
        COUNT(*) FILTER (WHERE payment_status != 'paid') as pending_sessions,
        COALESCE(SUM(session_price), 0) / 100.0 as total_revenue,
        COALESCE(SUM(session_price) FILTER (WHERE payment_status = 'paid'), 0) / 100.0 as paid_revenue,
        COALESCE(SUM(session_price) FILTER (WHERE payment_status != 'paid'), 0) / 100.0 as pending_revenue,
        COALESCE(SUM(session_price) FILTER (WHERE payment_status = 'pending'), 0) / 100.0 as nao_cobrado_revenue,
        COALESCE(SUM(session_price) FILTER (WHERE payment_status = 'aguardando_pagamento'), 0) / 100.0 as aguardando_revenue,
        COALESCE(SUM(session_price) FILTER (WHERE payment_status = 'pendente'), 0) / 100.0 as pendente_revenue
      FROM payment_overview
      WHERE therapist_email = $1
        AND ($2::date IS NULL OR session_date::date >= $2::date)
        AND ($3::date IS NULL OR session_date::date <= $3::date)
        ${manualFilters}
    `, [therapistEmail, startDate || null, endDate || null]);
  }

  const summary = result.rows[0];
  console.log(`📊 Summary: ${summary.total_sessions} sessions, R$ ${summary.total_revenue} total - Mode: ${isAutoCheckIn ? 'AUTO' : 'MANUAL'}, Patient: ${patientFilterStr || 'all'}`);

  res.json({
    total_revenue: parseFloat(summary.total_revenue || 0),
    paid_revenue: parseFloat(summary.paid_revenue || 0),
    pending_revenue: parseFloat(summary.pending_revenue || 0),
    nao_cobrado_revenue: parseFloat(summary.nao_cobrado_revenue || 0),
    aguardando_revenue: parseFloat(summary.aguardando_revenue || 0),
    pendente_revenue: parseFloat(summary.pendente_revenue || 0),
    total_sessions: parseInt(summary.total_sessions || 0),
    paid_sessions: parseInt(summary.paid_sessions || 0),
    pending_sessions: parseInt(summary.pending_sessions || 0)
  });
}));

// GET /api/payments/patients - Patient payment summaries with auto check-in support
router.get("/patients", asyncHandler(async (req, res) => {
  const { therapistEmail, startDate, endDate, status, autoCheckIn } = req.query;

  if (!therapistEmail) {
    return res.status(400).json({ error: "therapistEmail is required" });
  }

  const isAutoCheckIn = autoCheckIn === 'true';
  console.log(`👥 Patient Payments Request - Auto Check-in: ${isAutoCheckIn}`);

  // Build status filter
  let statusFilter = "";
  if (status && status !== "todos") {
    // For auto check-in mode, we need to filter on the calculated payment status
    if (status === "paid") {
      statusFilter = `HAVING COALESCE(SUM(abs.session_price) FILTER (WHERE abs.payment_status != 'paid'), 0) = 0 AND COALESCE(SUM(abs.session_price) FILTER (WHERE abs.payment_status = 'paid'), 0) > 0`;
    } else if (status === "pending" || status === "pendente") {
      statusFilter = `HAVING COALESCE(SUM(abs.session_price) FILTER (WHERE abs.payment_status != 'paid'), 0) > 0`;
    } else if (status === "nao_cobrado") {
      statusFilter = `HAVING COUNT(*) FILTER (WHERE abs.payment_status = 'pending') > 0`;
    } else if (status === "aguardando_pagamento") {
      statusFilter = `HAVING COUNT(*) FILTER (WHERE abs.payment_status = 'aguardando_pagamento') > 0`;
    }
  }

  let result;

  if (isAutoCheckIn) {
    console.log('🔄 Using AUTO CHECK-IN mode for patients - including past scheduled sessions');
    
    // Auto check-in mode: Include additional past scheduled sessions in patient calculations
    result = await pool.query(`
      WITH all_billable_sessions AS (
        -- Get existing payment_overview sessions
        SELECT 
          po.patient_id,
          po.patient_name,
          po.session_price,
          po.payment_status,
          po.session_date,
          po.payment_requested,
          po.payment_request_date,
          po.payment_date,
          po.payment_method,
          po.payment_transaction_id
        FROM payment_overview po
        WHERE po.therapist_email = $1
          AND ($2::date IS NULL OR po.session_date::date >= $2::date)
          AND ($3::date IS NULL OR po.session_date::date <= $3::date)
        
        UNION ALL
        
        -- Get additional past scheduled sessions
        SELECT 
          s.patient_id,
          p.nome as patient_name,
          COALESCE(s.session_price, 25000) as session_price,
          COALESCE(s.payment_status, 'pending') as payment_status,
          s.date as session_date,
          COALESCE(s.payment_requested, false) as payment_requested,
          s.payment_request_date,
          NULL as payment_date,
          NULL as payment_method,
          NULL as payment_transaction_id
        FROM sessions s
        JOIN patients p ON s.patient_id = p.id
        JOIN therapists t ON s.therapist_id = t.id
        WHERE t.email = $1
          AND s.status = 'agendada'
          AND s.date < NOW()
          AND ($2::date IS NULL OR s.date::date >= $2::date)
          AND ($3::date IS NULL OR s.date::date <= $3::date)
          AND s.id NOT IN (
            SELECT session_id FROM payment_overview 
            WHERE therapist_email = $1
          )
      )
      SELECT 
        abs.patient_id,
        abs.patient_name,
        p.telefone,
        COUNT(*) as total_sessions,
        COALESCE(SUM(abs.session_price), 0) / 100.0 as total_amount,
        COALESCE(SUM(abs.session_price) FILTER (WHERE abs.payment_status = 'paid'), 0) / 100.0 as paid_amount,
        COALESCE(SUM(abs.session_price) FILTER (WHERE abs.payment_status != 'paid'), 0) / 100.0 as pending_amount,
        'monthly' as billing_cycle,
        MAX(abs.session_date) as last_session_date,
        BOOL_OR(abs.payment_requested) as payment_requested,
        MAX(abs.payment_request_date) as payment_request_date,
        COUNT(*) FILTER (WHERE abs.payment_status = 'pendente') as pendente_sessions,
        COUNT(*) FILTER (WHERE abs.payment_status = 'aguardando_pagamento') as aguardando_sessions,
        COUNT(*) FILTER (WHERE abs.payment_status = 'pending') as nao_cobrado_sessions,
        COUNT(*) FILTER (WHERE abs.payment_status = 'paid') as paid_sessions,
        MAX(abs.payment_date) as last_payment_date,
        STRING_AGG(DISTINCT abs.payment_method, ', ') as payment_methods,
        COUNT(DISTINCT abs.payment_transaction_id) FILTER (WHERE abs.payment_transaction_id IS NOT NULL) as payment_count
      FROM all_billable_sessions abs
      JOIN patients p ON abs.patient_id = p.id
      GROUP BY abs.patient_id, abs.patient_name, p.telefone
      ${statusFilter}
      ORDER BY abs.patient_name
    `, [therapistEmail, startDate || null, endDate || null]);
    
      } else {
    console.log('🔄 Using MANUAL mode for patients - only payment_overview sessions');
    
    // Manual mode: Use your existing working query with proper status filter
    let manualStatusFilter = "";
    if (status && status !== "todos") {
      manualStatusFilter = `AND payment_state = '${status}'`;
    }
    
    result = await pool.query(`
      SELECT 
        po.patient_id,
        po.patient_name,
        p.telefone,
        COUNT(*) as total_sessions,
        COALESCE(SUM(po.session_price), 0) / 100.0 as total_amount,
        COALESCE(SUM(po.session_price) FILTER (WHERE po.payment_status = 'paid'), 0) / 100.0 as paid_amount,
        COALESCE(SUM(po.session_price) FILTER (WHERE po.payment_status != 'paid'), 0) / 100.0 as pending_amount,
        'monthly' as billing_cycle,
        MAX(po.session_date) as last_session_date,
        BOOL_OR(po.payment_requested) as payment_requested,
        MAX(po.payment_request_date) as payment_request_date,
        COUNT(*) FILTER (WHERE po.payment_status = 'pendente') as pendente_sessions,
        COUNT(*) FILTER (WHERE po.payment_status = 'aguardando_pagamento') as aguardando_sessions,
        COUNT(*) FILTER (WHERE po.payment_status = 'pending') as nao_cobrado_sessions,
        COUNT(*) FILTER (WHERE po.payment_status = 'paid') as paid_sessions,
        MAX(po.payment_date) as last_payment_date,
        STRING_AGG(DISTINCT po.payment_method, ', ') as payment_methods,
        COUNT(DISTINCT po.payment_transaction_id) FILTER (WHERE po.payment_transaction_id IS NOT NULL) as payment_count
      FROM payment_overview po
      JOIN patients p ON po.patient_id = p.id
      WHERE po.therapist_email = $1
        AND ($2::date IS NULL OR po.session_date::date >= $2::date)
        AND ($3::date IS NULL OR po.session_date::date <= $3::date)
        ${manualStatusFilter}
      GROUP BY po.patient_id, po.patient_name, p.telefone
      ORDER BY po.patient_name
    `, [therapistEmail, startDate || null, endDate || null]);
  }

  const patients = result.rows.map(row => ({
    patient_id: row.patient_id,
    patient_name: row.patient_name,
    telefone: row.telefone,
    total_sessions: parseInt(row.total_sessions),
    total_amount: parseFloat(row.total_amount),
    paid_amount: parseFloat(row.paid_amount),
    pending_amount: parseFloat(row.pending_amount),
    billing_cycle: row.billing_cycle,
    last_session_date: row.last_session_date,
    payment_requested: row.payment_requested,
    payment_request_date: row.payment_request_date,
    pendente_sessions: parseInt(row.pendente_sessions || 0),
    aguardando_sessions: parseInt(row.aguardando_sessions || 0),
    nao_cobrado_sessions: parseInt(row.nao_cobrado_sessions || 0),
    paid_sessions: parseInt(row.paid_sessions || 0),
    last_payment_date: row.last_payment_date,
    payment_methods: row.payment_methods,
    payment_count: parseInt(row.payment_count || 0)
  }));

  console.log(`👥 Patients: ${patients.length} patients with sessions - Mode: ${isAutoCheckIn ? 'AUTO' : 'MANUAL'}`);
  res.json(patients);
}));

// GET /api/payments/sessions - Session payment details with auto check-in support
router.get("/sessions", asyncHandler(async (req, res) => {
  const { therapistEmail, startDate, endDate, status, autoCheckIn } = req.query;

  if (!therapistEmail) {
    return res.status(400).json({ error: "therapistEmail is required" });
  }

  const isAutoCheckIn = autoCheckIn === 'true';
  console.log(`📅 Session Payments Request - Auto Check-in: ${isAutoCheckIn}`);

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

  let result;

  if (isAutoCheckIn) {
    console.log('🔄 Using AUTO CHECK-IN mode - including past scheduled sessions');
    
    // Auto check-in mode: Add past scheduled sessions to the existing payment_overview data
    result = await pool.query(`
      SELECT 
        session_id,
        session_date,
        patient_name,
        patient_id,
        session_price / 100.0 as session_price,
        payment_status,
        days_since_session,
        'payment_overview' as source_type
      FROM payment_overview
      WHERE therapist_email = $1
        AND ($2::date IS NULL OR session_date::date >= $2::date)
        AND ($3::date IS NULL OR session_date::date <= $3::date)
        ${statusFilter}
      
      UNION ALL
      
      SELECT 
        s.id as session_id,
        s.date as session_date,
        p.nome as patient_name,
        s.patient_id,
        COALESCE(s.session_price / 100.0, 250.0) as session_price,
        COALESCE(s.payment_status, 'pending') as payment_status,
        EXTRACT(DAY FROM (NOW() - s.date))::integer as days_since_session,
        'auto_checkin' as source_type
      FROM sessions s
      JOIN patients p ON s.patient_id = p.id
      JOIN therapists t ON s.therapist_id = t.id
      WHERE t.email = $1
        AND s.status = 'agendada'
        AND s.date < NOW()
        AND ($2::date IS NULL OR s.date::date >= $2::date)
        AND ($3::date IS NULL OR s.date::date <= $3::date)
        AND s.id NOT IN (
          SELECT session_id FROM payment_overview 
          WHERE therapist_email = $1
        )
      
      ORDER BY session_date DESC
    `, [therapistEmail, startDate || null, endDate || null]);
    
  } else {
    console.log('🔄 Using MANUAL mode - only payment_overview sessions');
    
    // Manual mode: Use your existing working query
    result = await pool.query(`
      SELECT 
        session_id,
        session_date,
        patient_name,
        patient_id,
        session_price / 100.0 as session_price,
        payment_status,
        days_since_session,
        'payment_overview' as source_type
      FROM payment_overview
      WHERE therapist_email = $1
        AND ($2::date IS NULL OR session_date::date >= $2::date)
        AND ($3::date IS NULL OR session_date::date <= $3::date)
        ${statusFilter}
      ORDER BY session_date DESC
    `, [therapistEmail, startDate || null, endDate || null]);
  }

  const sessions = result.rows.map(row => ({
    session_id: row.session_id,
    session_date: row.session_date,
    patient_name: row.patient_name,
    patient_id: row.patient_id,
    session_price: parseFloat(row.session_price),
    payment_status: row.payment_status,
    days_since_session: parseInt(row.days_since_session || 0),
    auto_checkin: row.source_type === 'auto_checkin' // Flag to identify auto-included sessions
  }));

  // Log the results
  const autoSessions = sessions.filter(s => s.auto_checkin);
  console.log(`📅 Sessions: ${sessions.length} total sessions (${autoSessions.length} auto check-in) - Mode: ${isAutoCheckIn ? 'AUTO' : 'MANUAL'}`);

  res.json(sessions);
}));

// POST /api/payments/request - Send payment request
router.post("/request", asyncHandler(async (req, res) => {
  const { patientId, sessionIds, amount, autoCheckIn } = req.body;

  if (!patientId) {
    return res.status(400).json({ error: "patientId is required" });
  }

  const isAutoCheckIn = autoCheckIn === true;
  console.log(`📞 sendPaymentRequest - Auto Check-in: ${isAutoCheckIn}`);

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

// PUT /api/payments/status - Update payment status for individual session
router.put("/status", asyncHandler(async (req, res) => {
  const { sessionId, newStatus, therapistEmail, updatedBy, reason } = req.body;

  console.log('💰 Session payment status update request:', { sessionId, newStatus, therapistEmail, updatedBy });

  if (!sessionId || !newStatus) {
    return res.status(400).json({ error: "sessionId and newStatus are required" });
  }

  // DEBUG: Let's see what session we're updating
  const debugSession = await pool.query(`
        SELECT s.id, s.date, s.status, s.payment_status, s.payment_requested, s.session_price, s.patient_id,
               p.nome as patient_name
        FROM sessions s
        JOIN patients p ON s.patient_id = p.id
        WHERE s.id = $1
    `, [sessionId]);

  if (debugSession.rows.length === 0) {
    return res.status(404).json({ error: "Session not found" });
  }

  const session = debugSession.rows[0];
  console.log(`🔍 DEBUG: Updating session ${session.id} for ${session.patient_name}: ${session.date} - current payment: ${session.payment_status}`);

  let updateResult;

  if (newStatus === 'paid') {
    updateResult = await pool.query(`
            UPDATE sessions 
            SET payment_status = 'paid'
            WHERE id = $1
        `, [sessionId]);
    console.log(`✅ Successfully marked session ${sessionId} as paid (manual reconciliation)`);

  } else if (newStatus === 'aguardando_pagamento') {
    updateResult = await pool.query(`
            UPDATE sessions 
            SET payment_requested = true, 
                payment_request_date = CURRENT_TIMESTAMP,
                payment_status = 'aguardando_pagamento'
            WHERE id = $1
        `, [sessionId]);
    console.log(`✅ Successfully marked session ${sessionId} as awaiting payment (invoice sent)`);

  } else if (newStatus === 'pending') {
    updateResult = await pool.query(`
            UPDATE sessions 
            SET payment_requested = false, 
                payment_request_date = NULL,
                payment_status = 'pending'
            WHERE id = $1
        `, [sessionId]);
    console.log(`✅ Successfully reset session ${sessionId} to not invoiced`);

  } else if (newStatus === 'pendente') {
    updateResult = await pool.query(`
            UPDATE sessions 
            SET payment_status = 'pendente'
            WHERE id = $1
        `, [sessionId]);
    console.log(`✅ Successfully marked session ${sessionId} as overdue`);

  } else {
    updateResult = await pool.query(`
            UPDATE sessions 
            SET payment_status = $2
            WHERE id = $1
        `, [sessionId, newStatus]);
    console.log(`✅ Successfully updated session ${sessionId} to status ${newStatus}`);
  }

  res.json({
    success: true,
    message: 'Session payment status updated successfully',
    session_id: sessionId,
    patient_name: session.patient_name,
    new_status: newStatus,
    updated_at: new Date().toISOString()
  });
}));

export default router;