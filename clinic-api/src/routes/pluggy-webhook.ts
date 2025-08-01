// src/routes/pluggy-webhook.ts
import express, { Router, Request, Response, NextFunction } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import pool from "../config/database.js";
import { pluggyService } from "../services/pluggy-service.js";

const router: Router = Router();

// Define webhook payload types
interface PluggyWebhookPayload {
  event: string;
  item_id: string;
  webhook_type: string;
  data?: {
    accounts?: Array<{
      id: string;
      type: string;
    }>;
    transactions?: Array<{
      id: string;
      account_id: string;
      amount: number;
      date: string;
    }>;
  };
}

// Type-safe async handler
const asyncHandler = (
  handler: (
    req: Request<ParamsDictionary, any, PluggyWebhookPayload>, 
    res: Response
  ) => Promise<Response | void>
) => {
  return async (
    req: Request<ParamsDictionary, any, PluggyWebhookPayload>, 
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
 * POST /api/pluggy-webhook
 * Handle webhooks from Pluggy for real-time transaction updates
 */
router.post("/", asyncHandler(async (req, res) => {
  console.log("===== PLUGGY WEBHOOK RECEIVED =====");
  console.log("Headers:", JSON.stringify(req.headers, null, 2));
  console.log("Body:", JSON.stringify(req.body, null, 2));

  const { event, item_id, webhook_type, data } = req.body;

  // Always respond quickly to acknowledge webhook receipt
  res.status(200).json({ status: "received" });

  try {
    // Find bank connections using this item_id
    const connections = await pool.query(
      'SELECT * FROM bank_connections WHERE pluggy_item_id = $1 AND status = $2',
      [item_id, 'active']
    );

    if (connections.rows.length === 0) {
      console.log(`No active connections found for item_id: ${item_id}`);
      return;
    }

    console.log(`Found ${connections.rows.length} connections for item_id: ${item_id}`);

    // Process different webhook events
    switch (event) {
      case 'item/created':
        console.log('Bank connection created successfully');
        break;

      case 'item/updated':
        console.log('Bank connection updated');
        // Sync transactions for all accounts in this item
        await syncConnectionTransactions(connections.rows);
        break;

      case 'item/error':
        console.log('Bank connection error occurred');
        await updateConnectionsStatus(item_id, 'error', 'Connection error from webhook');
        break;

      case 'transactions/updated':
        console.log('New transactions available');
        // This is the most important event - new transactions are available
        await syncConnectionTransactions(connections.rows);
        await processNewTransactions(connections.rows);
        break;

      case 'accounts/updated':
        console.log('Account information updated');
        break;

      default:
        console.log(`Unknown webhook event: ${event}`);
    }

  } catch (error) {
    console.error('Error processing Pluggy webhook:', error);
    // Don't throw error here as we already responded to webhook
  }
}));

/**
 * Sync transactions for affected bank connections
 */
async function syncConnectionTransactions(connections: any[]): Promise<void> {
  for (const connection of connections) {
    try {
      console.log(`Syncing transactions for connection ${connection.id}`);
      await pluggyService.syncTransactions(connection.id);
    } catch (error) {
      console.error(`Failed to sync connection ${connection.id}:`, error);
    }
  }
}

/**
 * Process newly received transactions for automatic matching
 */
async function processNewTransactions(connections: any[]): Promise<void> {
  for (const connection of connections) {
    try {
      // Get recent unmatched transactions for this connection
      const recentTransactions = await pool.query(`
        SELECT bt.*, bc.therapist_id
        FROM bank_transactions bt
        JOIN bank_connections bc ON bt.bank_connection_id = bc.id
        WHERE bc.id = $1 
          AND bt.match_status = 'unmatched'
          AND bt.created_at >= NOW() - INTERVAL '1 hour'
        ORDER BY bt.transaction_date DESC
      `, [connection.id]);

      console.log(`Found ${recentTransactions.rows.length} recent unmatched transactions for connection ${connection.id}`);

      // Process each transaction for automatic matching
      for (const transaction of recentTransactions.rows) {
        await attemptAutomaticMatching(transaction);
      }
    } catch (error) {
      console.error(`Error processing new transactions for connection ${connection.id}:`, error);
    }
  }
}

/**
 * Attempt automatic matching for a transaction
 */
async function attemptAutomaticMatching(transaction: any): Promise<void> {
  try {
    const { id: transactionId, therapist_id, pix_sender_cpf, pix_sender_name, amount, transaction_date } = transaction;

    // Strategy 1: Match by CPF (highest confidence)
    if (pix_sender_cpf) {
      const cpfMatch = await pool.query(`
        SELECT p.*, s.id as session_id, s.date as session_date
        FROM patients p
        LEFT JOIN sessions s ON p.id = s.patient_id
        WHERE p.therapist_id = $1 
          AND p.cpf = $2
          AND s.status = 'agendada'
          AND ABS(EXTRACT(EPOCH FROM (s.date - $3::timestamp)) / 3600) <= 168 -- Within 1 week
        ORDER BY ABS(EXTRACT(EPOCH FROM (s.date - $3::timestamp))) ASC
        LIMIT 1
      `, [therapist_id, pix_sender_cpf, transaction_date]);

      if (cpfMatch.rows.length > 0) {
        await createAutomaticMatch(transactionId, cpfMatch.rows[0], 'auto_cpf', 0.95, 'Matched by CPF');
        return;
      }
    }

    // Strategy 2: Match by name similarity (medium confidence)
    if (pix_sender_name) {
      const nameMatch = await pool.query(`
        SELECT p.*, s.id as session_id, s.date as session_date,
               SIMILARITY(p.nome, $2) as name_similarity
        FROM patients p
        LEFT JOIN sessions s ON p.id = s.patient_id
        WHERE p.therapist_id = $1 
          AND SIMILARITY(p.nome, $2) > 0.7
          AND s.status = 'agendada'
          AND ABS(EXTRACT(EPOCH FROM (s.date - $3::timestamp)) / 3600) <= 168 -- Within 1 week
        ORDER BY name_similarity DESC, ABS(EXTRACT(EPOCH FROM (s.date - $3::timestamp))) ASC
        LIMIT 1
      `, [therapist_id, pix_sender_name, transaction_date]);

      if (nameMatch.rows.length > 0) {
        const similarity = nameMatch.rows[0].name_similarity;
        await createAutomaticMatch(
          transactionId, 
          nameMatch.rows[0], 
          'auto_name', 
          similarity * 0.8, // Reduce confidence for name matches
          `Matched by name similarity (${Math.round(similarity * 100)}%)`
        );
        return;
      }
    }

    // Strategy 3: Match by exact amount and date proximity (lower confidence)
    const amountMatch = await pool.query(`
      SELECT p.*, s.id as session_id, s.date as session_date
      FROM patients p
      LEFT JOIN sessions s ON p.id = s.patient_id
      WHERE p.therapist_id = $1 
        AND p.preco = $2
        AND s.status = 'agendada'
        AND ABS(EXTRACT(EPOCH FROM (s.date - $3::timestamp)) / 3600) <= 48 -- Within 2 days
      ORDER BY ABS(EXTRACT(EPOCH FROM (s.date - $3::timestamp))) ASC
      LIMIT 1
    `, [therapist_id, amount, transaction_date]);

    if (amountMatch.rows.length > 0) {
      await createAutomaticMatch(
        transactionId, 
        amountMatch.rows[0], 
        'auto_amount_date', 
        0.6,
        'Matched by exact amount and date proximity'
      );
      return;
    }

    console.log(`No automatic match found for transaction ${transactionId}`);
  } catch (error) {
    console.error(`Error in automatic matching for transaction ${transaction.id}:`, error);
  }
}

/**
 * Create an automatic payment match
 */
async function createAutomaticMatch(
  transactionId: number, 
  patientSession: any, 
  matchType: string, 
  confidence: number,
  reason: string
): Promise<void> {
  try {
    const { id: patientId, preco: sessionPrice, session_id: sessionId } = patientSession;

    // Get transaction amount
    const transactionResult = await pool.query(
      'SELECT amount FROM bank_transactions WHERE id = $1',
      [transactionId]
    );
    
    if (transactionResult.rows.length === 0) return;
    
    const transactionAmount = transactionResult.rows[0].amount;
    const amountDifference = transactionAmount - (sessionPrice || 0);

    // Create the automatic match
    await pool.query(`
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
        confirmed_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      transactionId,
      sessionId,
      patientId,
      matchType,
      confidence,
      reason,
      transactionAmount,
      sessionPrice,
      amountDifference,
      confidence >= 0.9 ? 'confirmed' : 'pending', // Auto-confirm high confidence matches
      confidence >= 0.9 ? 'auto' : null
    ]);

    // Update transaction status
    await pool.query(
      'UPDATE bank_transactions SET match_status = $1, processed_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['auto_matched', transactionId]
    );

    // If high confidence match, also update session status
    if (confidence >= 0.9 && sessionId) {
      await pool.query(
        'UPDATE sessions SET status = $1 WHERE id = $2',
        ['compareceu', sessionId]
      );
    }

    console.log(`Created automatic match for transaction ${transactionId} with confidence ${confidence}`);
  } catch (error) {
    console.error(`Error creating automatic match for transaction ${transactionId}:`, error);
  }
}

/**
 * Update connection status for error handling
 */
async function updateConnectionsStatus(itemId: string, status: string, errorMessage: string): Promise<void> {
  try {
    await pool.query(`
      UPDATE bank_connections 
      SET status = $1, 
          last_error = $2, 
          error_count = error_count + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE pluggy_item_id = $3
    `, [status, errorMessage, itemId]);

    console.log(`Updated connections status to ${status} for item ${itemId}`);
  } catch (error) {
    console.error(`Error updating connection status for item ${itemId}:`, error);
  }
}

export default router;