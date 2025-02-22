import { Patient, Session } from "../types";
import { auth } from "../config/firebase";

// For development, use localhost
const isDevelopment = window.location.hostname.includes('localhost');
const API_URL = isDevelopment ? process.env.EXPO_PUBLIC_LOCAL_URL : process.env.EXPO_PUBLIC_SAFE_PROXY_URL;
const API_KEY = process.env.SAFE_PROXY_API_KEY;

const getAuthHeaders = async () => {
  // Skip Firebase auth for local development
  let authHeader = '';
  if (!isDevelopment) {
    const user = auth?.currentUser;
    const token = user ? await user.getIdToken() : "";
    authHeader = token ? `Bearer ${token}` : "";
  }

  // console.log('API URL:', API_URL);
  // console.log('API Key:', API_KEY ? 'Present' : 'Missing');

  return {
    "X-API-Key": API_KEY || '',
    "Authorization": authHeader,
    "Content-Type": "application/json",
  };
};

export const apiService = {
  async getPatients(): Promise<Patient[]> {
    const headers = await getAuthHeaders();
    console.log('API URL:', `${API_URL}/api/patients`);
    // console.log('Headers:', headers);
    const response = await fetch(`${API_URL}/api/patients`, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Failed to fetch patients. Status: ${response.status}, Error: ${errorText}`);
    }
    return response.json();
  },

  async getPatientSessions(patientId: string): Promise<Session[]> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/sessions/${patientId}`, { headers });
    if (!response.ok) throw new Error("Failed to fetch sessions");
    return response.json();
  },

  async submitCheckIn(patientId: string, sessionId: string): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/checkin`, {
      method: "POST",
      headers,
      body: JSON.stringify({ patientId, sessionId }),
    });
    if (!response.ok) throw new Error("Failed to submit check-in");
  },
};