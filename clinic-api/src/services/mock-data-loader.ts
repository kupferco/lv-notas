// src/services/mock-data-loader.ts
import { promises as fs } from 'fs';
import path from 'path';
import { PluggyAccount, PluggyTransaction, PluggyItemResponse } from '../types/pluggy.js';

export class MockDataLoader {
  private mockDataPath: string;

  constructor() {
    this.mockDataPath = path.join(process.cwd(), 'db', 'banking-mock');
  }

  /**
   * Load mock items (bank connections) for a therapist - mimics Pluggy's /items response
   */
  async getMockItems(therapistId: string): Promise<PluggyItemResponse[]> {
    try {
      const therapistDir = path.join(this.mockDataPath, `therapist-${therapistId}`);
      const itemsPath = path.join(therapistDir, 'items.json');
      
      const itemsData = await fs.readFile(itemsPath, 'utf-8');
      const items = JSON.parse(itemsData);
      console.log(`🎭 Loaded ${items.length} mock items for therapist ${therapistId}`);
      return items;
    } catch (error) {
      console.log(`🎭 items.json not found for therapist ${therapistId}, using fallback`);
      return this.getFallbackItems();
    }
  }

  /**
   * Load mock accounts for an item - mimics Pluggy's /accounts response
   */
  async getMockAccounts(therapistId: string, itemId: string): Promise<PluggyAccount[]> {
    try {
      const therapistDir = path.join(this.mockDataPath, `therapist-${therapistId}`);
      const accountsPath = path.join(therapistDir, 'accounts.json');
      
      const accountsData = await fs.readFile(accountsPath, 'utf-8');
      const accounts = JSON.parse(accountsData);
      console.log(`🎭 Loaded ${accounts.length} mock accounts for therapist ${therapistId}`);
      return accounts.filter((acc: PluggyAccount) => acc.itemId === itemId);
    } catch (error) {
      console.log(`🎭 accounts.json not found for therapist ${therapistId}, using fallback`);
      return this.getFallbackAccounts(itemId);
    }
  }

  /**
   * Load mock transactions for an account - mimics Pluggy's /transactions response
   * Note: Date filtering is NOT implemented for mock data - manually curate JSON files instead
   */
  async getMockTransactions(
    therapistId: string, 
    accountId: string,
    from?: string,
    to?: string
  ): Promise<PluggyTransaction[]> {
    try {
      const therapistDir = path.join(this.mockDataPath, `therapist-${therapistId}`);
      const transactionsPath = path.join(therapistDir, 'transactions.json');
      
      const transactionsData = await fs.readFile(transactionsPath, 'utf-8');
      let transactions = JSON.parse(transactionsData) as PluggyTransaction[];
      
      // Filter by account ID only - date filtering is handled by manual curation
      transactions = transactions.filter(t => t.accountId === accountId);

      // NOTE: Intentionally NOT implementing date filtering for mock data
      // Real Pluggy handles date filtering automatically
      // For mock testing, manually curate the JSON files to include only the date range you want to test

      console.log(`🎭 Loaded ${transactions.length} mock transactions for account ${accountId} (date filtering skipped for mock)`);
      return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.log(`🎭 transactions.json not found for therapist ${therapistId}, using fallback`);
      return this.getFallbackTransactions(accountId);
    }
  }

  /**
   * Create mock data directory structure for a therapist
   */
  async createMockDataStructure(therapistId: string): Promise<void> {
    const therapistDir = path.join(this.mockDataPath, `therapist-${therapistId}`);
    
    try {
      await fs.mkdir(therapistDir, { recursive: true });

      // Create items.json
      const itemsPath = path.join(therapistDir, 'items.json');
      try {
        await fs.access(itemsPath);
      } catch {
        await fs.writeFile(itemsPath, JSON.stringify(this.getFallbackItems(), null, 2));
        console.log(`Created items.json for therapist ${therapistId}`);
      }

      // Create accounts.json
      const accountsPath = path.join(therapistDir, 'accounts.json');
      try {
        await fs.access(accountsPath);
      } catch {
        await fs.writeFile(accountsPath, JSON.stringify(this.getFallbackAccounts('mock_item_1'), null, 2));
        console.log(`Created accounts.json for therapist ${therapistId}`);
      }

      // Create transactions.json
      const transactionsPath = path.join(therapistDir, 'transactions.json');
      try {
        await fs.access(transactionsPath);
      } catch {
        await fs.writeFile(transactionsPath, JSON.stringify(this.getFallbackTransactions('mock_account_1'), null, 2));
        console.log(`Created transactions.json for therapist ${therapistId}`);
      }

      console.log(`Mock data structure created for therapist ${therapistId} at: ${therapistDir}`);
    } catch (error) {
      console.error(`Error creating mock data structure for therapist ${therapistId}:`, error);
      throw error;
    }
  }

