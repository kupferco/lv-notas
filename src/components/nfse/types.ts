// src/components/nfse/types.ts

export interface CertificateStatus {
  hasValidCertificate: boolean;
  status: 'not_uploaded' | 'uploaded' | 'expired' | 'invalid';
  expiresAt?: string;
  expiresIn30Days?: boolean;
  validationStatus?: 'idle' | 'validating' | 'validated' | 'error';
  validationError?: string;
  certificateInfo?: {
    commonName: string;
    issuer: string;
    cnpj?: string;
    companyName?: string;
    autoRegistered?: boolean;
    registrationError?: string;
  };
}

export interface NFSeSettings {
  serviceCode: string;
  taxRate: number;
  defaultServiceDescription: string;
  // issWithholding: boolean;
  additionalInfo?: string;
  isConfigured?: boolean;
}

export interface NFSeSettingsResponse {
  settings: NFSeSettings;
  isConfigured?: boolean;
}

export interface SetupStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  action?: () => void;
}

export interface TestInvoiceResult {
  invoiceId: string;
  status: string;
  pdfUrl?: string;
  xmlUrl?: string;
  error?: string;
}

export interface ConnectionStatus {
  connected: boolean;
  provider: string;
  environment: string;
  error?: string;
}

export interface CertificateUploadResponse {
  message: string;
  certificateInfo: {
    commonName: string;
    issuer: string;
    expiresAt: Date;
    isValid: boolean;
    cnpj?: string;
    companyName?: string;
    autoRegistered?: boolean;
    companyId?: string;
  };
}