// src/services/api.ts - Backward Compatibility Layer

// Import everything from the new modular API structure
export * from './api/index';

// Re-export the main apiService as default for existing imports
export { apiService as default } from './api/index';

// Also export the new modular api object for future use
export { api } from './api/index';

/*
 * MIGRATION GUIDE FOR EXISTING CODE:
 * 
 * Old usage (still works):
 * import { apiService } from '../services/api';
 * apiService.getPatients();
 * 
 * New usage (recommended for new code):
 * import { api } from '../services/api';
 * api.patients.getPatients();
 * 
 * Or specific service imports:
 * import { patientService } from '../services/api';
 * patientService.getPatients();
 */