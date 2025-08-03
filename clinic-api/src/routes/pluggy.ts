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

interface Transaction {
    id: string;
    amount: number;
    date: string;
    description: string;
    type: string;
    potential_reference?: string | null;
    sender_name?: string;
    paymentData?: {
        payer?: {
            name?: string;
            document?: string;
            bankName?: string;
        };
        endToEndId?: string;
    };
    _metadata?: {
        item_id: string;
        account_id: string;
        bank_name: string;
        therapist_id: number;
    };
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

// =============================================================================
// SHARED INTERNAL FUNCTIONS
// =============================================================================

/**
 * Internal function to get all raw transactions for a therapist
 * Used by both /all-transactions and /potential-matches endpoints
 */
async function getAllRawTransactions(
    therapistId: number,
    start: string,
    end: string,
    service: any
): Promise<any[]> {
    let allRawTransactions: any[] = [];

    try {
        // Get accounts through service (agnostic approach)
        const items = await service.getItems();

        for (const item of items) {
            const accounts = await service.getAccounts(item.id);

            for (const account of accounts) {
                try {
                    const rawTransactions = await service.getTransactions(
                        account.id,
                        start,
                        end
                    );

                    // Add minimal metadata but keep raw structure
                    const transactionsWithMeta = rawTransactions.map((transaction: any) => ({
                        ...transaction, // Keep ALL raw data from service
                        _metadata: {
                            item_id: item.id,
                            account_id: account.id,
                            bank_name: item.connector?.name || account.bankData?.name || 'Unknown',
                            therapist_id: therapistId
                        }
                    }));

                    allRawTransactions.push(...transactionsWithMeta);

                } catch (error) {
                    console.error(`Error fetching transactions for account ${account.id}:`, error);
                    // Add error info but continue
                    allRawTransactions.push({
                        error: `Failed to fetch from account ${account.id}`,
                        details: error instanceof Error ? error.message : String(error),
                        _metadata: {
                            item_id: item.id,
                            account_id: account.id,
                            therapist_id: therapistId
                        }
                    });
                }
            }
        }

        // Sort by date (newest first)
        allRawTransactions.sort((a, b) => {
            const dateA = new Date(a.date || 0).getTime();
            const dateB = new Date(b.date || 0).getTime();
            return dateB - dateA;
        });

    } catch (error) {
        console.error('Error getting data from service:', error);
        throw new Error(`Failed to fetch raw transactions: ${error instanceof Error ? error.message : String(error)}`);
    }

    return allRawTransactions;
}

/**
 * Internal function to get incoming transactions (credits only) for matching
 * Used by /potential-matches endpoint
 */
async function getIncomingTransactions(
    therapistId: number,
    start: string,
    end: string,
    service: any
): Promise<any[]> {
    const allTransactions = await getAllRawTransactions(therapistId, start, end, service);

    // Filter for incoming payments only and transform for matching
    const incomingTransactions = allTransactions
        .filter(transaction =>
            transaction.amount > 0 &&
            transaction.type === 'credit' &&
            !transaction.error // Skip error entries
        )
        .map(transaction => ({
            id: transaction.id,
            amount: transaction.amount,
            date: transaction.date,
            description: transaction.description,
            type: transaction.paymentData?.endToEndId ? 'pix' : 'other',
            sender_name: transaction.paymentData?.payer?.name || '',
            pix_end_to_end_id: transaction.paymentData?.endToEndId || null,
            bank_name: transaction._metadata.bank_name,
            account_id: transaction._metadata.account_id,
            // Extract potential reference from description or pix data
            potential_reference: extractPaymentReference(transaction),
            raw_transaction: transaction // Keep for advanced matching logic
        }));

    return incomingTransactions;
}

// Helper function to extract payment reference from transaction
function extractPaymentReference(transaction: Transaction): string | null {
    // Look for reference patterns in description or pix data
    const text = `${transaction.description} ${transaction.paymentData?.endToEndId || ''}`.toLowerCase();

    // PRIORITY 1: Look for LV-{patientId} pattern (new system)
    const lvPattern = /lv-(\d+)/i;
    const lvMatch = text.match(lvPattern);
    if (lvMatch) {
        console.log(`🎯 Found LV reference: LV-${lvMatch[1]} in transaction ${transaction.id}`);
        return `LV-${lvMatch[1]}`;  // Return in standard format
    }

    // PRIORITY 2: Legacy reference patterns (for backward compatibility)
    const legacyPatterns = [
        /ref[:\s]*([a-z0-9\-]+)/i,
        /referencia[:\s]*([a-z0-9\-]+)/i,
        /([a-z]{2,3}-[a-z]{3}\d{2}-\d{3})/i, // ALV-JUL25-001 format
        /([a-z]+\d+)/i // Simple alphanumeric
    ];

    for (const pattern of legacyPatterns) {
        const match = text.match(pattern);
        if (match) {
            console.log(`📋 Found legacy reference: ${match[1]} in transaction ${transaction.id}`);
            return match[1].toUpperCase();
        }
    }

    return null;
}

// Helper function to find potential matches for a transaction
function findPotentialMatches(transaction: Transaction, paymentRequests: any[], unpaidSessions: any[]): any[] {
    const matches: any[] = [];

    // Match against payment requests first (higher priority)
    paymentRequests.forEach(request => {
        const confidence = calculateMatchConfidence(transaction, request, 'payment_request');
        if (confidence > 0.3) { // Minimum threshold
            matches.push({
                type: 'payment_request',
                request_id: request.id,
                patient_id: request.patient_id,
                patient_name: request.patient_name,
                expected_amount: request.total_amount,
                payment_reference: request.payment_reference,
                confidence,
                match_reasons: getMatchReasons(transaction, request, 'payment_request')
            });
        }
    });

    // Match against unpaid sessions (lower priority)
    unpaidSessions.forEach(session => {
        const confidence = calculateMatchConfidence(transaction, session, 'session');
        if (confidence > 0.3) {
            matches.push({
                type: 'session',
                session_id: session.session_id,
                patient_id: session.patient_id,
                patient_name: session.patient_name,
                expected_amount: session.expected_amount,
                session_date: session.session_date,
                confidence,
                match_reasons: getMatchReasons(transaction, session, 'session')
            });
        }
    });

    // Sort by confidence
    return matches.sort((a, b) => b.confidence - a.confidence);
}

// Helper function to calculate match confidence
function calculateMatchConfidence(transaction: Transaction, target: any, type: 'payment_request' | 'session'): number {
    let confidence = 0;
    const maxConfidence = 1.0;

    // Reference matching (50% weight) - highest priority when present
    if (transaction.potential_reference && type === 'payment_request' && target.payment_reference) {
        if (transaction.potential_reference === target.payment_reference) {
            confidence += 0.5; // High bonus for exact reference match
        } else if (transaction.potential_reference.includes(target.payment_reference) ||
            target.payment_reference.includes(transaction.potential_reference)) {
            confidence += 0.3; // Partial reference match
        }
    }

    // Amount matching (30% weight)
    const expectedAmount = type === 'payment_request' ? target.total_amount : target.expected_amount;
    if (expectedAmount) {
        const amountDiff = Math.abs(transaction.amount - expectedAmount);
        const amountMatch = Math.max(0, 1 - (amountDiff / expectedAmount));
        confidence += amountMatch * 0.3;
    }

    // Name similarity (15% weight)
    if (transaction.sender_name && target.patient_name) {
        const nameSimilarity = calculateNameSimilarity(transaction.sender_name, target.patient_name);
        confidence += nameSimilarity * 0.15;
    }

    // Date proximity (5% weight)
    const targetDate = type === 'payment_request' ? target.request_date : target.session_date;
    if (targetDate) {
        const daysDiff = Math.abs(
            (new Date(transaction.date).getTime() - new Date(targetDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        const dateMatch = Math.max(0, 1 - (daysDiff / 30)); // 30 days max
        confidence += dateMatch * 0.05;
    }

    return Math.min(confidence, maxConfidence);
}

// Helper function to calculate name similarity
function calculateNameSimilarity(senderName: string, patientName: string): number {
    // Simple name matching - can be enhanced with fuzzy matching
    const senderLower = senderName.toLowerCase().trim();
    const patientLower = patientName.toLowerCase().trim();

    // Exact match
    if (senderLower === patientLower) return 1.0;

    // First name match
    const senderFirst = senderLower.split(' ')[0];
    const patientFirst = patientLower.split(' ')[0];
    if (senderFirst === patientFirst && senderFirst.length > 2) return 0.8;

    // Initials match
    const senderInitials = senderLower.split(' ').map(part => part[0]).join('');
    const patientInitials = patientLower.split(' ').map(part => part[0]).join('');
    if (senderInitials === patientInitials && senderInitials.length >= 2) return 0.6;

    // Contains check
    if (senderLower.includes(patientFirst) || patientLower.includes(senderFirst)) return 0.5;

    return 0;
}

// Helper function to get match reasons
function getMatchReasons(transaction: Transaction, target: any, type: 'payment_request' | 'session'): string[] {
    const reasons: string[] = [];

    // Reference matching
    if (transaction.potential_reference && type === 'payment_request' && target.payment_reference) {
        if (transaction.potential_reference === target.payment_reference) {
            reasons.push('exact_reference_match');
        } else if (transaction.potential_reference.includes(target.payment_reference) ||
            target.payment_reference.includes(transaction.potential_reference)) {
            reasons.push('partial_reference_match');
        }
    }

    const expectedAmount = type === 'payment_request' ? target.total_amount : target.expected_amount;

    if (expectedAmount && Math.abs(transaction.amount - expectedAmount) < 0.01) {
        reasons.push('exact_amount_match');
    } else if (expectedAmount && Math.abs(transaction.amount - expectedAmount) < expectedAmount * 0.1) {
        reasons.push('close_amount_match');
    }

    if (transaction.sender_name && target.patient_name) {
        const similarity = calculateNameSimilarity(transaction.sender_name, target.patient_name);
        if (similarity > 0.8) reasons.push('name_match');
        else if (similarity > 0.5) reasons.push('partial_name_match');
    }

    if (transaction.potential_reference) {
        reasons.push('reference_found');
    }

    if (transaction.type === 'pix') {
        reasons.push('pix_payment');
    }

    return reasons;
}

// Helper function to determine if transaction is likely a therapy payment
function isLikelyTherapyPayment(transaction: Transaction): boolean {
    // Basic heuristics for therapy payments
    const amount = transaction.amount;

    // Typical therapy session amounts (adjust based on your pricing)
    if (amount >= 50 && amount <= 2000) {
        return true;
    }

    // PIX payments are common for therapy
    if (transaction.type === 'pix' && amount >= 100) {
        return true;
    }

    return false;
}

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

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
 */
router.get("/connections/:therapistId", asyncHandler(async (req, res) => {
    const { therapistId } = req.params;
    const service = getPluggyService(req);

    try {
        // Get mock items from service (handles mock/real internally)
        const items = await service.getItems();

        // Transform items to match expected connection format
        const connections = await Promise.all(
            items.map(async (item) => {
                // Get accounts for this item
                const accounts = await service.getAccounts(item.id);

                // Return one connection per account
                return accounts.map(account => ({
                    id: `connection_${account.id}`,
                    bank_name: account.bankData?.transferNumber || item.connector.name,
                    account_type: account.subtype,
                    account_holder_name: account.owner || account.name,
                    status: 'active',
                    last_sync_at: new Date().toISOString(),
                    created_at: account.createdAt,
                    error_count: 0,
                    last_error: null,
                    // Additional fields
                    pluggy_item_id: item.id,
                    pluggy_account_id: account.id,
                    balance: account.balance,
                    currency_code: account.currencyCode
                }));
            })
        );

        // Flatten the array of arrays
        const flatConnections = connections.flat();

        console.log(`Returning ${flatConnections.length} connections for therapist ${therapistId}`);
        return res.json(flatConnections);

    } catch (error) {
        console.error('Error fetching connections:', error);
        return res.status(500).json({
            error: 'Failed to fetch connections',
            details: error instanceof Error ? error.message : String(error)
        });
    }
}));

/**
 * POST /api/pluggy/process-transactions
 * Manually trigger transaction processing for a therapist
 */
router.post("/process-transactions", asyncHandler(async (req: Request<ParamsDictionary, any, ProcessTransactionsBody>, res) => {
    const { therapistId } = req.body;

    if (!therapistId) {
        return res.status(400).json({ error: "therapistId is required" });
    }

    const service = getPluggyService(req);
    const result = await service.processTransactionsForTherapist(parseInt(therapistId));

    return res.json({
        message: "Transaction processing completed successfully",
        newMatches: result.newMatches,
        processedTransactions: result.processedTransactions
    });
}));

/**
 * GET /api/pluggy/unmatched-transactions/:therapistId
 * Get unmatched transactions with patient suggestions
 */
router.get("/unmatched-transactions/:therapistId", asyncHandler(async (req, res) => {
    const { therapistId } = req.params;
    const service = getPluggyService(req);

    const transactions = await service.getUnmatchedTransactionsWithSuggestions(parseInt(therapistId));

    return res.json(transactions);
}));

/**
 * GET /api/pluggy/all-transactions/:therapistId
 * Get ALL raw transactions from service (DEV MODE ONLY for external access)
 * Returns raw banking data for debugging purposes
 */
router.get("/all-transactions/:therapistId", asyncHandler(async (req, res) => {
    const { therapistId } = req.params;
    const { start, end, limit = 100 } = req.query;

    // Restrict external access to development mode only
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
            error: 'This endpoint is only available in development mode',
            message: 'Use /potential-matches for production data access'
        });
    }

    console.log(`🔧 DEV: Fetching ALL raw transactions for therapist ${therapistId}`);
    console.log(`📅 Date range: ${start} to ${end}`);

    try {
        const service = getPluggyService(req);
        const allRawTransactions = await getAllRawTransactions(
            parseInt(therapistId),
            start as string,
            end as string,
            service
        );

        const limitedTransactions = allRawTransactions.slice(0, parseInt(limit as string));

        return res.json({
            notice: 'DEV MODE: Raw transaction data - contains sensitive information',
            transactions: limitedTransactions,
            total_count: allRawTransactions.length,
            date_range: { start, end },
            service_mode: service.constructor.name,
            breakdown: {
                total: allRawTransactions.length,
                credit: allRawTransactions.filter(t => t.amount > 0).length,
                debit: allRawTransactions.filter(t => t.amount < 0).length,
                with_pix_data: allRawTransactions.filter(t => t.paymentData?.endToEndId).length,
                errors: allRawTransactions.filter(t => t.error).length
            }
        });

    } catch (error) {
        console.error('Error fetching raw transactions:', error);
        return res.status(500).json({
            error: 'Failed to fetch raw transactions',
            details: error instanceof Error ? error.message : String(error)
        });
    }
}));

/**
 * GET /api/pluggy/potential-matches/:therapistId
 * Get potential transaction matches using LV-{patientId} pattern matching
 * REFACTORED: Thin router layer - business logic moved to service
 */
router.get("/potential-matches/:therapistId", asyncHandler(async (req, res) => {
    const { therapistId } = req.params;
    const { start, end, limit = 50 } = req.query;

    // Validate required parameters
    if (!start || !end) {
        return res.status(400).json({
            error: 'Missing required parameters: start and end dates are required'
        });
    }

    try {
        const service = getPluggyService(req);

        const result = await service.findPotentialMatches(
            parseInt(therapistId),
            start as string,
            end as string,
            parseInt(limit as string)
        );

        return res.json({
            ...result,
            mode: req.headers['x-test-mode'] === 'mock' ? 'mock' : 'real'
        });

    } catch (error) {
        console.error('Error in potential-matches endpoint:', error);
        return res.status(500).json({
            error: 'Failed to find potential matches',
            details: error instanceof Error ? error.message : String(error)
        });
    }
}));

/**
 * GET /api/pluggy/transactions/:therapistId
 * Get matched transactions for a therapist
 */
router.get("/transactions/:therapistId", asyncHandler(async (req, res) => {
    const { therapistId } = req.params;
    const { status, startDate, endDate, limit = 50 } = req.query;

    // Get matched transactions from database
    console.log(`Fetching matched transactions for therapist ${therapistId}`);

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

    console.log('Final query:', query);
    console.log('Query params:', queryParams);

    const transactions = await pool.query(query, queryParams);

    return res.json(transactions.rows);
}));

/**
 * POST /api/pluggy/create-match
 * Manually create a payment match between Pluggy transaction and session
 */
router.post("/create-match", asyncHandler(async (req: Request<ParamsDictionary, any, CreateMatchBody>, res) => {
    const { transactionId, sessionId, patientId, matchType, notes } = req.body;

    if (!transactionId || !sessionId || !patientId || !matchType) {
        return res.status(400).json({
            error: "transactionId, sessionId, patientId, and matchType are required"
        });
    }

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
        const service = getPluggyService(req);

        // Fetch transaction details from service (handles mock/real internally)
        const transactions = await service.getTransactions(connection.rows[0].pluggy_account_id);
        const transaction = transactions.find(t => t.id === transactionId);

        if (!transaction) {
            return res.status(404).json({ error: "Transaction not found" });
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
            ["compareceu", parseInt(sessionId)]
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