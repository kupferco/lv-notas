import type { Patient, Session, Therapist } from "../types";
import { auth } from "../config/firebase";

// For development, use localhost
const isDevelopment = window.location.hostname.includes("localhost");
const API_URL = isDevelopment ? "http://localhost:3000" : process.env.EXPO_PUBLIC_SAFE_PROXY_URL;
const API_KEY = process.env.SAFE_PROXY_API_KEY;

const getAuthHeaders = async () => {
  // Skip Firebase auth for local development
  let authHeader = '';
  if (!isDevelopment) {
    const user = auth?.currentUser;
    const token = user ? await user.getIdToken() : "";
    authHeader = token ? `Bearer ${token}` : '';
  }

  const headers: Record<string, string> = {
    "X-API-Key": API_KEY || '',
    "Content-Type": "application/json",
  };

  // Only add Authorization header if we have a token
  if (authHeader) {
    headers["Authorization"] = authHeader;
  }

  return headers;
};

// Get current therapist email (from localStorage or auth)
const getCurrentTherapistEmail = () => {
  if (isDevelopment) {
    // In development, get from localStorage (set during onboarding)
    return localStorage.getItem('currentTherapist') || null;
  }
  return auth?.currentUser?.email || null;
};

export const apiService = {
  async getPatients(therapistEmail: string): Promise<Patient[]> {
    const headers = await getAuthHeaders();

    if (!therapistEmail) {
      throw new Error("No therapist email provided");
    }

    console.log('getPatients API call with email:', therapistEmail);
    const response = await fetch(`${API_URL}/api/patients?therapistEmail=${encodeURIComponent(therapistEmail)}`, { headers });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response:", errorText);
      throw new Error(`Failed to fetch patients. Status: ${response.status}, Error: ${errorText}`);
    }
    return response.json();
  },

  async getPatientSessions(patientId: string): Promise<Session[]> {
    const headers = await getAuthHeaders();
    const therapistEmail = getCurrentTherapistEmail();

    if (!therapistEmail) {
      throw new Error("No therapist email available");
    }

    const response = await fetch(`${API_URL}/api/sessions/${patientId}?therapistEmail=${encodeURIComponent(therapistEmail)}`, { headers });
    if (!response.ok) throw new Error("Failed to fetch sessions");
    return response.json();
  },

  async getCalendars(): Promise<any[]> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/calendars`, { headers });
    if (!response.ok) throw new Error("Failed to fetch calendars");
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

  // Therapist methods
  async getTherapistByEmail(email: string): Promise<any> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/therapists/${encodeURIComponent(email)}`, { headers });
    if (!response.ok) {
      if (response.status === 404) {
        return null; // Therapist doesn't exist
      }
      throw new Error("Failed to fetch therapist");
    }
    return response.json();
  },

  async createTherapist(therapist: { name: string; email: string; googleCalendarId: string }): Promise<any> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/therapists`, {
      method: "POST",
      headers,
      body: JSON.stringify(therapist),
    });
    if (!response.ok) throw new Error("Failed to create therapist");
    return response.json();
  },

  async updateTherapistCalendar(email: string, calendarId: string): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/therapists/${encodeURIComponent(email)}/calendar`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ googleCalendarId: calendarId }),
    });
    if (!response.ok) throw new Error("Failed to update therapist calendar");
  },

  async createPatient(patient: { nome: string; email: string; telefone: string; therapistEmail: string }): Promise<any> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/patients`, {
      method: "POST",
      headers,
      body: JSON.stringify(patient),
    });
    if (!response.ok) throw new Error("Failed to create patient");
    return response.json();
  },
};