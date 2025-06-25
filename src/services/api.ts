// src/services/api.ts
import type { Patient, Session, Therapist } from "../types";
import { getCurrentUser, isDevelopment, getGoogleAccessToken } from "../config/firebase";

const API_URL = isDevelopment ? "http://localhost:3000" : process.env.EXPO_PUBLIC_SAFE_PROXY_URL;
const API_KEY = process.env.SAFE_PROXY_API_KEY;

const getAuthHeaders = async () => {
  console.log("=== getAuthHeaders Debug ===");

  let authHeader = "";

  // Always get real Firebase token
  const user = getCurrentUser();
  console.log("getCurrentUser():", user?.email || 'none');

  if (user) {
    try {
      console.log("User found, getting token...");
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
  console.log("Google access token available:", !!googleAccessToken);

  const headers: Record<string, string> = {
    "X-API-Key": API_KEY || "",
    "Content-Type": "application/json",
  };

  // Add Firebase token for authentication
  if (authHeader) {
    headers["Authorization"] = authHeader;
    console.log("Firebase token included in headers");
  } else {
    console.warn("No Firebase token available - API calls may fail");
  }

  // Add Google access token for calendar operations
  if (googleAccessToken) {
    headers["X-Google-Access-Token"] = googleAccessToken;
    console.log("Google access token included in headers");
  }

  return headers;
};

// Helper function to check if we can make authenticated API calls
const canMakeAuthenticatedCall = (): boolean => {
  if (isDevelopment) {
    // In development, just need a user
    const hasUser = !!getCurrentUser();
    console.log("🚧 Development mode - can make authenticated call:", hasUser);
    return hasUser;
  }
  // In production, need both Firebase user and Google access token
  const canCall = !!(getCurrentUser() && getGoogleAccessToken());
  console.log("🔥 Production mode - can make authenticated call:", canCall);
  return canCall;
};

// Get current therapist email (from localStorage or auth)
const getCurrentTherapistEmail = () => {
  if (isDevelopment) {
    // In development, get from localStorage (set during onboarding)
    const email = localStorage.getItem("therapist_email") || localStorage.getItem("currentTherapist") || null;
    console.log("🚧 Development mode - therapist email from localStorage:", email);
    return email;
  }

  // In production, get from Firebase auth
  const user = getCurrentUser();
  const email = user?.email || null;
  console.log("🔥 Production mode - therapist email from Firebase:", email);
  return email;
};

export const apiService = {
  async getPatients(therapistEmail?: string): Promise<Patient[]> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for API calls");
    }

    const headers = await getAuthHeaders();
    const email = therapistEmail || getCurrentTherapistEmail();

    if (!email) {
      throw new Error("No therapist email provided");
    }

    console.log("📞 getPatients API call with email:", email);
    const response = await fetch(`${API_URL}/api/patients?therapistEmail=${encodeURIComponent(email)}`, { headers });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ getPatients error response:", errorText);
      throw new Error(`Failed to fetch patients. Status: ${response.status}, Error: ${errorText}`);
    }
    return response.json();
  },

  async getPatientSessions(patientId: string): Promise<Session[]> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for API calls");
    }

    const headers = await getAuthHeaders();
    const therapistEmail = getCurrentTherapistEmail();

    if (!therapistEmail) {
      throw new Error("No therapist email available");
    }

    console.log("📞 getPatientSessions API call");
    const response = await fetch(`${API_URL}/api/sessions/${patientId}?therapistEmail=${encodeURIComponent(therapistEmail)}`, { headers });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ getPatientSessions error response:", errorText);
      throw new Error(`Failed to fetch sessions. Status: ${response.status}, Error: ${errorText}`);
    }
    return response.json();
  },

  async getCalendars(): Promise<any[]> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for calendar operations");
    }

    const headers = await getAuthHeaders();
    console.log("📞 getCalendars API call");
    const response = await fetch(`${API_URL}/api/calendars`, { headers });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ getCalendars error response:", errorText);
      throw new Error(`Failed to fetch calendars. Status: ${response.status}, Error: ${errorText}`);
    }
    return response.json();
  },

  async submitCheckIn(patientId: string, sessionId: string): Promise<void> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for API calls");
    }

    const headers = await getAuthHeaders();
    console.log("📞 submitCheckIn API call");
    const response = await fetch(`${API_URL}/api/checkin`, {
      method: "POST",
      headers,
      body: JSON.stringify({ patientId, sessionId }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ submitCheckIn error response:", errorText);
      throw new Error(`Failed to submit check-in. Status: ${response.status}, Error: ${errorText}`);
    }
  },

  // Therapist methods
  async getTherapistByEmail(email: string): Promise<Therapist | null> {
    try {
      if (!canMakeAuthenticatedCall()) {
        console.log("⚠️ Authentication not ready, skipping therapist fetch");
        return null;
      }

      const headers = await getAuthHeaders();
      console.log("📞 getTherapistByEmail API call for:", email);
      const response = await fetch(`${API_URL}/api/therapists/${encodeURIComponent(email)}`, { headers });
      if (response.status === 404) {
        console.log("📭 Therapist not found (404)");
        return null; // Therapist doesn't exist
      }
      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ getTherapistByEmail error response:", errorText);
        throw new Error(`Failed to fetch therapist. Status: ${response.status}, Error: ${errorText}`);
      }
      const therapist = await response.json();
      console.log("✅ getTherapistByEmail success:", therapist);
      return therapist;
    } catch (error) {
      console.error("❌ Error fetching therapist:", error);
      return null;
    }
  },

  async createTherapist(therapist: { name: string; email: string; googleCalendarId: string }): Promise<Therapist> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for API calls");
    }

    const headers = await getAuthHeaders();
    console.log("📞 createTherapist API call:", therapist);
    const response = await fetch(`${API_URL}/api/therapists`, {
      method: "POST",
      headers,
      body: JSON.stringify(therapist),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ createTherapist error response:", errorText);
      throw new Error(`Failed to create therapist: ${errorText}`);
    }
    const result = await response.json();
    console.log("✅ createTherapist success:", result);
    return result;
  },

  async updateTherapistCalendar(email: string, calendarId: string): Promise<void> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for API calls");
    }

    const headers = await getAuthHeaders();
    console.log("📞 updateTherapistCalendar API call:", { email, calendarId });
    const response = await fetch(`${API_URL}/api/therapists/${encodeURIComponent(email)}/calendar`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ googleCalendarId: calendarId }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ updateTherapistCalendar error response:", errorText);
      throw new Error(`Failed to update therapist calendar: ${errorText}`);
    }
    console.log("✅ updateTherapistCalendar success");
  },

  async createPatient(patient: { nome: string; email: string; telefone: string; therapistEmail: string }): Promise<Patient> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for API calls");
    }

    const headers = await getAuthHeaders();
    console.log("📞 createPatient API call:", patient);
    const response = await fetch(`${API_URL}/api/patients`, {
      method: "POST",
      headers,
      body: JSON.stringify(patient),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ createPatient error response:", errorText);
      throw new Error(`Failed to create patient: ${errorText}`);
    }
    const result = await response.json();
    console.log("✅ createPatient success:", result);
    return result;
  },

  async getCalendarEvents(therapistEmail: string): Promise<any[]> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for calendar operations");
    }

    const headers = await getAuthHeaders();
    console.log("📞 getCalendarEvents API call for:", therapistEmail);
    const response = await fetch(`${API_URL}/api/calendar-events?therapistEmail=${encodeURIComponent(therapistEmail)}`, { headers });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ getCalendarEvents error response:", errorText);
      throw new Error(`Failed to fetch calendar events. Status: ${response.status}, Error: ${errorText}`);
    }
    return response.json();
  },

  async updatePatient(patientId: string, patient: { nome: string; email?: string; telefone?: string }): Promise<Patient> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for API calls");
    }

    const headers = await getAuthHeaders();
    console.log("📞 updatePatient API call:", { patientId, patient });
    const response = await fetch(`${API_URL}/api/patients/${patientId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(patient),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ updatePatient error response:", errorText);
      throw new Error(`Failed to update patient: ${errorText}`);
    }
    const result = await response.json();
    console.log("✅ updatePatient success:", result);
    return result;
  },

  async deletePatient(patientId: string): Promise<void> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for API calls");
    }

    const headers = await getAuthHeaders();
    console.log("📞 deletePatient API call:", patientId);
    const response = await fetch(`${API_URL}/api/patients/${patientId}`, {
      method: "DELETE",
      headers,
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ deletePatient error response:", errorText);
      throw new Error(`Failed to delete patient: ${errorText}`);
    }
    console.log("✅ deletePatient success");
  },

  // Add these methods to your existing apiService object in src/services/api.ts

  // Sessions management
  async getSessions(therapistEmail: string): Promise<Session[]> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/sessions?therapistEmail=${encodeURIComponent(therapistEmail)}`, {
      headers
    });
    if (!response.ok) throw new Error("Failed to fetch sessions");
    return response.json();
  },

  async createSession(sessionData: {
    patientId: string;
    date: string;
    status: string;
    therapistEmail: string;
  }): Promise<Session> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/sessions`, {
      method: "POST",
      headers,
      body: JSON.stringify(sessionData),
    });
    if (!response.ok) throw new Error("Failed to create session");
    return response.json();
  },

  async updateSession(sessionId: string, updateData: {
    patientId?: string;
    date?: string;
    status?: string;
  }): Promise<Session> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/sessions/${sessionId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(updateData),
    });
    if (!response.ok) throw new Error("Failed to update session");
    return response.json();
  },

  // Test connection endpoint
  async testConnection(): Promise<{ message: string }> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for API calls");
    }

    const headers = await getAuthHeaders();
    console.log("📞 testConnection API call");
    const response = await fetch(`${API_URL}/api/test`, { headers });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ testConnection error response:", errorText);
      throw new Error(`Failed to test connection. Status: ${response.status}, Error: ${errorText}`);
    }
    const result = await response.json();
    console.log("✅ testConnection success:", result);
    return result;
  },

  // Helper methods
  getCurrentTherapistEmail,
  canMakeAuthenticatedCall,
  getAuthHeaders,
};