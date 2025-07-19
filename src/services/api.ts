// src/services/api.ts - Enhanced with Calendar-Only Methods
import type { Patient, Session, Therapist } from "../types/index";
import type { 
  CalendarSession, 
  BillingPeriod, 
  BillingSummary,
  ProcessChargesRequest,
  ProcessChargesResponse,
  MonthlyBillingOverviewResponse,
  RecordPaymentRequest,
  CalendarOnlyPatient,
  BillingPeriodPayment,
  CalendarOnlyApiResponse
} from "../types/calendar-only";
import { getCurrentUser, isDevelopment, getGoogleAccessToken } from "../config/firebase";
import type { CalendarEvent, PatientData } from "../types/onboarding";

const API_URL = isDevelopment ? "http://localhost:3000" : process.env.EXPO_PUBLIC_SAFE_PROXY_URL;
const API_KEY = process.env.SAFE_PROXY_API_KEY;

const getAuthHeaders = async () => {
  console.log("📡 API CALL MADE at", new Date().toISOString(), "- Stack:", new Error().stack?.split('\n')[2]?.trim());
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
    headers["X-Calendar-Token"] = googleAccessToken;
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
  // ==========================================
  // EXISTING METHODS (keeping all your current API methods)
  // ==========================================

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

  // ... (keeping all your existing methods) ...

  // ==========================================
  // NEW CALENDAR-ONLY METHODS
  // ==========================================

  // Get all patients with their calendar sessions
  async getCalendarOnlyPatients(
    therapistEmail?: string,
    startDate?: string,
    endDate?: string
  ): Promise<CalendarOnlyPatient[]> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for calendar operations");
    }

    const headers = await getAuthHeaders();
    const email = therapistEmail || getCurrentTherapistEmail();

    if (!email) {
      throw new Error("No therapist email provided");
    }

    const params = new URLSearchParams({
      therapistEmail: email
    });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    console.log("📅 getCalendarOnlyPatients API call");
    const response = await fetch(`${API_URL}/api/calendar-only/patients?${params}`, { headers });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ getCalendarOnlyPatients error response:", errorText);
      throw new Error(`Failed to fetch calendar patients. Status: ${response.status}, Error: ${errorText}`);
    }
    return response.json();
  },

  // Get specific patient's calendar sessions
  async getPatientCalendarSessions(
    patientId: number,
    therapistEmail?: string
  ): Promise<CalendarSession[]> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for calendar operations");
    }

    const headers = await getAuthHeaders();
    const email = therapistEmail || getCurrentTherapistEmail();

    if (!email) {
      throw new Error("No therapist email provided");
    }

    const params = new URLSearchParams({
      therapistEmail: email
    });

    console.log("📅 getPatientCalendarSessions API call");
    const response = await fetch(`${API_URL}/api/calendar-only/patients/${patientId}?${params}`, { headers });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ getPatientCalendarSessions error response:", errorText);
      throw new Error(`Failed to fetch patient calendar sessions. Status: ${response.status}, Error: ${errorText}`);
    }
    return response.json();
  },

  // Get all calendar sessions with optional auto check-in
  async getCalendarOnlySessions(
    therapistEmail?: string,
    autoCheckIn: boolean = false,
    startDate?: string,
    endDate?: string
  ): Promise<CalendarSession[]> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for calendar operations");
    }

    const headers = await getAuthHeaders();
    const email = therapistEmail || getCurrentTherapistEmail();

    if (!email) {
      throw new Error("No therapist email provided");
    }

    const params = new URLSearchParams({
      therapistEmail: email,
      autoCheckIn: autoCheckIn.toString()
    });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    console.log(`📅 getCalendarOnlySessions API call - Auto Check-in: ${autoCheckIn}`);
    const response = await fetch(`${API_URL}/api/calendar-only/sessions?${params}`, { headers });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ getCalendarOnlySessions error response:", errorText);
      throw new Error(`Failed to fetch calendar sessions. Status: ${response.status}, Error: ${errorText}`);
    }
    return response.json();
  },

  // Calendar debug and connectivity check
  async debugCalendarConnectivity(therapistEmail?: string): Promise<any> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for calendar operations");
    }

    const headers = await getAuthHeaders();
    const email = therapistEmail || getCurrentTherapistEmail();

    if (!email) {
      throw new Error("No therapist email provided");
    }

    const params = new URLSearchParams({
      therapistEmail: email
    });

    console.log("🔍 debugCalendarConnectivity API call");
    const response = await fetch(`${API_URL}/api/calendar-only/debug?${params}`, { headers });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ debugCalendarConnectivity error response:", errorText);
      throw new Error(`Failed to debug calendar connectivity. Status: ${response.status}, Error: ${errorText}`);
    }
    return response.json();
  },

  // ==========================================
  // MONTHLY BILLING METHODS
  // ==========================================

  // Get monthly billing summary
  async getMonthlyBillingSummary(
    therapistEmail: string,
    year: number,
    month: number
  ): Promise<MonthlyBillingOverviewResponse> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for billing operations");
    }

    const headers = await getAuthHeaders();
    const params = new URLSearchParams({
      therapistEmail,
      year: year.toString(),
      month: month.toString()
    });

    console.log(`💰 getMonthlyBillingSummary API call - ${year}-${month}`);
    const response = await fetch(`${API_URL}/api/monthly-billing/summary?${params}`, { headers });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ getMonthlyBillingSummary error response:", errorText);
      throw new Error(`Failed to fetch monthly billing summary. Status: ${response.status}, Error: ${errorText}`);
    }
    return response.json();
  },

  // Process monthly charges for a specific patient
  async processMonthlyCharges(
    request: ProcessChargesRequest
  ): Promise<ProcessChargesResponse> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for billing operations");
    }

    const headers = await getAuthHeaders();

    console.log(`💰 processMonthlyCharges API call - Patient ${request.patientId}, ${request.year}-${request.month}`);
    const response = await fetch(`${API_URL}/api/monthly-billing/process`, {
      method: "POST",
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ processMonthlyCharges error response:", errorText);
      throw new Error(`Failed to process monthly charges. Status: ${response.status}, Error: ${errorText}`);
    }
    return response.json();
  },

  // Get billing period details
  async getBillingPeriodDetails(billingPeriodId: number): Promise<BillingPeriod> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for billing operations");
    }

    const headers = await getAuthHeaders();

    console.log(`💰 getBillingPeriodDetails API call - ID ${billingPeriodId}`);
    const response = await fetch(`${API_URL}/api/monthly-billing/${billingPeriodId}`, { headers });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ getBillingPeriodDetails error response:", errorText);
      throw new Error(`Failed to fetch billing period details. Status: ${response.status}, Error: ${errorText}`);
    }
    return response.json();
  },

  // Void billing period (only if no payments)
  async voidBillingPeriod(
    billingPeriodId: number,
    therapistEmail: string,
    reason: string
  ): Promise<void> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for billing operations");
    }

    const headers = await getAuthHeaders();

    console.log(`💰 voidBillingPeriod API call - ID ${billingPeriodId}`);
    const response = await fetch(`${API_URL}/api/monthly-billing/${billingPeriodId}/void`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        therapistEmail,
        reason
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ voidBillingPeriod error response:", errorText);
      throw new Error(`Failed to void billing period. Status: ${response.status}, Error: ${errorText}`);
    }
  },

  // Record payment for billing period
  async recordBillingPeriodPayment(
    billingPeriodId: number,
    paymentRequest: RecordPaymentRequest
  ): Promise<BillingPeriodPayment> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for billing operations");
    }

    const headers = await getAuthHeaders();

    console.log(`💰 recordBillingPeriodPayment API call - ID ${billingPeriodId}`);
    const response = await fetch(`${API_URL}/api/monthly-billing/${billingPeriodId}/payments`, {
      method: "POST",
      headers,
      body: JSON.stringify(paymentRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ recordBillingPeriodPayment error response:", errorText);
      throw new Error(`Failed to record billing period payment. Status: ${response.status}, Error: ${errorText}`);
    }
    return response.json();
  },

  // Delete payment (re-enables voiding)
  async deleteBillingPeriodPayment(paymentId: number): Promise<void> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for billing operations");
    }

    const headers = await getAuthHeaders();

    console.log(`💰 deleteBillingPeriodPayment API call - Payment ID ${paymentId}`);
    const response = await fetch(`${API_URL}/api/monthly-billing/payments/${paymentId}`, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ deleteBillingPeriodPayment error response:", errorText);
      throw new Error(`Failed to delete billing period payment. Status: ${response.status}, Error: ${errorText}`);
    }
  },

  // Delete entire billing period (only if no payments)
  async deleteBillingPeriod(billingPeriodId: number): Promise<void> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for billing operations");
    }

    const headers = await getAuthHeaders();

    console.log(`💰 deleteBillingPeriod API call - ID ${billingPeriodId}`);
    const response = await fetch(`${API_URL}/api/monthly-billing/${billingPeriodId}`, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ deleteBillingPeriod error response:", errorText);
      throw new Error(`Failed to delete billing period. Status: ${response.status}, Error: ${errorText}`);
    }
  },

  // ==========================================
  // ALL YOUR EXISTING METHODS CONTINUE HERE
  // ==========================================

  async getCalendars(): Promise<any[]> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for calendar operations");
    }

    const headers = await getAuthHeaders();
    console.log("Calendar reuqest Test Version 1.0.0");
    console.log(headers);
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
    console.log("55555 🔄 getTherapistByEmail called for:", email, "at", new Date().toISOString());
    try {
      if (!canMakeAuthenticatedCall()) {
        console.log("⚠️ Authentication not ready, skipping therapist fetch");
        return null;
      }

      const headers = await getAuthHeaders();
      console.log("Test Version 1.0.0 (src/services/api.ts)");
      console.log("📞 getTherapistByEmail API call for ::: ", email);
      console.log("Headers", headers);
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
    const response = await fetch(`${API_URL}/api/calendars/events?therapistEmail=${encodeURIComponent(therapistEmail)}`, { headers });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ getCalendarEvents error response:", errorText);
      throw new Error(`Failed to fetch calendar events. Status: ${response.status}, Error: ${errorText}`);
    }
    return response.json();
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

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.log('Error response data:', errorData);

      // Throw error with server's message
      const errorMessage = errorData.message || "Failed to create session";
      console.log('Error response data:', errorMessage);
      throw new Error(errorMessage);
    }

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

  async deleteSession(sessionId: string): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/sessions/${sessionId}`, {
      method: "DELETE",
      headers,
    });

    console.log('Delete response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.log('Delete error response data:', errorData);

      const errorMessage = errorData.message || "Failed to delete session";
      throw new Error(errorMessage);
    }
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

  async getPaymentSummary(
    therapistEmail: string,
    startDate?: string,
    endDate?: string,
    autoCheckIn: boolean = false,
    status?: string,
    patientFilter?: string
  ): Promise<any> {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams({
      therapistEmail,
      autoCheckIn: autoCheckIn.toString()
    });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (status) params.append('status', status);
    if (patientFilter) params.append('patientFilter', patientFilter);

    console.log(`📞 getPaymentSummary API call - Auto Check-in: ${autoCheckIn}, Filters: ${status}, ${patientFilter}`);
    const response = await fetch(`${API_URL}/api/payments/summary?${params}`, { headers });
    if (!response.ok) throw new Error("Failed to fetch payment summary");
    return response.json();
  },

  async getPatientPayments(
    therapistEmail: string,
    startDate?: string,
    endDate?: string,
    status?: string,
    autoCheckIn: boolean = false
  ): Promise<any[]> {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams({
      therapistEmail,
      autoCheckIn: autoCheckIn.toString()
    });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (status) params.append('status', status);

    console.log(`📞 getPatientPayments API call - Auto Check-in: ${autoCheckIn}`);
    const response = await fetch(`${API_URL}/api/payments/patients?${params}`, { headers });
    if (!response.ok) throw new Error("Failed to fetch patient payments");
    return response.json();
  },

  async getSessionPayments(
    therapistEmail: string,
    startDate?: string,
    endDate?: string,
    status?: string,
    autoCheckIn: boolean = false
  ): Promise<any[]> {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams({
      therapistEmail,
      autoCheckIn: autoCheckIn.toString()
    });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (status) params.append('status', status);

    console.log(`📞 getSessionPayments API call - Auto Check-in: ${autoCheckIn}`);
    const response = await fetch(`${API_URL}/api/payments/sessions?${params}`, { headers });
    if (!response.ok) throw new Error("Failed to fetch session payments");
    return response.json();
  },

  async sendPaymentRequest(patientId: string, autoCheckIn: boolean = false): Promise<void> {
    const headers = await getAuthHeaders();
    console.log(`📞 sendPaymentRequest API call - Auto Check-in: ${autoCheckIn}`);
    const response = await fetch(`${API_URL}/api/payments/request`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        patientId,
        autoCheckIn
      }),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to send payment request: ${error}`);
    }
  },


  async updatePaymentStatus(sessionId: number, newStatus: string, therapistEmail: string): Promise<void> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for API calls");
    }

    const headers = await getAuthHeaders();
    console.log("📞 updatePaymentStatus API call:", { sessionId, newStatus, therapistEmail });

    const response = await fetch(`${API_URL}/api/payments/status`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        sessionId,
        newStatus,
        therapistEmail,
        updatedBy: therapistEmail,
        reason: `Status changed via LV Notas interface to: ${newStatus}`
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ updatePaymentStatus error response:", errorText);
      throw new Error(`Failed to update payment status. Status: ${response.status}, Error: ${errorText}`);
    }

    console.log("✅ updatePaymentStatus success");
  },


  async getCalendarEventsForImport(
    calendarId: string,
    startDate: string,
    endDate: string
  ): Promise<CalendarEvent[]> {
    const headers = await getAuthHeaders(); // This should include Google access token
    const params = new URLSearchParams({
      calendarId,
      startDate,
      endDate,
      useUserAuth: 'true' // Flag to use user OAuth
    });

    const response = await fetch(`${API_URL}/api/import/calendar/events-for-import?${params}`, {
      headers
    });

    if (!response.ok) {
      throw new Error("Failed to fetch calendar events for import");
    }

    return response.json();
  },

  async importPatientWithSessions(
    therapistEmail: string,
    patientData: PatientData
  ): Promise<{ patientId: string; sessionIds: string[] }> {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_URL}/api/import/patient-with-sessions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        therapistEmail,
        patientData
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to import patient and sessions");
    }

    return response.json();
  },

  async getTherapistSettings(therapistEmail: string): Promise<{
    therapistId: number;
    therapistEmail: string;
    settings: Record<string, string>;
    metadata: Record<string, { updated_at: string }>;
    count: number;
  }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/therapists/${encodeURIComponent(therapistEmail)}/settings`, {
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch therapist settings: ${response.status} ${errorText}`);
    }

    return response.json();
  },

  async updateTherapistSettings(therapistEmail: string, settings: Record<string, string>): Promise<{
    therapistId: number;
    therapistEmail: string;
    updated: Record<string, string>;
    metadata: Record<string, { updated_at: string }>;
    summary: {
      total: number;
      successful: number;
      failed: number;
    };
  }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/therapists/${encodeURIComponent(therapistEmail)}/settings`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ settings }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update therapist settings: ${response.status} ${errorText}`);
    }

    return response.json();
  },

  async getTherapistSetting(therapistEmail: string, settingKey: string): Promise<{
    therapistId: number;
    therapistEmail: string;
    settingKey: string;
    value: string;
    updated_at: string;
  }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/therapists/${encodeURIComponent(therapistEmail)}/settings/${encodeURIComponent(settingKey)}`, {
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch therapist setting: ${response.status} ${errorText}`);
    }

    return response.json();
  },

  async deleteTherapistSetting(therapistEmail: string, settingKey: string): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/therapists/${encodeURIComponent(therapistEmail)}/settings/${encodeURIComponent(settingKey)}`, {
      method: "DELETE",
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete therapist setting: ${response.status} ${errorText}`);
    }
  },

  async resetTherapistSettings(therapistEmail: string): Promise<{
    message: string;
    therapistId: number;
    therapistEmail: string;
    resetSettings: Record<string, string>;
    count: number;
  }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/therapists/${encodeURIComponent(therapistEmail)}/settings/reset`, {
      method: "POST",
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to reset therapist settings: ${response.status} ${errorText}`);
    }

    return response.json();
  },

  // Helper methods
  getCurrentTherapistEmail,
  canMakeAuthenticatedCall,
  getAuthHeaders,
};

