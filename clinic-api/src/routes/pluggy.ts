// src/routes/pluggy.ts
import express, { Router, Request, Response, NextFunction } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import pool from "../config/database.js";
import { pluggyService } from "../services/pluggy-service.js";

const router: Router = Router();

// Define types for request bodies
interface ConnectTokenBody {
  therapistId: string;
}

interface StoreConnectionBody {
  therapistId: string;
  itemId: string;
  accountId: string;
}

interface SyncTransactionsBody {
  therapistId: string;
}

interface CreateMatchBody {
  transactionId: string;
  sessionId: string;
  patientId: string;
  matchType: string;
  notes?: string;
}

// Type-safe async handler
const asyncHandler = (
  handler: (
    req: Request<ParamsDictionary, any, any>, 
    res: Response
  ) => Promise<Response | void>
) => {
  return async (
    req: Request<ParamsDictionary, any, any>, 
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

/**
 * POST /api/pluggy/connect-token
 * Create a connect token for bank connection flow
 */
router.post("/connect-token", asyncHandler(async (req: Request<ParamsDictionary, any, ConnectTokenBody>, res) => {
  const { therapistId } = req.body;

  if (!therapistId) {
    return res.status(400).json({ error: "therapistId is required" });
  }

  // Verify therapist exists
  const therapist = await pool.query(
    "SELECT id FROM therapists WHERE id = $1",
    [parseInt(therapistId)]
  );

  if (therapist.rows.length === 0) {
    return res.status(404).json({ error: "Therapist not found" });
  }

  const connectToken = await pluggyService.createConnectToken(parseInt(therapistId));
  
  return res.json({ 
    connect_token: connectToken,
    environment: process.env.PLUGGY_ENVIRONMENT || 'sandbox'
  });
}));

/**
 * POST /api/pluggy/store-connection
 * Store bank connection after successful Pluggy connection
 */
router.post("/store-connection", asyncHandler(async (req: Request<ParamsDictionary, any, StoreConnectionBody>, res) => {
  const { therapistId, itemId, accountId } = req.body;

  if (!therapistId || !itemId || !accountId) {
    return res.status(400).json({ 
      error: "therapistId, itemId, and accountId are required" 
    });
  }

  await pluggyService.storeBankConnection(parseInt(therapistId), itemId, accountId);
  
  return res.json({ message: "Bank connection stored successfully" });
}));

/**
 * GET /api/pluggy/connections/:therapistId
 * Get all bank connections for a therapist
 */
router.get("/connections/:therapistId", asyncHandler(async (req, res) => {
  const { therapistId } = req.params;

  const connections = await pool.query(`
    SELECT 
      id,
      bank_name,
      account_type,
      account_holder_name,
      status,
      last_sync_at,
      created_at,
      error_count,
      last_error
    FROM bank_connections 
    WHERE therapist_id = $1 
    ORDER BY created_at DESC
  `, [parseInt(therapistId)]);

  return res.json(connections.rows);
}));

/**
 * POST /api/pluggy/sync-transactions
 * Manually trigger transaction sync for a therapist
 */
router.post("/sync-transactions", asyncHandler(async (req: Request<ParamsDictionary, any, SyncTransactionsBody>, res) => {
  const { therapistId } = req.body;

  if (!therapistId) {
    return res.status(400).json({ error: "therapistId is required" });
  }

  await pluggyService.syncAllConnectionsForTherapist(parseInt(therapistId));
  
  return res.json({ message: "Transaction sync completed successfully" });
}));

/**
 * GET /api/pluggy/unmatched-transactions/:therapistId
 * Get unmatched transactions with patient suggestions
 */
router.get("/unmatched-transactions/:therapistId", asyncHandler(async (req, res) => {
  const { therapistId } = req.params;

  const transactions = await pluggyService.getUnmatchedTransactionsWithSuggestions(parseInt(therapistId));
  
  return res.json(transactions);
}));

/**
 * GET /api/pluggy/transactions/:therapistId
 * Get all transactions for a therapist with optional filters
 */
router.get("/transactions/:therapistId", asyncHandler(async (req, res) => {
  const { therapistId } = req.params;
  const { status, startDate, endDate, limit = 50 } = req.query;

  let query = `
    SELECT 
      bt.*,
      bc.bank_name,
      pm.id as match_id,
      pm.status as match_status,
      pm.session_id,
      pm.patient_id,
      p.nome as patient_name,
      s.date as session_date
    FROM bank_transactions bt
    JOIN bank_connections bc ON bt.bank_connection_id = bc.id
    LEFT JOIN payment_matches pm ON bt.id = pm.bank_transaction_id
    LEFT JOIN patients p ON pm.patient_id = p.id
    LEFT JOIN sessions s ON pm.session_id = s.id
    WHERE bc.therapist_id = $1
  `;

  const queryParams: any[] = [parseInt(therapistId)];
  let paramCount = 1;

  if (status) {
    paramCount++;
    query += ` AND bt.match_status = $${paramCount}`;
    queryParams.push(status);
  }

  if (startDate) {
    paramCount++;
    query += ` AND bt.transaction_date >= $${paramCount}`;
    queryParams.push(startDate);
  }

  if (endDate) {
    paramCount++;
    query += ` AND bt.transaction_date <= $${paramCount}`;
    queryParams.push(endDate);
  }

  query += ` ORDER BY bt.transaction_date DESC LIMIT $${paramCount + 1}`;
  queryParams.push(parseInt(limit as string));

  const transactions = await pool.query(query, queryParams);
  
  return res.json(transactions.rows);
}));

/**
 * POST /api/pluggy/create-match
 * Manually create a payment match between transaction and session
 */
router.post("/create-match", asyncHandler(async (req: Request<ParamsDictionary, any, CreateMatchBody>, res) => {
  const { transactionId, sessionId, patientId, matchType, notes } = req.body;

  if (!transactionId || !sessionId || !patientId || !matchType) {
    return res.status(400).json({ 
      error: "transactionId, sessionId, patientId, and matchType are required" 
    });
  }

  // Get transaction and session details
  const transaction = await pool.query(
    "SELECT * FROM bank_transactions WHERE id = $1",
    [parseInt(transactionId)]
  );

  const session = await pool.query(
    "SELECT * FROM sessions WHERE id = $1",
    [parseInt(sessionId)]
  );

  const patient = await pool.query(
    "SELECT preco FROM patients WHERE id = $1",
    [parseInt(patientId)]
  );

  if (transaction.rows.length === 0 || session.rows.length === 0 || patient.rows.length === 0) {
    return res.status(404).json({ error: "Transaction, session, or patient not found" });
  }

  const transactionData = transaction.rows[0];
  const sessionPrice = patient.rows[0].preco;
  const amountDifference = transactionData.amount - (sessionPrice || 0);

  // Create the payment match
  const matchResult = await pool.query(`
    INSERT INTO payment_matches (
      bank_transaction_id,
      session_id,
      patient_id,
      match_type,
      match_confidence,
      match_reason,
      matched_amount,
      session_price,
      amount_difference,
      status,
      confirmed_by,
      confirmed_at,
      notes,
      manual_adjustment
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *
  `, [
    parseInt(transactionId),
    parseInt(sessionId),
    parseInt(patientId),
    matchType,
    matchType === 'manual' ? 1.0 : 0.8, // High confidence for manual matches
    `Manual match created by user`,
    transactionData.amount,
    sessionPrice,
    amountDifference,
    'confirmed',
    'therapist',
    new Date(),
    notes || null,
    true
  ]);

  // Update transaction match status
  await pool.query(
    "UPDATE bank_transactions SET match_status = $1, processed_at = $2 WHERE id = $3",
    ['manual_matched', new Date(), parseInt(transactionId)]
  );

  // Update session status to indicate payment received
  await pool.query(
    "UPDATE sessions SET status = $1 WHERE id = $2",
    ['compareceu', parseInt(sessionId)]
  );

  return res.json({ 
    message: "Payment match created successfully",
    match: matchResult.rows[0]
  });
}));

/**
 * DELETE /api/pluggy/connections/:connectionId
 * Remove a bank connection
 */
router.delete("/connections/:connectionId", asyncHandler(async (req, res) => {
  const { connectionId } = req.params;

  // Update status to disconnected instead of deleting (for audit trail)
  await pool.query(
    "UPDATE bank_connections SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
    ['disconnected', parseInt(connectionId)]
  );

  return res.json({ message: "Bank connection disconnected successfully" });
}));

/**
 * GET /api/pluggy/summary/:therapistId
 * Get payment summary for a therapist
 */
router.get("/summary/:therapistId", asyncHandler(async (req, res) => {
  const { therapistId } = req.params;

  const summary = await pool.query(`
    SELECT * FROM therapist_payment_summary 
    WHERE therapist_id = $1
  `, [parseInt(therapistId)]);

  if (summary.rows.length === 0) {
    return res.json({
      therapist_id: parseInt(therapistId),
      connected_accounts: 0,
      total_transactions: 0,
      unmatched_transactions: 0,
      total_matches: 0,
      confirmed_matches: 0,
      confirmed_revenue: 0,
      unmatched_revenue: 0,
      last_transaction_date: null
    });
  }

  return res.json(summary.rows[0]);
}));

export default router;