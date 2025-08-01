// src/routes/pluggy.ts
import express, { Router, Request, Response, NextFunction } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import pool from "../config/database.js";
import { pluggyService, createPluggyService } from "../services/pluggy-service.js";

const router: Router = Router();

// Helper function to get service instance based on mode header
const getPluggyService = (req: Request) => {
    const testMode = req.headers['x-test-mode'] as string;
    const mockMode = testMode === 'mock';
    return mockMode ? createPluggyService(true) : pluggyService;
};

// Define types for request bodies
interface ConnectTokenBody {
    therapistId: string;
}

interface StoreConnectionBody {
    therapistId: string;
    itemId: string;
    accountId: string;
}

interface ProcessTransactionsBody {
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

    const service = getPluggyService(req);
    const connectToken = await service.createConnectToken(parseInt(therapistId));

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

    const service = getPluggyService(req);
    await service.storeBankConnection(parseInt(therapistId), itemId, accountId);

    return res.json({ message: "Bank connection stored successfully" });
}));

/**
 * GET /api/pluggy/connections/:therapistId
 * Get all bank connections for a therapist
 * In mock mode: returns mock data from Pluggy service
 * In real mode: returns stored connections from database
 */
router.get("/connections/:therapistId", asyncHandler(async (req, res) => {
    const { therapistId } = req.params;

    // Check if we're in mock mode
    const testMode = req.headers['x-test-mode'] as string;
    const isMockMode = testMode === 'mock';

    if (isMockMode) {
        console.log(`🎭 Mock Mode: Fetching mock bank connections for therapist ${therapistId}`);

        try {
            const service = getPluggyService(req);
            // Get mock items from Pluggy service
            const items = await service.getItems();

            // Transform Pluggy items to match your expected connection format
            const mockConnections = await Promise.all(
                items.map(async (item) => {
                    // Get accounts for this item
                    const accounts = await service.getAccounts(item.id);

                    // Return one connection per account
                    return accounts.map(account => ({
                        id: `mock_connection_${account.id}`,
                        bank_name: account.bankData?.transferNumber || item.connector.name,
                        account_type: account.subtype,
                        account_holder_name: account.owner || account.name,
                        status: 'active',
                        last_sync_at: new Date().toISOString(),
                        created_at: account.createdAt,
                        error_count: 0,
                        last_error: null,
                        // Additional mock fields
                        pluggy_item_id: item.id,
                        pluggy_account_id: account.id,
                        balance: account.balance,
                        currency_code: account.currencyCode
                    }));
                })
            );

            // Flatten the array of arrays
            const flatConnections = mockConnections.flat();

            console.log(`🎭 Mock Mode: Returning ${flatConnections.length} mock connections`);
            return res.json(flatConnections);

        } catch (error) {
            console.error('Error fetching mock connections:', error);
            return res.status(500).json({
                error: 'Failed to fetch mock connections',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }

    // Real mode: fetch from database (Option B: only connection metadata)
    console.log(`📊 Real Mode: Fetching stored connections for therapist ${therapistId}`);

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
            last_error,
            pluggy_item_id,
            pluggy_account_id
        FROM bank_connections 
        WHERE therapist_id = $1 
        ORDER BY created_at DESC
    `, [parseInt(therapistId)]);

    return res.json(connections.rows);
}));

/**
 * POST /api/pluggy/process-transactions
 * Manually trigger transaction processing for a therapist (Option B: real-time processing)
 */
router.post("/process-transactions", asyncHandler(async (req: Request<ParamsDictionary, any, ProcessTransactionsBody>, res) => {
    const { therapistId } = req.body;

    if (!therapistId) {
        return res.status(400).json({ error: "therapistId is required" });
    }

    const result = await pluggyService.processTransactionsForTherapist(parseInt(therapistId));

    return res.json({ 
        message: "Transaction processing completed successfully",
        newMatches: result.newMatches,
        processedTransactions: result.processedTransactions
    });
}));

/**
 * GET /api/pluggy/unmatched-transactions/:therapistId
 * Get unmatched transactions with patient suggestions (Option B: real-time from Pluggy)
 */
router.get("/unmatched-transactions/:therapistId", asyncHandler(async (req, res) => {
    const { therapistId } = req.params;

    const transactions = await pluggyService.getUnmatchedTransactionsWithSuggestions(parseInt(therapistId));

    return res.json(transactions);
}));

/**
 * GET /api/pluggy/transactions/:therapistId
 * Get matched transactions for a therapist (Option B: only shows stored matches)
 */
router.get("/transactions/:therapistId", asyncHandler(async (req, res) => {
    const { therapistId } = req.params;
    const { status, startDate, endDate, limit = 50 } = req.query;

    // Check if we're in mock mode
    const isMockMode = process.env.PLUGGY_MOCK_MODE === 'true';

    if (isMockMode) {
        console.log(`🎭 Mock Mode: Returning mock matched transactions for therapist ${therapistId}`);
        
        // Return mock matched transactions
        const mockTransactions = [
            {
                id: 'mock_matched_1',
                amount: 150.00,
                transaction_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                transaction_type: 'pix',
                sender_first_name: 'Maria',
                sender_initials: 'M.S.',
                pix_end_to_end_id: 'E12345678202408011234567890123456',
                session_id: 1,
                patient_id: 1,
                match_type: 'automatic_cpf',
                match_confidence: 0.95,
                match_reason: 'CPF match',
                session_price: 150.00,
                amount_difference: 0.00,
                status: 'confirmed',
                confirmed_by: 'system',
                bank_name: 'Banco do Brasil',
                patient_name: 'Mock Patient 1',
                session_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 'mock_matched_2',
                amount: 200.00,
                transaction_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                transaction_type: 'pix',
                sender_first_name: 'João',
                sender_initials: 'J.C.',
                pix_end_to_end_id: 'E98765432202407291234567890987654',
                session_id: 2,
                patient_id: 2,
                match_type: 'automatic_amount_date',
                match_confidence: 0.80,
                match_reason: 'Amount and date match',
                session_price: 200.00,
                amount_difference: 0.00,
                status: 'confirmed',
                confirmed_by: 'system',
                bank_name: 'Banco do Brasil',
                patient_name: 'Mock Patient 2',
                session_date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
            }
        ];

        // Apply filters
        let filteredTransactions = mockTransactions;

        if (status) {
            filteredTransactions = filteredTransactions.filter(t => t.status === status);
        }

        if (startDate) {
            const start = new Date(startDate as string);
            filteredTransactions = filteredTransactions.filter(t => new Date(t.transaction_date) >= start);
        }

        if (endDate) {
            const end = new Date(endDate as string);
            filteredTransactions = filteredTransactions.filter(t => new Date(t.transaction_date) <= end);
        }

        // Sort and limit
        filteredTransactions.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
        filteredTransactions = filteredTransactions.slice(0, parseInt(limit as string));

        return res.json(filteredTransactions);
    }

    // Real mode: fetch matched transactions from database (Option B: new table structure)
    console.log(`📊 Real Mode: Fetching matched transactions for therapist ${therapistId}`);

    let query = `
        SELECT 
            mt.*,
            bc.bank_name,
            p.nome as patient_name,
            s.date as session_date
        FROM matched_transactions mt
        JOIN bank_connections bc ON mt.bank_connection_id = bc.id
        JOIN patients p ON mt.patient_id = p.id
        JOIN sessions s ON mt.session_id = s.id
        WHERE bc.therapist_id = $1
    `;

    const queryParams: any[] = [parseInt(therapistId)];
    let paramCount = 1;

    if (status) {
        paramCount++;
        query += ` AND mt.status = $${paramCount}`;
        queryParams.push(status);
    }

    if (startDate) {
        paramCount++;
        query += ` AND mt.transaction_date >= $${paramCount}`;
        queryParams.push(startDate);
    }

    if (endDate) {
        paramCount++;
        query += ` AND mt.transaction_date <= $${paramCount}`;
        queryParams.push(endDate);
    }

    query += ` ORDER BY mt.transaction_date DESC LIMIT $${paramCount + 1}`;
    queryParams.push(parseInt(limit as string));

    const transactions = await pool.query(query, queryParams);

    return res.json(transactions.rows);
}));

/**
 * POST /api/pluggy/create-match
 * Manually create a payment match between Pluggy transaction and session (Option B: direct to matched_transactions)
 */
router.post("/create-match", asyncHandler(async (req: Request<ParamsDictionary, any, CreateMatchBody>, res) => {
    const { transactionId, sessionId, patientId, matchType, notes } = req.body;

    if (!transactionId || !sessionId || !patientId || !matchType) {
        return res.status(400).json({
            error: "transactionId, sessionId, patientId, and matchType are required"
        });
    }

    // This route is now for manual matching of unmatched Pluggy transactions
    // The transactionId here refers to a Pluggy transaction ID, not a stored transaction
    
    // Get session and patient details
    const session = await pool.query(
        "SELECT * FROM sessions WHERE id = $1",
        [parseInt(sessionId)]
    );

    const patient = await pool.query(
        "SELECT * FROM patients WHERE id = $1",
        [parseInt(patientId)]
    );

    if (session.rows.length === 0 || patient.rows.length === 0) {
        return res.status(404).json({ error: "Session or patient not found" });
    }

    const sessionData = session.rows[0];
    const patientData = patient.rows[0];

    // Get the bank connection for this therapist to fetch transaction details
    const connection = await pool.query(
        "SELECT * FROM bank_connections WHERE therapist_id = $1 AND status = 'active' LIMIT 1",
        [sessionData.therapist_id]
    );

    if (connection.rows.length === 0) {
        return res.status(400).json({ error: "No active bank connection found" });
    }

    try {
        // Fetch transaction details from Pluggy
        const transactions = await pluggyService.getTransactions(connection.rows[0].pluggy_account_id);
        const transaction = transactions.find(t => t.id === transactionId);

        if (!transaction) {
            return res.status(404).json({ error: "Transaction not found in Pluggy" });
        }

        // Check if this transaction was already processed
        const alreadyProcessed = await pool.query(
            'SELECT id FROM processed_transactions WHERE bank_connection_id = $1 AND pluggy_transaction_id = $2',
            [connection.rows[0].id, transactionId]
        );

        if (alreadyProcessed.rows.length > 0) {
            return res.status(400).json({ error: "Transaction already processed" });
        }

        // Create manual match in matched_transactions table
        const amountDifference = transaction.amount - (patientData.preco || 0);
        
        // Extract minimal sender information (privacy-compliant)
        const senderFirstName = transaction.paymentData?.payer?.name ? 
            transaction.paymentData.payer.name.split(' ')[0] : null;
        const senderInitials = transaction.paymentData?.payer?.name ? 
            transaction.paymentData.payer.name.split(' ').map(part => part[0]).join('.') : null;

        const matchResult = await pool.query(`
            INSERT INTO matched_transactions (
                bank_connection_id,
                pluggy_transaction_id,
                amount,
                transaction_date,
                transaction_type,
                sender_first_name,
                sender_initials,
                pix_end_to_end_id,
                session_id,
                patient_id,
                match_type,
                match_confidence,
                match_reason,
                session_price,
                amount_difference,
                status,
                confirmed_by,
                notes,
                manual_adjustment
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            RETURNING *
        `, [
            connection.rows[0].id,
            transactionId,
            transaction.amount,
            new Date(transaction.date),
            transaction.paymentData?.endToEndId ? 'pix' : 'other',
            senderFirstName,
            senderInitials,
            transaction.paymentData?.endToEndId || null,
            parseInt(sessionId),
            parseInt(patientId),
            matchType,
            1.0, // High confidence for manual matches
            `Manual match created by therapist`,
            patientData.preco,
            amountDifference,
            'confirmed',
            'therapist',
            notes || null,
            true
        ]);

        // Mark transaction as processed
        await pool.query(
            'INSERT INTO processed_transactions (bank_connection_id, pluggy_transaction_id, match_found) VALUES ($1, $2, $3)',
            [connection.rows[0].id, transactionId, true]
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

    } catch (error) {
        console.error('Error creating manual match:', error);
        return res.status(500).json({ 
            error: "Failed to create match",
            details: error instanceof Error ? error.message : String(error)
        });
    }
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
 * Get payment summary for a therapist (Option B: uses new view)
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
            total_matched_transactions: 0,
            total_matched_revenue: 0,
            confirmed_transactions: 0,
            confirmed_revenue: 0,
            last_transaction_date: null,
            average_match_confidence: null
        });
    }

    return res.json(summary.rows[0]);
}));

export default router;