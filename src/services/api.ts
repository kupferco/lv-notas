import { Patient, Session, Therapist } from "../types";
import { auth } from "../config/firebase";

// For development, use localhost
const isDevelopment = window.location.hostname.includes("localhost");
const API_URL = isDevelopment ? process.env.EXPO_PUBLIC_LOCAL_URL : process.env.EXPO_PUBLIC_SAFE_PROXY_URL;
const API_KEY = process.env.SAFE_PROXY_API_KEY;

const getAuthHeaders = async () => {
  // Skip Firebase auth for local development
  let authHeader = "";
  if (!isDevelopment) {
    const user = auth?.currentUser;
    const token = user ? await user.getIdToken() : "";
    authHeader = token ? `Bearer ${token}` : "";
  }
  
  return {
    "X-API-Key": API_KEY || "",
    "Authorization": authHeader,
    "Content-Type": "application/json",
  };
};

export const apiService = {
  async getPatients(): Promise<Patient[]> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/patients`, { headers });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response:", errorText);
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

  // New therapist methods
  async getTherapistByEmail(email: string): Promise<Therapist | null> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/therapists/by-email/${encodeURIComponent(email)}`, { headers });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error("Failed to fetch therapist");
    return response.json();
  },

  async createTherapist(therapist: Omit<Therapist, "id">): Promise<Therapist> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/therapists`, {
      method: "POST",
      headers,
      body: JSON.stringify(therapist),
    });
    if (!response.ok) throw new Error("Failed to create therapist");
    return response.json();
  },

  async updateTherapist(id: string, updates: Partial<Therapist>): Promise<Therapist> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/therapists/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error("Failed to update therapist");
    return response.json();
  },
};