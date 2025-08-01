// src/services/pluggy-service.ts
import pool from '../config/database.js';

// Use Node.js built-in fetch (Node 18+) or add this type declaration
declare const fetch: typeof globalThis.fetch;

interface PluggyAccount {
  id: string;
  type: string;
  subtype: string;
  name: string;
  balance: number;
  currency_code: string;
  bank_data: {
    name: string;
    code?: string;
  };
}

interface PluggyTransaction {
  id: string;
  account_id: string;
  amount: number;
  date: string;
  description: string;
  type: string;
  category?: string;
  payment_data?: {
    payer?: {
      name?: string;
      document?: string;
      bank_name?: string;
    };
    receiver?: {
      name?: string;
      document?: string;
    };
    reference_number?: string;
    end_to_end_id?: string;
  };
}

interface PluggyConnectTokenResponse {
  access_token: string;
}

interface PluggyItemResponse {
  id: string;
  connector: {
    name: string;
    institutional_url: string;
    country: string;
    type: string;
    credentials: any[];
  };
  status: string;
  created_at: string;
  updated_at: string;
}

export class PluggyService {
  private clientId: string;
  private clientSecret: string;
  private environment: string;
  private baseUrl: string;
  private mockMode: boolean;

  constructor() {
    this.clientId = process.env.PLUGGY_CLIENT_ID || '';
    this.clientSecret = process.env.PLUGGY_CLIENT_SECRET || '';
    this.environment = process.env.PLUGGY_ENVIRONMENT || 'production';
    this.mockMode = process.env.PLUGGY_MOCK_MODE === 'true'; // Add mock mode
    this.baseUrl = this.environment === 'production' 
      ? 'https://api.pluggy.ai' 
      : 'https://api.sandbox.pluggy.ai';

    // Debug logging
    console.log('🔑 Pluggy Configuration Debug:');
    console.log(`   Environment: ${this.environment}`);
    console.log(`   Mock Mode: ${this.mockMode ? 'ENABLED' : 'DISABLED'}`);
    console.log(`   Base URL: ${this.baseUrl}`);
    console.log(`   Client ID: ${this.clientId ? `${this.clientId.substring(0, 8)}...` : 'MISSING'}`);
    console.log(`   Client Secret: ${this.clientSecret ? `${this.clientSecret.substring(0, 8)}...` : 'MISSING'}`);

    if (!this.mockMode && (!this.clientId || !this.clientSecret)) {
      throw new Error('Pluggy credentials not found in environment variables (set PLUGGY_MOCK_MODE=true to use mock mode)');
    }

    // Validate UUID format for clientId (only if not in mock mode)
    if (!this.mockMode && this.clientId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(this.clientId)) {
        throw new Error(`Pluggy clientId must be a valid UUID format. Got: ${this.clientId.substring(0, 20)}...`);
      }
    }
  }

  /**
   * Get access token for Pluggy API calls
   */
  private async getAccessToken(): Promise<string> {
    // Mock mode - return fake token
    if (this.mockMode) {
      console.log('🎭 Mock Mode: Returning fake access token');
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
      return 'mock_access_token_12345';
    }

    try {
      console.log(`🔗 Attempting to connect to Pluggy: ${this.baseUrl}/auth`);
      console.log(`📋 Environment: ${this.environment}`);
      
      // Debug the exact payload being sent
      const payload = {
        client_id: this.clientId,
        client_secret: this.clientSecret,
      };
      
      console.log('📤 Payload being sent to Pluggy:');
      console.log(`   client_id: "${payload.client_id}" (length: ${payload.client_id.length}, type: ${typeof payload.client_id})`);
      console.log(`   client_secret: "${payload.client_secret ? payload.client_secret.substring(0, 8) + '...' : 'EMPTY'}" (length: ${payload.client_secret.length}, type: ${typeof payload.client_secret})`);
      console.log(`   Full payload: ${JSON.stringify(payload, null, 2)}`);
      
      const response = await fetch(`${this.baseUrl}/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'LV-Notas-Clinic-API/1.0',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
        // Add timeout and other options for better error handling
        signal: AbortSignal.timeout(15000), // 15 second timeout
      });

      console.log(`📡 Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Pluggy API error response:`, errorText);
        throw new Error(`Failed to get access token: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as PluggyConnectTokenResponse;
      console.log(`✅ Successfully got Pluggy access token`);
      return data.access_token;
    } catch (error) {
      console.error('❌ Error getting Pluggy access token:', error);
      
      // More specific error messages
      if (error instanceof Error) {
        if (error.name === 'TimeoutError') {
          throw new Error('Pluggy API timeout - please try again later');
        }
        if (error.message.includes('ECONNRESET') || error.message.includes('SSL_ERROR_SYSCALL')) {
          throw new Error('SSL connection to Pluggy failed - this may be a temporary network issue');
        }
        if (error.message.includes('ENOTFOUND')) {
          throw new Error('Cannot reach Pluggy servers - please check your internet connection');
        }
      }
      
      throw error;
    }
  }

  /**
   * Create a connect token for frontend bank connection flow
   */
  async createConnectToken(therapistId: number): Promise<string> {
    // Mock mode - return fake connect token
    if (this.mockMode) {
      console.log(`🎭 Mock Mode: Creating fake connect token for therapist ${therapistId}`);
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API delay
      return `mock_connect_token_${therapistId}_${Date.now()}`;
    }

    try {
      const accessToken = await this.getAccessToken();
      
      const response = await fetch(`${this.baseUrl}/connect_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': accessToken,
        },
        body: JSON.stringify({
          client_user_id: `therapist_${therapistId}`,
          webhook_url: `${process.env.WEBHOOK_URL || process.env.BASE_URL}/api/pluggy-webhook`,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create connect token: ${response.status}`);
      }

      const data = await response.json() as { connect_token: string };
      return data.connect_token;
    } catch (error) {
      console.error('Error creating Pluggy connect token:', error);
      throw error;
    }
  }

  /**
   * Get all items (bank connections) for the authenticated user
   */
  async getItems(): Promise<PluggyItemResponse[]> {
    // Mock mode - return fake bank connections
    if (this.mockMode) {
      console.log('🎭 Mock Mode: Returning fake bank items');
      await new Promise(resolve => setTimeout(resolve, 600));
      return [
        {
          id: 'mock_item_banco_brasil',
          connector: {
            name: 'Banco do Brasil',
            institutional_url: 'https://bb.com.br',
            country: 'BR',
            type: 'BANK',
            credentials: []
          },
          status: 'UPDATED',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: new Date().toISOString()
        },
        {
          id: 'mock_item_itau',  
          connector: {
            name: 'Itaú',
            institutional_url: 'https://itau.com.br',
            country: 'BR',
            type: 'BANK',
            credentials: []
          },
          status: 'UPDATED',
          created_at: '2024-01-20T14:30:00Z',
          updated_at: new Date().toISOString()
        }
      ];
    }

    try {
      const accessToken = await this.getAccessToken();
      
      const response = await fetch(`${this.baseUrl}/items`, {
        method: 'GET',
        headers: {
          'X-API-KEY': accessToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get items: ${response.status}`);
      }

      const data = await response.json() as { results: PluggyItemResponse[] };
      return data.results;
    } catch (error) {
      console.error('Error getting Pluggy items:', error);
      throw error;
    }
  }

  /**
   * Get accounts for a specific item (bank connection)
   */
  async getAccounts(itemId: string): Promise<PluggyAccount[]> {
    // Mock mode - return fake accounts based on itemId
    if (this.mockMode) {
      console.log(`🎭 Mock Mode: Returning fake accounts for item ${itemId}`);
      await new Promise(resolve => setTimeout(resolve, 400));
      
      if (itemId === 'mock_item_banco_brasil') {
        return [
          {
            id: 'mock_account_bb_checking',
            type: 'BANK',
            subtype: 'checking',
            name: 'Conta Corrente',
            balance: 15420.50,
            currency_code: 'BRL',
            bank_data: {
              name: 'Banco do Brasil',
              code: '001'
            }
          }
        ];
      } else if (itemId === 'mock_item_itau') {
        return [
          {
            id: 'mock_account_itau_checking',
            type: 'BANK', 
            subtype: 'checking',
            name: 'Conta Corrente Pessoa Física',
            balance: 8750.25,
            currency_code: 'BRL',
            bank_data: {
              name: 'Itaú',
              code: '341'
            }
          }
        ];
      }
      
      return [];
    }

    try {
      const accessToken = await this.getAccessToken();
      
      const response = await fetch(`${this.baseUrl}/accounts?item_id=${itemId}`, {
        method: 'GET',
        headers: {
          'X-API-KEY': accessToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get accounts: ${response.status}`);
      }

      const data = await response.json() as { results: PluggyAccount[] };
      return data.results;
    } catch (error) {
      console.error('Error getting Pluggy accounts:', error);
      throw error;
    }
  }

  /**
   * Get transactions for a specific account
   */
  async getTransactions(accountId: string, from?: string, to?: string): Promise<PluggyTransaction[]> {
    // Mock mode - return fake transactions with realistic payment data
    if (this.mockMode) {
      console.log(`🎭 Mock Mode: Returning fake transactions for account ${accountId}`);
      await new Promise(resolve => setTimeout(resolve, 700));
      
      const baseTransactions = [
        {
          id: 'mock_tx_pix_1',
          account_id: accountId,
          amount: 150.00,
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
          description: 'PIX recebido',
          type: 'credit',
          category: 'transfer',
          payment_data: {
            payer: {
              name: 'Maria Silva Santos',
              document: '123.456.789-01',
              bank_name: 'Nubank'
            },
            end_to_end_id: 'E12345678202408011234567890123456'
          }
        },
        {
          id: 'mock_tx_pix_2',
          account_id: accountId,
          amount: 200.00,
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
          description: 'PIX recebido - Terapia',
          type: 'credit',
          category: 'transfer',
          payment_data: {
            payer: {
              name: 'João Carlos Oliveira',
              document: '987.654.321-09',
              bank_name: 'Banco do Brasil'
            },
            end_to_end_id: 'E98765432202407291234567890987654'
          }
        },
        {
          id: 'mock_tx_ted_1',
          account_id: accountId,
          amount: 180.00,
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
          description: 'TED recebida',
          type: 'credit',
          category: 'transfer',
          payment_data: {
            payer: {
              name: 'Ana Paula Costa',
              document: '456.789.123-45',
              bank_name: 'Itaú'
            }
          }
        },
        {
          id: 'mock_tx_pix_3',
          account_id: accountId,
          amount: 150.00,
          date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
          description: 'PIX - Consulta psicológica',
          type: 'credit',
          category: 'transfer',
          payment_data: {
            payer: {
              name: 'Carlos Eduardo Ferreira',
              document: '321.654.987-12',
              bank_name: 'Santander'
            },
            end_to_end_id: 'E11111111202407221234567890111111'
          }
        }
      ];

      // Filter by date if provided
      let filteredTransactions = baseTransactions;
      if (from) {
        const fromDate = new Date(from);
        filteredTransactions = filteredTransactions.filter(t => new Date(t.date) >= fromDate);
      }
      if (to) {
        const toDate = new Date(to);
        filteredTransactions = filteredTransactions.filter(t => new Date(t.date) <= toDate);
      }

      return filteredTransactions;
    }

    try {
      const accessToken = await this.getAccessToken();
      
      let url = `${this.baseUrl}/transactions?account_id=${accountId}`;
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

      const data = await response.json() as { results: PluggyTransaction[] };
      return data.results;
    } catch (error) {
      console.error('Error getting Pluggy transactions:', error);
      throw error;
    }
  }

  /**
   * Store bank connection in our database after successful Pluggy connection
   */
  async storeBankConnection(therapistId: number, itemId: string, accountId: string): Promise<void> {
    try {
      // Get account details from Pluggy
      const accounts = await this.getAccounts(itemId);
      const account = accounts.find(acc => acc.id === accountId);
      
      if (!account) {
        throw new Error('Account not found in Pluggy response');
      }

      // Store in our database
      await pool.query(`
        INSERT INTO bank_connections (
          therapist_id, 
          pluggy_item_id, 
          pluggy_account_id,
          bank_name,
          bank_code,
          account_type,
          account_holder_name,
          status,
          last_sync_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (therapist_id, pluggy_account_id) 
        DO UPDATE SET 
          status = 'active',
          last_sync_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      `, [
        therapistId,
        itemId,
        accountId,
        account.bank_data.name,
        account.bank_data.code || null,
        account.subtype,
        account.name,
        'active',
        new Date()
      ]);

      console.log(`Bank connection stored for therapist ${therapistId}: ${account.bank_data.name}`);
    } catch (error) {
      console.error('Error storing bank connection:', error);
      throw error;
    }
  }

  /**
   * Sync transactions for a bank connection
   */
  async syncTransactions(bankConnectionId: number): Promise<void> {
    try {
      // Get bank connection details
      const connectionResult = await pool.query(
        'SELECT * FROM bank_connections WHERE id = $1 AND status = $2',
        [bankConnectionId, 'active']
      );

      if (connectionResult.rows.length === 0) {
        throw new Error('Bank connection not found or inactive');
      }

      const connection = connectionResult.rows[0];
      
      // Get transactions from Pluggy (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const transactions = await this.getTransactions(
        connection.pluggy_account_id,
        thirtyDaysAgo.toISOString().split('T')[0] // YYYY-MM-DD format
      );

      // Filter for incoming transactions only
      const incomingTransactions = transactions.filter(t => t.amount > 0);

      let newTransactionCount = 0;

      for (const transaction of incomingTransactions) {
        // Check if transaction already exists
        const existingTransaction = await pool.query(
          'SELECT id FROM bank_transactions WHERE pluggy_transaction_id = $1',
          [transaction.id]
        );

        if (existingTransaction.rows.length === 0) {
          // Store new transaction
          await this.storeTransaction(bankConnectionId, transaction);
          newTransactionCount++;
        }
      }

      // Update last sync time
      await pool.query(
        'UPDATE bank_connections SET last_sync_at = CURRENT_TIMESTAMP WHERE id = $1',
        [bankConnectionId]
      );

      console.log(`Synced ${newTransactionCount} new transactions for connection ${bankConnectionId}`);
    } catch (error) {
      console.error(`Error syncing transactions for connection ${bankConnectionId}:`, error);
      
      // Update error count and status
      await pool.query(`
        UPDATE bank_connections 
        SET error_count = error_count + 1,
            last_error = $1,
            status = CASE WHEN error_count > 5 THEN 'error' ELSE status END
        WHERE id = $2
      `, [error instanceof Error ? error.message : String(error), bankConnectionId]);
      
      throw error;
    }
  }

  /**
   * Store a single transaction in our database
   */
  private async storeTransaction(bankConnectionId: number, transaction: PluggyTransaction): Promise<void> {
    try {
      const transactionType = this.determineTransactionType(transaction);
      
      await pool.query(`
        INSERT INTO bank_transactions (
          bank_connection_id,
          pluggy_transaction_id,
          transaction_type,
          amount,
          description,
          transaction_date,
          pix_sender_name,
          pix_sender_cpf,
          pix_sender_bank,
          pix_end_to_end_id,
          sender_name,
          sender_document,
          sender_bank,
          raw_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [
        bankConnectionId,
        transaction.id,
        transactionType,
        transaction.amount,
        transaction.description,
        new Date(transaction.date),
        transaction.payment_data?.payer?.name || null,
        transaction.payment_data?.payer?.document || null,
        transaction.payment_data?.payer?.bank_name || null,
        transaction.payment_data?.end_to_end_id || null,
        transaction.payment_data?.payer?.name || null,
        transaction.payment_data?.payer?.document || null,
        transaction.payment_data?.payer?.bank_name || null,
        JSON.stringify(transaction)
      ]);
    } catch (error) {
      console.error('Error storing transaction:', error);
      throw error;
    }
  }

  /**
   * Determine transaction type from Pluggy transaction data
   */
  private determineTransactionType(transaction: PluggyTransaction): string {
    if (transaction.payment_data?.end_to_end_id) {
      return 'pix';
    }
    if (transaction.type?.toLowerCase().includes('ted')) {
      return 'ted';
    }
    if (transaction.type?.toLowerCase().includes('doc')) {
      return 'doc';
    }
    if (transaction.type?.toLowerCase().includes('debit')) {
      return 'debit';
    }
    return 'other';
  }

  /**
   * Sync all active bank connections for a therapist
   */
  async syncAllConnectionsForTherapist(therapistId: number): Promise<void> {
    try {
      const connections = await pool.query(
        'SELECT id FROM bank_connections WHERE therapist_id = $1 AND status = $2',
        [therapistId, 'active']
      );

      console.log(`Syncing ${connections.rows.length} connections for therapist ${therapistId}`);

      for (const connection of connections.rows) {
        try {
          await this.syncTransactions(connection.id);
        } catch (error) {
          console.error(`Failed to sync connection ${connection.id}:`, error);
          // Continue with other connections even if one fails
        }
      }
    } catch (error) {
      console.error(`Error syncing connections for therapist ${therapistId}:`, error);
      throw error;
    }
  }

  /**
   * Get unmatched transactions for a therapist with potential patient matches
   */
  async getUnmatchedTransactionsWithSuggestions(therapistId: number) {
    try {
      const result = await pool.query(`
        SELECT * FROM unmatched_transactions_with_suggestions 
        WHERE therapist_id = $1 
        ORDER BY transaction_date DESC, match_confidence DESC
      `, [therapistId]);

      return result.rows;
    } catch (error) {
      console.error('Error getting unmatched transactions:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
export const pluggyService = new PluggyService();