  /**
   * Fallback items data - mimics Pluggy's /items response
   */
  private getFallbackItems(): PluggyItemResponse[] {
    return [
      {
        id: 'mock_item_1',
        connector: {
          id: 611,
          name: 'Banco do Brasil',
          primaryColor: '1194F6',
          institutionUrl: 'https://www.bb.com.br/docs/pub/inst/img/LogoBB.svg',
          country: 'BR',
          type: 'PERSONAL_BANK',
          credentials: [],
          imageUrl: 'https://cdn.pluggy.ai/assets/connector-icons/211.svg',
          hasMFA: false,
          oauth: true,
          health: { status: 'ONLINE', stage: null },
          products: ['ACCOUNTS', 'TRANSACTIONS', 'IDENTITY', 'CREDIT_CARDS', 'PAYMENT_DATA'],
          createdAt: '2023-09-01T18:05:09.145Z',
          isSandbox: false,
          isOpenFinance: true,
          updatedAt: new Date().toISOString(),
          supportsPaymentInitiation: true,
          supportsScheduledPayments: true,
          supportsSmartTransfers: false,
          supportsBoletoManagement: false
        },
        status: 'UPDATED',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: new Date().toISOString()
      }
    ];
  }

  /**
   * Fallback accounts data - mimics Pluggy's /accounts response
   */
  private getFallbackAccounts(itemId: string): PluggyAccount[] {
    return [
      {
        id: 'mock_account_1',
        type: 'BANK',
        subtype: 'CHECKING_ACCOUNT',
        name: 'Conta Corrente',
        balance: 15420.50,
        currencyCode: 'BRL',
        itemId: itemId,
        number: '0001/12345-0',
        createdAt: '2025-08-01T22:11:55.778Z',
        updatedAt: new Date().toISOString(),
        marketingName: 'GOLD Conta Corrente',
        taxNumber: '416.799.495-00',
        owner: 'Dr. João Silva Terapeuta',
        bankData: {
          transferNumber: '123/0001/12345-0',
          closingBalance: 15420.50,
          automaticallyInvestedBalance: 1542.05,
          overdraftContractedLimit: null,
          overdraftUsedLimit: null,
          unarrangedOverdraftAmount: null
        },
        creditData: null
      }
    ];
  }

  /**
   * Fallback transactions data - mimics Pluggy's /transactions response
   */
  private getFallbackTransactions(accountId: string): PluggyTransaction[] {
    return [
      {
        id: 'bb_tx_20250801_001',
        accountId: accountId,
        amount: 600.00,
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'PIX RECEBIDO',
        type: 'credit',
        category: 'transfer',
        paymentData: {
          payer: {
            name: 'João Silva Santos',
            document: '123.456.789-01',
            bankName: 'Nubank'
          },
          endToEndId: 'E12345678202408011234567890123456'
        }
      },
      {
        id: 'bb_tx_20250729_002',
        accountId: accountId,
        amount: 300.00,
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'PIX RECEBIDO',
        type: 'credit',
        category: 'transfer',
        paymentData: {
          payer: {
            name: 'Maria Santos Oliveira',
            document: '987.654.321-09',
            bankName: 'Banco do Brasil'
          },
          endToEndId: 'E98765432202407291234567890987654'
        }
      },
      {
        id: 'bb_tx_20250731_003',
        accountId: accountId,
        amount: -500.00,
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'TRANSFERENCIA ENVIADA',
        type: 'debit',
        category: 'transfer',
        paymentData: undefined
      }
    ];
  }
}

// Export singleton instance
export const mockDataLoader = new MockDataLoader();