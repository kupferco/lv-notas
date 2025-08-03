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
 * Handle webhooks from Pluggy for real-time transaction updates (Option B: Privacy-First)
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
        // Process transactions for all therapists using this item
        await processTransactionsForConnections(connections.rows);
        break;

      case 'item/error':
        console.log('Bank connection error occurred');
        await updateConnectionsStatus(item_id, 'error', 'Connection error from webhook');
        break;

      case 'transactions/updated':
        console.log('New transactions available - processing with Option B privacy-first approach');
        // This is the most important event - new transactions are available
        // Option B: Real-time processing with automatic matching
        await processTransactionsForConnections(connections.rows);
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
 * Process transactions for affected bank connections (Option B: Privacy-First)
 * This replaces the old approach of storing all transactions
 */
async function processTransactionsForConnections(connections: any[]): Promise<void> {
  for (const connection of connections) {
    try {
      console.log(`Processing transactions for connection ${connection.id} (therapist ${connection.therapist_id})`);
      
      // Use the new Option B service method that only stores matched transactions
      const result = await pluggyService.processTransactionsForTherapist(connection.therapist_id);
      
      console.log(`Processed ${result.processedTransactions} transactions, found ${result.newMatches} new matches for therapist ${connection.therapist_id}`);
      
      // Update connection sync time
      await pool.query(
        'UPDATE bank_connections SET last_sync_at = CURRENT_TIMESTAMP WHERE id = $1',
        [connection.id]
      );
      
    } catch (error) {
      console.error(`Failed to process transactions for connection ${connection.id}:`, error);
      
      // Update error tracking
      await pool.query(`
        UPDATE bank_connections 
        SET error_count = error_count + 1,
            last_error = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [
        error instanceof Error ? error.message : String(error), 
        connection.id
      ]);
    }
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

/**
 * GET /api/pluggy-webhook/test
 * Test endpoint to manually trigger transaction processing (for development)
 */
router.get("/test/:therapistId", asyncHandler(async (req, res) => {
  const { therapistId } = req.params;
  
  console.log(`🧪 Test: Manually triggering transaction processing for therapist ${therapistId}`);
  
  try {
    const result = await pluggyService.processTransactionsForTherapist(parseInt(therapistId));
    
    return res.json({
      message: "Test processing completed",
      processedTransactions: result.processedTransactions,
      newMatches: result.newMatches
    });
  } catch (error) {
    console.error('Error in test processing:', error);
    return res.status(500).json({
      error: "Test processing failed",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}));

/**
 * GET /api/pluggy-webhook/status
 * Get webhook processing status and statistics
 */
router.get("/status", asyncHandler(async (req, res) => {
  try {
    // Get summary of all bank connections
    const connections = await pool.query(`
      SELECT 
        therapist_id,
        COUNT(*) as connection_count,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_connections,
        COUNT(CASE WHEN status = 'error' THEN 1 END) as error_connections,
        MAX(last_sync_at) as last_sync,
        SUM(error_count) as total_errors
      FROM bank_connections
      GROUP BY therapist_id
      ORDER BY therapist_id
    `);

    // Get summary of matched transactions
    const matches = await pool.query(`
      SELECT 
        COUNT(*) as total_matches,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_matches,
        SUM(amount) as total_matched_amount,
        AVG(match_confidence) as avg_confidence,
        MAX(transaction_date) as last_match_date
      FROM matched_transactions
    `);

    // Get recent processing activity
    const recentActivity = await pool.query(`
      SELECT 
        COUNT(*) as recent_processed,
        COUNT(CASE WHEN match_found = true THEN 1 END) as recent_matches
      FROM processed_transactions 
      WHERE processed_at >= NOW() - INTERVAL '24 hours'
    `);

    return res.json({
      connectionsSummary: connections.rows,
      matchesSummary: matches.rows[0] || {
        total_matches: 0,
        confirmed_matches: 0,
        total_matched_amount: 0,
        avg_confidence: null,
        last_match_date: null
      },
      recentActivity: recentActivity.rows[0] || {
        recent_processed: 0,
        recent_matches: 0
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting webhook status:', error);
    return res.status(500).json({
      error: "Failed to get status",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}));

export default router;