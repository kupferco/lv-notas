// src/types/pluggy.ts

interface PluggyConnector {
  id: number;
  name: string;
  primaryColor: string;
  institutionUrl: string;
  country: string;
  type: string;
  credentials: PluggyCredential[];
  imageUrl: string;
  hasMFA: boolean;
  oauth?: boolean;
  health: {
    status: string;
    stage: string | null;
  };
  products: string[];
  createdAt: string;
  isSandbox: boolean;
  isOpenFinance: boolean;
  updatedAt: string;
  supportsPaymentInitiation: boolean;
  supportsScheduledPayments: boolean;
  supportsSmartTransfers: boolean;
  supportsBoletoManagement: boolean;
}

interface PluggyCredential {
  validation: string;
  validationMessage: string;
  label: string;
  name: string;
  type: string;
  placeholder: string;
  optional: boolean;
}

interface PluggyAccount {
  id: string;
  type: string;
  subtype: string;
  name: string;
  balance: number;
  currencyCode: string;
  itemId: string;
  number: string;
  createdAt: string;
  updatedAt: string;
  marketingName: string;
  taxNumber: string | null;
  owner: string | null;
  bankData: PluggyBankData | null;
  creditData: PluggyCreditData | null;
}

interface PluggyBankData {
  transferNumber: string;
  closingBalance: number;
  automaticallyInvestedBalance: number;
  overdraftContractedLimit: number | null;
  overdraftUsedLimit: number | null;
  unarrangedOverdraftAmount: number | null;
}

interface PluggyCreditData {
  level: string;
  brand: string;
  balanceCloseDate: string;
  balanceDueDate: string;
  availableCreditLimit: number;
  balanceForeignCurrency: number | null;
  minimumPayment: number;
  creditLimit: number;
  isLimitFlexible: boolean;
  holderType: string;
  status: string;
  disaggregatedCreditLimits: any | null;
  additionalCards: any | null;
}

interface PluggyTransaction {
  id: string;
  accountId: string;
  amount: number;
  date: string;
  description: string;
  type: string;
  category?: string;
  paymentData?: {
    payer?: {
      name?: string;
      document?: string;
      bankName?: string;
    };
    receiver?: {
      name?: string;
      document?: string;
    };
    referenceNumber?: string;
    endToEndId?: string;
  };
}

interface PluggyConnectTokenResponse {
  accessToken: string;
}

interface PluggyItemResponse {
  id: string;
  connector: PluggyConnector;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// API Response wrappers
interface PluggyListResponse<T> {
  total: number;
  totalPages: number;
  page: number;
  results: T[];
}

// Updated service interfaces
export {
  PluggyConnector,
  PluggyCredential,
  PluggyAccount,
  PluggyBankData,
  PluggyCreditData,
  PluggyTransaction,
  PluggyConnectTokenResponse,
  PluggyItemResponse,
  PluggyListResponse
};