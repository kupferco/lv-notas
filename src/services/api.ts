// src/services/api.ts - Simplified API Service
import type { Patient, Session, Therapist } from "../types/index";
import { getCurrentUser, isDevelopment, getGoogleAccessToken } from "../config/firebase";
import { authService } from './authService';

const API_URL = isDevelopment ? "http://localhost:3000" : process.env.EXPO_PUBLIC_SAFE_PROXY_URL;
const API_KEY = process.env.SAFE_PROXY_API_KEY;

// Simplified getAuthHeaders
const getAuthHeaders = async (): Promise<Record<string, string>> => {
  console.log("📡 API call at", new Date().toISOString());

  let authHeader = "";

  // Try credential authentication first
  const sessionToken = authService.getSessionToken();
  if (sessionToken) {
    authHeader = `Bearer ${sessionToken}`;
    console.log("✅ Using credential session token");
  } else {
    // Fallback to Firebase during transition
    const user = getCurrentUser();
    if (user) {
      try {
        const firebaseToken = await user.getIdToken();
        authHeader = `Bearer ${firebaseToken}`;
        console.log("✅ Using Firebase token as fallback");
      } catch (error) {
        console.error("❌ Error getting Firebase token:", error);
      }
    }
  }

  // Get Google access token for calendar operations (with smart refresh)
  const googleAccessToken = await getGoogleAccessToken();

  // Build headers
  const headers: Record<string, string> = {
    "X-API-Key": API_KEY || "",
    "Content-Type": "application/json",
  };

  if (authHeader) {
    headers["Authorization"] = authHeader;
    console.log("✅ Authentication token included");
  } else {
    console.warn("⚠️ No authentication token available");
  }

  if (googleAccessToken) {
    headers["X-Calendar-Token"] = googleAccessToken;
    console.log("✅ Google access token included");
  } else {
    console.warn("⚠️ No valid Google access token available for calendar operations");
  }

  return headers;
};

// Simplified API call wrapper
const makeApiCall = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
};

// Helper to check if we can make authenticated calls
const canMakeAuthenticatedCall = (): boolean => {
  // Check credential authentication first
  const hasCredentialAuth = authService.isLoggedIn();
  if (hasCredentialAuth) {
    console.log("✅ Can make authenticated call - credential auth available");
    return true;
  }

  // Fallback to Firebase check
  const user = getCurrentUser();
  const canCall = !!user;
  console.log("🔥 Firebase auth available:", canCall);
  return canCall;
};

// Get current therapist email
const getCurrentTherapistEmail = () => {
  // Try credential authentication first
  const credentialUser = authService.getStoredUser();
  if (credentialUser?.email) {
    console.log("✅ Therapist email from credential auth:", credentialUser.email);
    return credentialUser.email;
  }

  // Fallback methods
  if (isDevelopment) {
    const email = localStorage.getItem("therapist_email") || localStorage.getItem("currentTherapist") || null;
    console.log("🚧 Development mode - therapist email from localStorage:", email);
    return email;
  }

  // Production fallback
  const user = getCurrentUser();
  const email = user?.email || null;
  console.log("🔥 Production mode - therapist email from Firebase:", email);
  return email;
};

