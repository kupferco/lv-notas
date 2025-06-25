import type { Patient, Session, Therapist } from "../types";
import { getGoogleAccessToken, auth, getCurrentUser, isDevelopment } from "../config/firebase";

const API_URL = isDevelopment ? "http://localhost:3000" : process.env.EXPO_PUBLIC_SAFE_PROXY_URL;
const API_KEY = process.env.SAFE_PROXY_API_KEY;

export const getAuthHeaders = async () => {
  let authHeader = "";

  // Always get Firebase token for both development and production
  const user = getCurrentUser();
  if (user) {
    try {
      const token = await user.getIdToken();
      authHeader = `Bearer ${token}`;
      console.log("Firebase token obtained:", token ? "✅" : "❌");
    } catch (error) {
      console.error("Error getting Firebase token:", error);
    }
  } else {
    console.log("No authenticated user found");
  }

  // Get Google access token for calendar operations
  const googleAccessToken = getGoogleAccessToken();

  const headers: Record<string, string> = {
    "X-API-Key": API_KEY || "",
    "Content-Type": "application/json",
  };

  // Add Firebase token for authentication
  if (authHeader) {
    headers["Authorization"] = authHeader;
  } else {
    console.warn("No Firebase token available - API calls may fail");
  }

  // Add Google access token for calendar operations
  if (googleAccessToken) {
    headers["X-Google-Access-Token"] = googleAccessToken;
    console.log("Google access token included in headers");
  } else {
    console.warn("No Google access token available - calendar operations may fail");
  }

  return headers;
};

// Get current therapist email (from localStorage or auth)
const getCurrentTherapistEmail = () => {
  if (isDevelopment) {
    // In development, get from localStorage (set during onboarding)
    return localStorage.getItem("therapist_email") || localStorage.getItem("currentTherapist") || null;
  }

  // In production, get from Firebase auth
  const user = getCurrentUser();
  return user?.email || null;
};

export const apiService = {
  async getPatients(therapistEmail?: string): Promise<Patient[]> {
    const headers = await getAuthHeaders();
    const email = therapistEmail || getCurrentTherapistEmail();

    if (!email) {
      throw new Error("No therapist email provided");
    }

    console.log("getPatients API call with email:", email);
    const response = await fetch(`${API_URL}/api/patients?therapistEmail=${encodeURIComponent(email)}`, { headers });
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
  async getTherapistByEmail(email: string): Promise<Therapist | null> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/therapists/${encodeURIComponent(email)}`, { headers });
      if (response.status === 404) {
        return null; // Therapist doesnt exist
      }
      if (!response.ok) {
        throw new Error("Failed to fetch therapist");
      }
      return response.json();
    } catch (error) {
      console.error("Error fetching therapist:", error);
      return null;
    }
  },

  async createTherapist(therapist: { name: string; email: string; googleCalendarId: string }): Promise<Therapist> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/therapists`, {
      method: "POST",
      headers,
      body: JSON.stringify(therapist),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create therapist: ${errorText}`);
    }
    return response.json();
  },

  async updateTherapistCalendar(email: string, calendarId: string): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/therapists/${encodeURIComponent(email)}/calendar`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ googleCalendarId: calendarId }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update therapist calendar: ${errorText}`);
    }
  },

  async createPatient(patient: { nome: string; email: string; telefone: string; therapistEmail: string }): Promise<Patient> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/patients`, {
      method: "POST",
      headers,
      body: JSON.stringify(patient),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create patient: ${errorText}`);
    }
    return response.json();
  },

  // Test connection endpoint
  async testConnection(): Promise<{ message: string }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/test`, { headers });
    if (!response.ok) throw new Error("Failed to test connection");
    return response.json();
  },

  // Helper method to get current therapist email
  getCurrentTherapistEmail,
  getAuthHeaders,
};
