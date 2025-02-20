import { apiService } from '../services/api';

export const testConnection = async () => {
  try {
    // Test patients endpoint
    console.log('Testing connection...');
    console.log('Environment:', window.location.hostname.includes('localhost') ? 'Development' : 'Production');
    
    const patients = await apiService.getPatients();
    console.log('Connection successful! Found', patients.length, 'patients');
    return {
      success: true,
      environment: window.location.hostname.includes('localhost') ? 'Development' : 'Production',
      patientsCount: patients.length
    };
  } catch (error) {
    console.error('Connection test failed:', error);
    return {
      success: false,
      environment: window.location.hostname.includes('localhost') ? 'Development' : 'Production',
      error: error.message
    };
  }
};
