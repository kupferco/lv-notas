// src/services/pluggy-service.ts
import pool from '../config/database.js';
import { mockDataLoader } from './mock-data-loader.js';
import {
    PluggyAccount,
    PluggyTransaction,
    PluggyConnectTokenResponse,
    PluggyItemResponse,
    PluggyListResponse
} from '../types/pluggy.js';

// Use Node.js built-in fetch (Node 18+) or add this type declaration
declare const fetch: typeof globalThis.fetch;

export class PluggyService {
    private clientId: string;
    private clientSecret: string;
    private environment: string;
    private baseUrl: string;
    private mockMode: boolean;
    private mockTherapistId: string;

    constructor(mockMode?: boolean) {
        this.clientId = process.env.PLUGGY_CLIENT_ID || '';
        this.clientSecret = process.env.PLUGGY_CLIENT_SECRET || '';
        this.environment = process.env.PLUGGY_ENVIRONMENT || 'production';
        this.mockMode = mockMode ?? (process.env.PLUGGY_MOCK_MODE === 'true');
        this.mockTherapistId = process.env.MOCK_THERAPIST_ID || '1';
        this.baseUrl = this.environment === 'production'
            ? 'https://api.pluggy.ai'
            : 'https://api.pluggy.ai';

        console.log('🔑 Pluggy Service Configuration:');
        console.log(`   Mode: ${this.mockMode ? 'MOCK' : 'REAL'}`);
        console.log(`   Mock Therapist ID: ${this.mockTherapistId}`);
        console.log(`   Environment: ${this.environment}`);

        if (!this.mockMode) {
            console.log(`   Base URL: ${this.baseUrl}`);
            console.log(`   Client ID: ${this.clientId ? `${this.clientId.substring(0, 8)}...` : 'MISSING'}`);
            console.log(`   Client Secret: ${this.clientSecret ? `${this.clientSecret.substring(0, 8)}...` : 'MISSING'}`);

            if (!this.clientId || !this.clientSecret) {
                throw new Error('Pluggy credentials not found in environment variables (set PLUGGY_MOCK_MODE=true to use mock mode)');
            }

            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(this.clientId)) {
                throw new Error(`Pluggy clientId must be a valid UUID format. Got: ${this.clientId.substring(0, 20)}...`);
            }
        }
    }

    private async getApiKey(): Promise<string> {
        if (this.mockMode) {
            console.log('🎭 Mock Mode: Returning fake access token');
            await new Promise(resolve => setTimeout(resolve, 500));
            return 'mock_access_token_12345';
        }

        try {
            const payload = {
                clientId: this.clientId,
                clientSecret: this.clientSecret,
            };

            const response = await fetch(`${this.baseUrl}/auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'LV-Notas-Clinic-API/1.0',
                    'accept': 'application/json',
                },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(15000),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to get access token: ${response.status} - ${errorText}`);
            }

            const data = await response.json() as { apiKey: string };
            console.log(`✅ Pluggy apiKey retrieved successfully: ${data.apiKey.substring(0, 8)}...`);
            return data.apiKey;
        } catch (error) {
            console.error('❌ Error getting Pluggy access token:', error);
            throw error;
        }
    }

    async createConnectToken(therapistId: number): Promise<string> {
        if (this.mockMode) {
            console.log(`🎭 Mock Mode: Creating fake connect token for therapist ${therapistId}`);
            await new Promise(resolve => setTimeout(resolve, 800));
            return `mock_connect_token_${therapistId}_${Date.now()}`;
        }

        console.log(`🔗 Creating Pluggy connect token for therapist ${therapistId}`);

        try {
            const apiKey = await this.getApiKey();

            const response = await fetch(`${this.baseUrl}/connect_token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-KEY': apiKey,
                    'accept': 'application/json',
                },
                body: JSON.stringify({
                    clientUserId: `therapist_${therapistId}`,
                    // webhookUrl: `${process.env.WEBHOOK_URL || process.env.BASE_URL}/api/pluggy-webhook`,
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to create connect token: ${response.status}`);
            }

            const data = await response.json() as { accessToken: string };
            console.log(`✅ Pluggy connect token created successfully for therapist ${therapistId}: ${data.accessToken.substring(0, 8)}...`);
            return data.accessToken;
        } catch (error) {
            console.error('Error creating Pluggy connect token:', error);
            throw error;
        }
    }


    async getItems(): Promise<PluggyItemResponse[]> {
        if (this.mockMode) {
            console.log('🎭 Mock Mode: Loading items from files');
            await new Promise(resolve => setTimeout(resolve, 600));
            return await mockDataLoader.getMockItems(this.mockTherapistId);
        }

        try {
            // const apiKey = await this.getApiKey();
            const accessToken = await this.createConnectToken(4);

            console.log(`🔍 Using Pluggy items for access token: ${accessToken.substring(0, 8)}...`);

            const response = await fetch(`${this.baseUrl}/items`, {
                method: 'GET',
                headers: {
                    'X-API-KEY': accessToken,
                },
            });
            console.log('Response status:', response.status);
            console.log('Response headers:', [...response.headers.entries()]);

            // ADD THIS - Get the actual error message
            const responseText = await response.text();
            console.log('Response body:', responseText);

            if (!response.ok) {
                throw new Error(`Failed to get items: ${response.status} - ${responseText}`);
            }

            if (!response.ok) {
                throw new Error(`Failed to get items: ${response.status}`);
            }

            const data = await response.json() as PluggyListResponse<PluggyItemResponse>;
            console.log(`✅ Pluggy items retrieved successfully: ${data.results.length} items found`);
            console.log(data);
            return data.results;
        } catch (error) {
            console.error('Error getting Pluggy items:', error);
            throw error;
        }
    }

    async getAccounts(itemId: string): Promise<PluggyAccount[]> {
        if (this.mockMode) {
            console.log(`🎭 Mock Mode: Loading accounts for item ${itemId} from files`);
            await new Promise(resolve => setTimeout(resolve, 400));
            return await mockDataLoader.getMockAccounts(this.mockTherapistId, itemId);
        }

        try {
            const accessToken = await this.getApiKey();

            const response = await fetch(`${this.baseUrl}/accounts?itemId=${itemId}`, {
                method: 'GET',
                headers: {
                    'X-API-KEY': accessToken,
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to get accounts: ${response.status}`);
            }

            const data = await response.json() as PluggyListResponse<PluggyAccount>;
            return data.results;
        } catch (error) {
            console.error('Error getting Pluggy accounts:', error);
            throw error;
        }
    }

    async getTransactions(accountId: string, from?: string, to?: string): Promise<PluggyTransaction[]> {
        if (this.mockMode) {
            console.log(`🎭 Mock Mode: Loading transactions for account ${accountId} from files`);
            await new Promise(resolve => setTimeout(resolve, 700));
            return await mockDataLoader.getMockTransactions(this.mockTherapistId, accountId, from, to);
        }

        try {
            const accessToken = await this.getApiKey();

            let url = `${this.baseUrl}/transactions?accountId=${accountId}`;
            if (from) url += `&from=${from}`;
            if (to) url += `&to=${to}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-API-KEY': accessToken,
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to get transactions: ${response.status}`);
            }

            const data = await response.json() as PluggyListResponse<PluggyTransaction>;
            return data.results;
        } catch (error) {
            console.error('Error getting Pluggy transactions:', error);
            throw error;
        }
    }

    /**
     * Store bank connection metadata in our database (works for both mock and real)
     */
    async storeBankConnection(therapistId: number, itemId: string, accountId: string): Promise<void> {
        try {
            const accounts = await this.getAccounts(itemId);
            const account = accounts.find(acc => acc.id === accountId);

            if (!account) {
                throw new Error('Account not found in response');
            }

            await pool.query(`
                INSERT INTO bank_connections (
                    therapist_id, 
                    pluggy_item_id, 
                    pluggy_account_id,
                    bank_name,
                    account_type,
                    account_holder_name,
                    status,
                    last_sync_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (therapist_id, pluggy_account_id) 
                DO UPDATE SET 
                    status = 'active',
                    last_sync_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
            `, [
                therapistId,
                itemId,
                accountId,
                account.bankData?.transferNumber || account.name,
                account.subtype,
                account.owner || account.name,
                'active',
                new Date()
            ]);

            console.log(`Bank connection stored for therapist ${therapistId}: ${account.name}`);
        } catch (error) {
            console.error('Error storing bank connection:', error);
            throw error;
        }
    }

    // All other methods stay the same - they use the methods above which already handle mock/real internally
    // No need for ifMock checks in these methods anymore

    /**
     * Real-time transaction processing with privacy-first matching
     * Only stores matched transactions, discards unmatched ones
     */
    async processTransactionsForTherapist(therapistId: number): Promise<{
        newMatches: number,
        processedTransactions: number
    }> {
        try {
            // Get all active bank connections for this therapist
            const connections = await pool.query(
                'SELECT * FROM bank_connections WHERE therapist_id = $1 AND status = $2',
                [therapistId, 'active']
            );

            if (connections.rows.length === 0) {
                return { newMatches: 0, processedTransactions: 0 };
            }

            let totalNewMatches = 0;
            let totalProcessed = 0;

            for (const connection of connections.rows) {
                try {
                    // Get transactions (automatically uses mock or real based on service mode)
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                    const transactions = await this.getTransactions(
                        connection.pluggy_account_id,
                        thirtyDaysAgo.toISOString().split('T')[0]
                    );

                    // Filter for incoming transactions only
                    const incomingTransactions = transactions.filter(t => t.amount > 0);

                    for (const transaction of incomingTransactions) {
                        // Check if we've already processed this transaction
                        const alreadyProcessed = await pool.query(
                            'SELECT id FROM processed_transactions WHERE bank_connection_id = $1 AND pluggy_transaction_id = $2',
                            [connection.id, transaction.id]
                        );

                        if (alreadyProcessed.rows.length > 0) {
                            continue; // Skip already processed transactions
                        }

                        totalProcessed++;

                        // Try to match this transaction with existing sessions
                        const match = await this.findSessionMatch(therapistId, transaction);

                        if (match) {
                            // Store the matched transaction
                            await this.storeMatchedTransaction(connection.id, transaction, match);
                            totalNewMatches++;

                            // Mark as processed with match found
                            await pool.query(
                                'INSERT INTO processed_transactions (bank_connection_id, pluggy_transaction_id, match_found) VALUES ($1, $2, $3)',
                                [connection.id, transaction.id, true]
                            );
                        } else {
                            // Mark as processed but no match found (no sensitive data stored)
                            await pool.query(
                                'INSERT INTO processed_transactions (bank_connection_id, pluggy_transaction_id, match_found) VALUES ($1, $2, $3)',
                                [connection.id, transaction.id, false]
                            );
                        }
                    }

                    // Update last sync time
                    await pool.query(
                        'UPDATE bank_connections SET last_sync_at = CURRENT_TIMESTAMP WHERE id = $1',
                        [connection.id]
                    );

                } catch (error) {
                    console.error(`Error processing connection ${connection.id}:`, error);
                    // Continue with other connections even if one fails
                }
            }

            console.log(`Processed ${totalProcessed} transactions, found ${totalNewMatches} new matches for therapist ${therapistId}`);
            return { newMatches: totalNewMatches, processedTransactions: totalProcessed };

        } catch (error) {
            console.error(`Error processing transactions for therapist ${therapistId}:`, error);
            throw error;
        }
    }

    /**
     * Find matching session for a transaction using privacy-compliant methods
     */
    private async findSessionMatch(therapistId: number, transaction: PluggyTransaction): Promise<{
        sessionId: number;
        patientId: number;
        matchType: string;
        confidence: number;
        reason: string;
    } | null> {
        try {
            // Get unpaid sessions for this therapist (within reasonable time range)
            const sessions = await pool.query(`
                SELECT s.*, p.nome, p.preco, p.cpf
                FROM sessions s
                JOIN patients p ON s.patient_id = p.id
                WHERE s.therapist_id = $1 
                AND s.status != 'compareceu'
                AND s.date >= $2
                AND s.date <= $3
                AND NOT EXISTS (
                    SELECT 1 FROM matched_transactions mt 
                    WHERE mt.session_id = s.id
                )
                ORDER BY s.date DESC
            `, [
                therapistId,
                new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
                new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)   // 7 days future
            ]);

            // Try different matching strategies
            for (const session of sessions.rows) {
                // Strategy 1: CPF match (highest confidence)
                if (transaction.paymentData?.payer?.document && session.cpf) {
                    const cleanTxCpf = transaction.paymentData.payer.document.replace(/\D/g, '');
                    const cleanSessionCpf = session.cpf.replace(/\D/g, '');

                    if (cleanTxCpf === cleanSessionCpf) {
                        return {
                            sessionId: session.id,
                            patientId: session.patient_id,
                            matchType: 'automatic_cpf',
                            confidence: 0.95,
                            reason: 'CPF match'
                        };
                    }
                }

                // Strategy 2: Amount + date match (medium confidence)
                if (session.preco && Math.abs(transaction.amount - session.preco) < 0.01) {
                    const sessionDate = new Date(session.date);
                    const transactionDate = new Date(transaction.date);
                    const daysDiff = Math.abs((sessionDate.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24));

                    if (daysDiff <= 3) { // Within 3 days
                        return {
                            sessionId: session.id,
                            patientId: session.patient_id,
                            matchType: 'automatic_amount_date',
                            confidence: 0.80,
                            reason: `Amount match (${transaction.amount}) within ${Math.round(daysDiff)} days`
                        };
                    }
                }

                // Strategy 3: Name similarity + amount (lower confidence)
                if (transaction.paymentData?.payer?.name && session.nome) {
                    const senderName = transaction.paymentData.payer.name.toLowerCase();
                    const patientName = session.nome.toLowerCase();

                    // Simple name similarity check
                    const firstNameMatch = senderName.split(' ')[0] === patientName.split(' ')[0];
                    const amountMatch = session.preco && Math.abs(transaction.amount - session.preco) < 0.01;

                    if (firstNameMatch && amountMatch) {
                        return {
                            sessionId: session.id,
                            patientId: session.patient_id,
                            matchType: 'automatic_name_amount',
                            confidence: 0.70,
                            reason: `First name and amount match`
                        };
                    }
                }
            }

            return null; // No match found
        } catch (error) {
            console.error('Error finding session match:', error);
            return null;
        }
    }

    /**
     * Store matched transaction with minimal privacy-compliant data
     */
    private async storeMatchedTransaction(
        bankConnectionId: number,
        transaction: PluggyTransaction,
        match: { sessionId: number; patientId: number; matchType: string; confidence: number; reason: string }
    ): Promise<void> {
        try {
            // Get session price for comparison
            const sessionResult = await pool.query('SELECT * FROM sessions s JOIN patients p ON s.patient_id = p.id WHERE s.id = $1', [match.sessionId]);
            const sessionData = sessionResult.rows[0];

            // Extract minimal sender information (privacy-compliant)
            const senderFirstName = transaction.paymentData?.payer?.name ?
                transaction.paymentData.payer.name.split(' ')[0] : null;
            const senderInitials = transaction.paymentData?.payer?.name ?
                transaction.paymentData.payer.name.split(' ').map(part => part[0]).join('.') : null;

            await pool.query(`
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
                    confirmed_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            `, [
                bankConnectionId,
                transaction.id,
                transaction.amount,
                new Date(transaction.date),
                this.determineTransactionType(transaction),
                senderFirstName,
                senderInitials,
                transaction.paymentData?.endToEndId || null,
                match.sessionId,
                match.patientId,
                match.matchType,
                match.confidence,
                match.reason,
                sessionData.preco,
                transaction.amount - (sessionData.preco || 0),
                'confirmed',
                'system'
            ]);

            // Update session status to indicate payment received
            await pool.query(
                'UPDATE sessions SET status = $1 WHERE id = $2',
                ['compareceu', match.sessionId]
            );

            console.log(`Stored matched transaction: ${transaction.amount} for session ${match.sessionId}`);
        } catch (error) {
            console.error('Error storing matched transaction:', error);
            throw error;
        }
    }

    /**
     * Determine transaction type from transaction data
     */
    private determineTransactionType(transaction: PluggyTransaction): string {
        if (transaction.paymentData?.endToEndId) {
            return 'pix';
        }
        if (transaction.type?.toLowerCase().includes('ted')) {
            return 'ted';
        }
        if (transaction.type?.toLowerCase().includes('doc')) {
            return 'doc';
        }
        return 'other';
    }

    /**
     * Get matched transactions for a therapist
     */
    async getMatchedTransactionsForTherapist(therapistId: number): Promise<any[]> {
        try {
            const result = await pool.query(`
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
                ORDER BY mt.transaction_date DESC
            `, [therapistId]);

            return result.rows;
        } catch (error) {
            console.error('Error getting matched transactions:', error);
            throw error;
        }
    }

    /**
     * Get unmatched transactions with suggestions
     */
    async getUnmatchedTransactionsWithSuggestions(therapistId: number): Promise<any[]> {
        try {
            // Get active connections
            const connections = await pool.query(
                'SELECT * FROM bank_connections WHERE therapist_id = $1 AND status = $2',
                [therapistId, 'active']
            );

            const suggestions = [];

            for (const connection of connections.rows) {
                // Get recent transactions (automatically uses mock or real)
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

                const transactions = await this.getTransactions(
                    connection.pluggy_account_id,
                    sevenDaysAgo.toISOString().split('T')[0]
                );

                // Filter for unprocessed incoming transactions
                for (const transaction of transactions.filter(t => t.amount > 0)) {
                    const alreadyProcessed = await pool.query(
                        'SELECT id FROM processed_transactions WHERE bank_connection_id = $1 AND pluggy_transaction_id = $2',
                        [connection.id, transaction.id]
                    );

                    if (alreadyProcessed.rows.length === 0) {
                        // Find potential matches
                        const potentialMatch = await this.findSessionMatch(therapistId, transaction);

                        if (potentialMatch) {
                            // Get session details
                            const sessionResult = await pool.query(`
                                SELECT s.*, p.nome 
                                FROM sessions s 
                                JOIN patients p ON s.patient_id = p.id 
                                WHERE s.id = $1
                            `, [potentialMatch.sessionId]);

                            if (sessionResult.rows.length > 0) {
                                const session = sessionResult.rows[0];
                                suggestions.push({
                                    transaction_id: transaction.id,
                                    amount: transaction.amount,
                                    description: transaction.description,
                                    transaction_date: transaction.date,
                                    sender_name: transaction.paymentData?.payer?.name || null,
                                    sender_document: transaction.paymentData?.payer?.document || null,
                                    patient_id: potentialMatch.patientId,
                                    patient_name: session.nome,
                                    match_confidence: potentialMatch.confidence,
                                    match_reason: potentialMatch.reason,
                                    suggested_session_id: potentialMatch.sessionId,
                                    suggested_session_date: session.date
                                });
                            }
                        }
                    }
                }
            }

            return suggestions.sort((a, b) => b.match_confidence - a.match_confidence);
        } catch (error) {
            console.error('Error getting unmatched transactions with suggestions:', error);
            throw error;
        }
    }

    // Add these methods to the existing PluggyService class in src/services/pluggy-service.ts

    /**
     * Find potential LV-{patientId} matches for a therapist
     * Moved from router to service layer for better organization
     */
    async findPotentialMatches(
        therapistId: number,
        start: string,
        end: string,
        limit: number = 50
    ): Promise<any> {
        console.log(`🔍 Finding potential LV-{patientId} matches for therapist ${therapistId}`);
        console.log(`📅 Date range: ${start} to ${end}`);

        try {
            // Step 1: Get incoming transactions
            const transactions = await this.getIncomingTransactionsForMatching(
                therapistId,
                start,
                end
            );

            console.log(`💳 Found ${transactions.length} incoming transactions`);

            // Step 2: Find LV-{patientId} matches against monthly billing periods
            const matches: any[] = [];
            let lvReferenceCount = 0;

            for (const transaction of transactions) {
                // Extract LV reference from transaction
                if (transaction.potential_reference && transaction.potential_reference.startsWith('LV-')) {
                    lvReferenceCount++;
                    const patientIdStr = transaction.potential_reference.substring(3); // Remove "LV-"
                    const patientId = parseInt(patientIdStr);

                    console.log(`🎯 Processing LV-${patientId} reference from transaction ${transaction.id}`);

                    // Step 3: Find oldest unpaid billing period for this patient
                    const billingPeriod = await this.findOldestUnpaidBillingPeriod(therapistId, patientId);

                    if (billingPeriod) {
                        console.log(`🎯 Matching against billing period ${billingPeriod.id} (${billingPeriod.billing_year}-${billingPeriod.billing_month})`);

                        const { confidence, reasons } = this.calculateLVBillingPeriodConfidence(transaction, billingPeriod);

                        if (confidence > 0.6) {
                            matches.push({
                                transaction_id: transaction.id,
                                transaction_amount: transaction.amount,
                                transaction_date: transaction.date,
                                transaction_description: transaction.description,
                                transaction_type: transaction.type,
                                sender_name: transaction.sender_name,
                                lv_reference: transaction.potential_reference,

                                // Monthly billing period information
                                billing_period_id: billingPeriod.id,
                                patient_id: billingPeriod.patient_id,
                                patient_name: billingPeriod.patient_name,
                                patient_cpf: billingPeriod.patient_cpf,
                                billing_amount: billingPeriod.total_amount,
                                billing_year: billingPeriod.billing_year,
                                billing_month: billingPeriod.billing_month,
                                session_count: billingPeriod.session_count,
                                processed_at: billingPeriod.processed_at,
                                total_paid: billingPeriod.total_paid,

                                confidence,
                                match_reasons: reasons
                            });

                            console.log(`✅ LV Match found: ${transaction.potential_reference} → ${billingPeriod.patient_name} (${billingPeriod.billing_year}-${billingPeriod.billing_month}) (confidence: ${confidence.toFixed(2)})`);
                        } else {
                            console.log(`⚠️ Low confidence match: ${confidence.toFixed(2)} for ${transaction.potential_reference}`);
                        }
                    } else {
                        console.log(`❌ No unpaid billing periods found for patient ID ${patientId}`);
                    }
                }
            }

            // Step 4: Sort by confidence (highest first) and limit results
            matches.sort((a, b) => b.confidence - a.confidence);
            const limitedMatches = matches.slice(0, limit);

            return {
                matches: limitedMatches,
                summary: {
                    total_incoming_transactions: transactions.length,
                    lv_reference_transactions: lvReferenceCount,
                    total_matches: matches.length,
                    high_confidence_matches: matches.filter(m => m.confidence > 0.8).length
                },
                date_range: { start, end }
            };

        } catch (error) {
            console.error('Error finding LV potential matches:', error);
            throw new Error(`Failed to find potential matches: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Get incoming transactions formatted for matching
     * Reuses existing getIncomingTransactions logic but returns formatted data
     */
    private async getIncomingTransactionsForMatching(
        therapistId: number,
        start: string,
        end: string
    ): Promise<any[]> {
        // Get items and accounts (automatically uses mock or real based on service mode)
        const items = await this.getItems();

        let allRawTransactions: any[] = [];

        for (const item of items) {
            const accounts = await this.getAccounts(item.id);

            for (const account of accounts) {
                try {
                    const rawTransactions = await this.getTransactions(account.id, start, end);

                    // Add minimal metadata but keep raw structure
                    const transactionsWithMeta = rawTransactions.map((transaction: any) => ({
                        ...transaction,
                        _metadata: {
                            item_id: item.id,
                            account_id: account.id,
                            bank_name: item.connector?.name || (account.bankData as any)?.name || account.name || 'Unknown',
                            therapist_id: therapistId
                        }
                    }));

                    allRawTransactions.push(...transactionsWithMeta);

                } catch (error) {
                    console.error(`Error fetching transactions for account ${account.id}:`, error);
                }
            }
        }

        // Filter for incoming payments only and transform for matching
        const incomingTransactions = allRawTransactions
            .filter(transaction =>
                transaction.amount > 0 &&
                transaction.type === 'credit' &&
                !transaction.error
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
                potential_reference: this.extractPaymentReference(transaction),
                raw_transaction: transaction // Keep for advanced matching logic
            }));

        return incomingTransactions;
    }

    /**
     * Extract payment reference from transaction description or PIX data
     * Prioritizes LV-{patientId} pattern
     */
    private extractPaymentReference(transaction: any): string | null {
        const text = `${transaction.description} ${transaction.paymentData?.endToEndId || ''}`.toLowerCase();

        // PRIORITY 1: Look for LV-{patientId} pattern (new system)
        const lvPattern = /lv-(\d+)/i;
        const lvMatch = text.match(lvPattern);
        if (lvMatch) {
            console.log(`🎯 Found LV reference: LV-${lvMatch[1]} in transaction ${transaction.id}`);
            return `LV-${lvMatch[1]}`;
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

    /**
     * Find the oldest unpaid billing period for a patient
     * Used for FIFO payment matching
     */
    private async findOldestUnpaidBillingPeriod(therapistId: number, patientId: number): Promise<any | null> {
        const billingPeriodsQuery = `
        SELECT mbp.*, p.nome as patient_name, p.email as patient_email, p.cpf as patient_cpf,
               COALESCE(SUM(mbp_pay.amount), 0) as total_paid
        FROM monthly_billing_periods mbp
        JOIN patients p ON mbp.patient_id = p.id
        LEFT JOIN monthly_billing_payments mbp_pay ON mbp.id = mbp_pay.billing_period_id
        WHERE mbp.therapist_id = $1 
        AND mbp.patient_id = $2 
        AND mbp.status = 'processed'
        GROUP BY mbp.id, p.nome, p.email, p.cpf
        HAVING COALESCE(SUM(mbp_pay.amount), 0) < mbp.total_amount
        ORDER BY mbp.processed_at ASC
        LIMIT 1
    `;

        const result = await pool.query(billingPeriodsQuery, [therapistId, patientId]);
        return result.rows.length > 0 ? result.rows[0] : null;
    }

    /**
     * Calculate match confidence AND reasons for LV references against monthly billing periods
     * Multi-factor scoring system
     */
    private calculateLVBillingPeriodConfidence(transaction: any, billingPeriod: any): { confidence: number, reasons: string[] } {
        let confidence = 0;
        const reasons: string[] = [];

        // LV reference match (40% weight)
        if (transaction.potential_reference && transaction.potential_reference.startsWith('LV-')) {
            confidence += 0.4;
            reasons.push('lv_reference_match');
        }

        // CPF matching (35% weight)
        const rawTx = transaction.raw_transaction;
        if (rawTx?.paymentData?.payer?.document && billingPeriod.patient_cpf) {
            const cleanTxCpf = rawTx.paymentData.payer.document.replace(/\D/g, '');
            const cleanPatientCpf = billingPeriod.patient_cpf.replace(/\D/g, '');

            if (cleanTxCpf === cleanPatientCpf) {
                confidence += 0.35;
                reasons.push('cpf_match');
            }
        }

        // Amount matching (20% weight)
        if (billingPeriod.total_amount && transaction.amount) {
            const billingAmountInCurrency = parseFloat(billingPeriod.total_amount) / 100;
            const amountDiff = Math.abs(transaction.amount - billingAmountInCurrency);

            if (amountDiff < 0.01) {
                reasons.push('exact_amount_match');
                confidence += 0.2;
            } else if (amountDiff < billingAmountInCurrency * 0.1) {
                reasons.push('close_amount_match');
                const amountMatch = Math.max(0, 1 - (amountDiff / billingAmountInCurrency));
                confidence += amountMatch * 0.2;
            }
        }

        // Name similarity (5% weight)
        if (transaction.sender_name && billingPeriod.patient_name) {
            const nameSimilarity = this.calculateNameSimilarity(transaction.sender_name, billingPeriod.patient_name);
            if (nameSimilarity > 0.8) {
                reasons.push('name_match');
                confidence += nameSimilarity * 0.05;
            } else if (nameSimilarity > 0.5) {
                reasons.push('partial_name_match');
                confidence += nameSimilarity * 0.05;
            }
        }

        return { confidence: Math.min(confidence, 1.0), reasons };
    }

    /**
     * Calculate name similarity between transaction sender and patient
     * Used for matching confidence scoring
     */
    private calculateNameSimilarity(senderName: string, patientName: string): number {
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
}

// Create and export singleton instance and factory function
export const pluggyService = new PluggyService();

// Factory function to create service instance with specific mode
export const createPluggyService = (mockMode: boolean) => new PluggyService(mockMode);