export const apiService = {
  // ==========================================
  // PATIENT MANAGEMENT
  // ==========================================

  async getPatients(therapistEmail?: string): Promise<Patient[]> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for API calls");
    }

    const email = therapistEmail || getCurrentTherapistEmail();
    if (!email) {
      throw new Error("No therapist email provided");
    }

    console.log("📞 getPatients API call with email:", email);
    return makeApiCall(`/api/patients?therapistEmail=${encodeURIComponent(email)}`);
  },

  async createPatient(patient: { 
    nome: string; 
    email: string; 
    telefone: string; 
    therapistEmail: string 
  }): Promise<Patient> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for API calls");
    }

    console.log("📞 createPatient API call:", patient);
    return makeApiCall(`/api/patients`, {
      method: "POST",
      body: JSON.stringify(patient),
    });
  },

  async updatePatient(patientId: string, patient: {
    nome: string;
    email?: string;
    telefone?: string;
    sessionPrice?: number;
    therapyStartDate?: string;
    lvNotasBillingStartDate?: string;
    observacoes?: string;
  }): Promise<Patient> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for API calls");
    }

    console.log("📞 updatePatient API call:", { patientId, patient });
    return makeApiCall(`/api/patients/${patientId}`, {
      method: "PUT",
      body: JSON.stringify(patient),
    });
  },

  async deletePatient(patientId: string): Promise<void> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for API calls");
    }

    console.log("📞 deletePatient API call:", patientId);
    await makeApiCall(`/api/patients/${patientId}`, {
      method: "DELETE",
    });
    console.log("✅ deletePatient success");
  },

  // ==========================================
  // SESSION MANAGEMENT
  // ==========================================

  async getPatientSessions(patientId: string): Promise<Session[]> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for API calls");
    }

    const therapistEmail = getCurrentTherapistEmail();
    if (!therapistEmail) {
      throw new Error("No therapist email available");
    }

    console.log("📞 getPatientSessions API call");
    return makeApiCall(`/api/sessions/${patientId}?therapistEmail=${encodeURIComponent(therapistEmail)}`);
  },

  async getSessions(therapistEmail: string): Promise<Session[]> {
    return makeApiCall(`/api/sessions?therapistEmail=${encodeURIComponent(therapistEmail)}`);
  },

  async createSession(sessionData: {
    patientId: string;
    date: string;
    status: string;
    therapistEmail: string;
  }): Promise<Session> {
    console.log("📞 createSession API call:", sessionData);
    return makeApiCall(`/api/sessions`, {
      method: "POST",
      body: JSON.stringify(sessionData),
    });
  },

  async updateSession(sessionId: string, updateData: {
    patientId?: string;
    date?: string;
    status?: string;
  }): Promise<Session> {
    return makeApiCall(`/api/sessions/${sessionId}`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    });
  },

  async deleteSession(sessionId: string): Promise<void> {
    console.log("📞 deleteSession API call:", sessionId);
    await makeApiCall(`/api/sessions/${sessionId}`, {
      method: "DELETE",
    });
    console.log("✅ deleteSession success");
  },

  async submitCheckIn(patientId: string, sessionId: string): Promise<void> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for API calls");
    }

    console.log("📞 submitCheckIn API call");
    await makeApiCall(`/api/checkin`, {
      method: "POST",
      body: JSON.stringify({ patientId, sessionId }),
    });
  },

  // ==========================================
  // THERAPIST MANAGEMENT
  // ==========================================

  async getTherapistByEmail(email: string): Promise<Therapist | null> {
    console.log("📞 getTherapistByEmail API call for:", email);
    try {
      if (!canMakeAuthenticatedCall()) {
        console.log("⚠️ Authentication not ready, skipping therapist fetch");
        return null;
      }

      const therapist = await makeApiCall<Therapist>(`/api/therapists/${encodeURIComponent(email)}`);
      console.log("✅ getTherapistByEmail success:", therapist);
      return therapist;
    } catch (error) {
      if (error instanceof Error && error.message.includes("404")) {
        console.log("📭 Therapist not found (404)");
        return null;
      }
      console.error("❌ Error fetching therapist:", error);
      return null;
    }
  },

  async createTherapist(therapist: { 
    name: string; 
    email: string; 
    googleCalendarId: string 
  }): Promise<Therapist> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for API calls");
    }

    console.log("📞 createTherapist API call:", therapist);
    const result = await makeApiCall<Therapist>(`/api/therapists`, {
      method: "POST",
      body: JSON.stringify(therapist),
    });
    console.log("✅ createTherapist success:", result);
    return result;
  },

  async updateTherapistCalendar(email: string, calendarId: string): Promise<void> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for API calls");
    }

    console.log("📞 updateTherapistCalendar API call:", { email, calendarId });
    await makeApiCall(`/api/therapists/${encodeURIComponent(email)}/calendar`, {
      method: "PUT",
      body: JSON.stringify({ googleCalendarId: calendarId }),
    });
    console.log("✅ updateTherapistCalendar success");
  },

  // ==========================================
  // THERAPIST SETTINGS METHODS
  // ==========================================

  async getTherapistSettings(therapistEmail: string): Promise<any> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for API calls");
    }

    console.log("📞 getTherapistSettings API call for:", therapistEmail);
    try {
      return await makeApiCall(`/api/therapists/${encodeURIComponent(therapistEmail)}/settings`);
    } catch (error) {
      if (error instanceof Error && error.message.includes("404")) {
        console.log("📭 Therapist settings not found (404) - using defaults");
        return null; // Return null for not found, let caller handle defaults
      }
      throw error;
    }
  },

  async saveTherapistSettings(therapistEmail: string, settings: any): Promise<void> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for API calls");
    }

    console.log("📞 saveTherapistSettings API call:", { therapistEmail, settings });
    await makeApiCall(`/api/therapists/${encodeURIComponent(therapistEmail)}/settings`, {
      method: "PUT",
      body: JSON.stringify(settings),
    });
    console.log("✅ saveTherapistSettings success");
  },

  // ==========================================
  // CALENDAR METHODS
  // ==========================================

  async getCalendars(): Promise<any[]> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for calendar operations");
    }

    console.log("📞 getCalendars API call");
    return makeApiCall(`/api/calendars`);
  },

  async getCalendarEvents(therapistEmail: string): Promise<any[]> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for calendar operations");
    }

    console.log("📞 getCalendarEvents API call for:", therapistEmail);
    return makeApiCall(`/api/calendars/events?therapistEmail=${encodeURIComponent(therapistEmail)}`);
  },

  async getCalendarEventsForImport(
    calendarId: string,
    startDate: string,
    endDate: string
  ): Promise<any[]> {
    const params = new URLSearchParams({
      calendarId,
      startDate,
      endDate,
      useUserAuth: 'true'
    });

    return makeApiCall(`/api/import/calendar/events-for-import?${params}`);
  },

  // ==========================================
  // BILLING METHODS
  // ==========================================

  async getMonthlyBillingSummary(
    therapistEmail: string,
    year: number,
    month: number
  ): Promise<any> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for billing operations");
    }

    const params = new URLSearchParams({
      therapistEmail,
      year: year.toString(),
      month: month.toString()
    });

    console.log(`💰 getMonthlyBillingSummary API call - ${year}-${month}`);
    return makeApiCall(`/api/monthly-billing/summary?${params}`);
  },

  async getMonthlyBillingOverview(
    therapistEmail: string,
    year: number,
    month: number
  ): Promise<any> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for billing operations");
    }

    const params = new URLSearchParams({
      therapistEmail,
      year: year.toString(),
      month: month.toString()
    });

    console.log(`📊 getMonthlyBillingOverview API call - ${year}-${month}`);
    return makeApiCall(`/api/monthly-billing/overview?${params}`);
  },

  async processCharges(request: any): Promise<any> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for billing operations");
    }

    console.log("💳 processCharges API call:", request);
    return makeApiCall(`/api/monthly-billing/process-charges`, {
      method: "POST",
      body: JSON.stringify(request),
    });
  },

  async recordPayment(request: any): Promise<any> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for billing operations");
    }

    console.log("💰 recordPayment API call:", request);
    return makeApiCall(`/api/monthly-billing/record-payment`, {
      method: "POST",
      body: JSON.stringify(request),
    });
  },

  async processMonthlyCharges(request: any): Promise<any> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for billing operations");
    }

    console.log("💳 processMonthlyCharges API call:", request);
    return makeApiCall(`/api/monthly-billing/process`, {
      method: "POST",
      body: JSON.stringify(request),
    });
  },

  async updateSessionPaymentStatus(sessionId: string, paymentStatus: string): Promise<any> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for billing operations");
    }

    console.log("💰 updateSessionPaymentStatus API call:", { sessionId, paymentStatus });
    return makeApiCall(`/api/sessions/${sessionId}/payment-status`, {
      method: "PUT",
      body: JSON.stringify({ paymentStatus }),
    });
  },

  async getBillingHistory(therapistEmail: string, limit?: number): Promise<any> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for billing operations");
    }

    const params = new URLSearchParams({
      therapistEmail,
      ...(limit && { limit: limit.toString() })
    });

    console.log("📊 getBillingHistory API call");
    return makeApiCall(`/api/billing/history?${params}`);
  },

  async getBillingPeriodDetails(billingPeriodId: number): Promise<any> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for billing operations");
    }

    console.log("📊 getBillingPeriodDetails API call:", billingPeriodId);
    return makeApiCall(`/api/monthly-billing/${billingPeriodId}`);
  },

  async recordBillingPeriodPayment(billingPeriodId: number, paymentData: any): Promise<any> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for billing operations");
    }

    console.log("💳 recordBillingPeriodPayment API call:", { billingPeriodId, paymentData });
    return makeApiCall(`/api/monthly-billing/${billingPeriodId}/payments`, {
      method: "POST",
      body: JSON.stringify(paymentData),
    });
  },

  async voidBillingPeriod(billingPeriodId: number, therapistEmail: string, reason: string): Promise<any> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for billing operations");
    }

    console.log("🗑️ voidBillingPeriod API call:", { billingPeriodId, reason });
    return makeApiCall(`/api/monthly-billing/${billingPeriodId}/void`, {
      method: "PUT",
      body: JSON.stringify({ therapistEmail, reason }),
    });
  },

  async deleteBillingPeriodPayment(paymentId: number): Promise<any> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for billing operations");
    }

    console.log("🗑️ deleteBillingPeriodPayment API call:", paymentId);
    return makeApiCall(`/api/monthly-billing/payment/${paymentId}`, {
      method: "DELETE",
    });
  },

  async exportMonthlyBillingCSV(therapistEmail: string, year: number, month: number): Promise<Blob> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for billing operations");
    }

    const params = new URLSearchParams({
      therapistEmail,
      year: year.toString(),
      month: month.toString()
    });

    console.log("📊 exportMonthlyBillingCSV API call");
    
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/monthly-billing/export-csv?${params}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`CSV export failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.blob();
  },

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  async testConnection(): Promise<{ message: string }> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for API calls");
    }

    console.log("📞 testConnection API call");
    const result = await makeApiCall<{ message: string }>(`/api/test`);
    console.log("✅ testConnection success:", result);
    return result;
  },

  // Helper methods
  getCurrentTherapistEmail,
  canMakeAuthenticatedCall,
  getAuthHeaders,
  makeApiCall,
};