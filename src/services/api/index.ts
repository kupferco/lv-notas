// src/services/api/index.ts - Main API Service Entry Point

export { patientService } from './patient-service';
export { sessionService } from './session-service';
export { therapistService } from './therapist-service';
export { calendarService } from './calendar-service';
export { billingService } from './billing-service';
export { nfseService } from './nfse-service';
export { baseApiService } from './base-service';
export { bankingService } from './banking-service';

// Re-export types for convenience
export type { 
  CertificateStatus, 
  NFSeSettings, 
  CompanyData, 
  TestInvoiceData, 
  InvoiceResult, 
  ConnectionStatus, 
  ServiceCode, 
  Invoice 
} from './nfse-service';

// Re-export for backward compatibility
import { patientService } from './patient-service';
import { sessionService } from './session-service';
import { therapistService } from './therapist-service';
import { calendarService } from './calendar-service';
import { billingService } from './billing-service';
import { nfseService } from './nfse-service';
import { baseApiService } from './base-service';

// Combined API service for backward compatibility
export const apiService = {
  // Patient methods
  ...patientService,
  
  // Session methods  
  ...sessionService,
  
  // Therapist methods
  ...therapistService,
  
  // Calendar methods
  ...calendarService,
  
  // Billing methods
  ...billingService,
  
  // NFS-e methods
  ...nfseService,
  
  // Base utility methods
  ...baseApiService,
};

// Individual services for new code (preferred for new components)
export const api = {
  patients: patientService,
  sessions: sessionService,
  therapists: therapistService,
  calendar: calendarService,
  billing: billingService,
  nfse: nfseService,
  base: baseApiService,
};

// Default export for compatibility
export default apiService;