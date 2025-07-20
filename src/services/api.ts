// src/services/api.ts - Enhanced with Better Token Management
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
import { getCurrentUser, isDevelopment, getGoogleAccessToken, trackActivity, ensureValidGoogleToken } from "../config/firebase";
import type { CalendarEvent, PatientData } from "../types/onboarding";

const API_URL = isDevelopment ? "http://localhost:3000" : process.env.EXPO_PUBLIC_SAFE_PROXY_URL;
const API_KEY = process.env.SAFE_PROXY_API_KEY;

// Enhanced getAuthHeaders with automatic token refresh and activity tracking
const getAuthHeaders = async (): Promise<Record<string, string>> => {
  console.log("📡 ENHANCED API CALL at", new Date().toISOString(), "- Stack:", new Error().stack?.split('\n')[2]?.trim());
  console.log("=== Enhanced getAuthHeaders Debug ===");

  let authHeader = "";
  
  // Always get real Firebase token
  const user = getCurrentUser();
  console.log("getCurrentUser():", user?.email || 'none');

  if (user) {
    try {
      console.log("User found, getting Firebase token...");
      const token = await user.getIdToken();
      authHeader = `Bearer ${token}`;
      console.log("Firebase token obtained:", token ? "✅" : "❌");
    } catch (error) {
      console.error("Error getting Firebase token:", error);
    }
  } else {
    console.log("No authenticated user found");
  }

  // Enhanced Google access token with auto-refresh and activity tracking
  let googleAccessToken: string | null = null;
  
  // Check if enhanced token management is available
  if (typeof ensureValidGoogleToken === 'function') {
    try {
      console.log("Getting Google access token with enhanced validation...");
      
      // Use the enhanced token validation function
      googleAccessToken = await ensureValidGoogleToken();
      if (googleAccessToken) {
        trackActivity(); // Track activity on successful token validation
      }
      console.log("Enhanced Google token obtained:", googleAccessToken ? "✅" : "❌");
      
    } catch (error) {
      console.warn("Enhanced Google token check failed:", error);
      
      if (error instanceof Error && error.message.includes("FORCE_REAUTH")) {
        console.log("❌ User inactive for > 10 days, forcing re-authentication");
        // You may want to trigger a re-auth flow here or notify the user
        throw new Error("Re-authentication required due to inactivity");
      }
      
      // Fallback to stored token for backwards compatibility
      googleAccessToken = await getGoogleAccessToken();
      console.log("Using fallback stored token:", googleAccessToken ? "✅" : "❌");
    }
  } else {
    // Fallback if enhanced functions aren't available yet
    console.log("Enhanced token management not available, using fallback");
    const fallbackToken = await getGoogleAccessToken();
    googleAccessToken = typeof fallbackToken === 'string' ? fallbackToken : null;
    console.log("Using fallback stored token:", googleAccessToken ? "✅" : "❌");
  }

  // Build headers
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

// Enhanced API call wrapper with automatic retry on authentication failures
const makeEnhancedApiCall = async <T>(
  url: string, 
  options: RequestInit = {}
): Promise<T> => {
  let retryCount = 0;
  const maxRetries = 1; // Try once, then retry once

  while (retryCount <= maxRetries) {
    try {
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_URL}${url}`, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      // If we get 401, try to refresh and retry
      if (response.status === 401 && retryCount < maxRetries) {
        console.warn(`🔄 Got 401, attempting token refresh and retry...`);
        
        try {
          // Force refresh Firebase token
          const user = getCurrentUser();
          if (user) {
            await user.getIdToken(true);
            console.log("✅ Firebase token refreshed");
          }
          
          // The next getAuthHeaders() call will automatically try to refresh Google token
          retryCount++;
          continue; // Retry with fresh tokens
        } catch (refreshError) {
          console.error("❌ Token refresh failed:", refreshError);
          throw new Error("Authentication failed - please sign in again");
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return response.json();

    } catch (error) {
      if (retryCount >= maxRetries) {
        throw error;
      }
      retryCount++;
    }
  }

  throw new Error("Max retries exceeded");
};

// Helper function to check if we can make authenticated API calls
const canMakeAuthenticatedCall = (): boolean => {
  if (isDevelopment) {
    // In development, just need a user
    const hasUser = !!getCurrentUser();
    console.log("🚧 Development mode - can make authenticated call:", hasUser);
    return hasUser;
  }
  // In production, need both Firebase user and a way to get Google access token
  const user = getCurrentUser();
  const canCall = !!user;
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
  // PATIENT MANAGEMENT METHODS
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
    return makeEnhancedApiCall(`/api/patients?therapistEmail=${encodeURIComponent(email)}`);
  },

  async createPatient(patient: { nome: string; email: string; telefone: string; therapistEmail: string }): Promise<Patient> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for API calls");
    }

    console.log("📞 createPatient API call:", patient);
    return makeEnhancedApiCall(`/api/patients`, {
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
    return makeEnhancedApiCall(`/api/patients/${patientId}`, {
      method: "PUT",
      body: JSON.stringify(patient),
    });
  },

  async deletePatient(patientId: string): Promise<void> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for API calls");
    }

    console.log("📞 deletePatient API call:", patientId);
    await makeEnhancedApiCall(`/api/patients/${patientId}`, {
      method: "DELETE",
    });
    console.log("✅ deletePatient success");
  },

  // ==========================================
  // SESSION MANAGEMENT METHODS
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
    return makeEnhancedApiCall(`/api/sessions/${patientId}?therapistEmail=${encodeURIComponent(therapistEmail)}`);
  },

  async getSessions(therapistEmail: string): Promise<Session[]> {
    return makeEnhancedApiCall(`/api/sessions?therapistEmail=${encodeURIComponent(therapistEmail)}`);
  },

  async createSession(sessionData: {
    patientId: string;
    date: string;
    status: string;
    therapistEmail: string;
  }): Promise<Session> {
    console.log("📞 createSession API call:", sessionData);
    
    try {
      return await makeEnhancedApiCall(`/api/sessions`, {
        method: "POST",
        body: JSON.stringify(sessionData),
      });
    } catch (error) {
      // Enhanced error handling for session creation
      if (error instanceof Error && error.message.includes("API call failed:")) {
        const match = error.message.match(/API call failed: (\d+) .* - (.+)/);
        if (match) {
          const [, status, errorText] = match;
          try {
            const errorData = JSON.parse(errorText);
            throw new Error(errorData.message || "Failed to create session");
          } catch {
            throw new Error(errorText || "Failed to create session");
          }
        }
      }
      throw error;
    }
  },

  async updateSession(sessionId: string, updateData: {
    patientId?: string;
    date?: string;
    status?: string;
  }): Promise<Session> {
    return makeEnhancedApiCall(`/api/sessions/${sessionId}`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    });
  },

  async deleteSession(sessionId: string): Promise<void> {
    console.log("📞 deleteSession API call:", sessionId);
    
    try {
      await makeEnhancedApiCall(`/api/sessions/${sessionId}`, {
        method: "DELETE",
      });
      console.log("✅ deleteSession success");
    } catch (error) {
      // Enhanced error handling for session deletion
      if (error instanceof Error && error.message.includes("API call failed:")) {
        const match = error.message.match(/API call failed: (\d+) .* - (.+)/);
        if (match) {
          const [, status, errorText] = match;
          try {
            const errorData = JSON.parse(errorText);
            throw new Error(errorData.message || "Failed to delete session");
          } catch {
            throw new Error(errorText || "Failed to delete session");
          }
        }
      }
      throw error;
    }
  },

  async submitCheckIn(patientId: string, sessionId: string): Promise<void> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for API calls");
    }

    console.log("📞 submitCheckIn API call");
    await makeEnhancedApiCall(`/api/checkin`, {
      method: "POST",
      body: JSON.stringify({ patientId, sessionId }),
    });
  },

  // ==========================================
  // THERAPIST MANAGEMENT METHODS
  // ==========================================

  async getTherapistByEmail(email: string): Promise<Therapist | null> {
    console.log("🔄 getTherapistByEmail called for:", email, "at", new Date().toISOString());
    try {
      if (!canMakeAuthenticatedCall()) {
        console.log("⚠️ Authentication not ready, skipping therapist fetch");
        return null;
      }

      console.log("📞 getTherapistByEmail API call for:", email);
      
      try {
        const therapist = await makeEnhancedApiCall<Therapist>(`/api/therapists/${encodeURIComponent(email)}`);
        console.log("✅ getTherapistByEmail success:", therapist);
        return therapist;
      } catch (error) {
        if (error instanceof Error && error.message.includes("404")) {
          console.log("📭 Therapist not found (404)");
          return null; // Therapist doesn't exist
        }
        throw error;
      }
    } catch (error) {
      console.error("❌ Error fetching therapist:", error);
      return null;
    }
  },

  async createTherapist(therapist: { name: string; email: string; googleCalendarId: string }): Promise<Therapist> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for API calls");
    }

    console.log("📞 createTherapist API call:", therapist);
    const result = await makeEnhancedApiCall<Therapist>(`/api/therapists`, {
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
    await makeEnhancedApiCall(`/api/therapists/${encodeURIComponent(email)}/calendar`, {
      method: "PUT",
      body: JSON.stringify({ googleCalendarId: calendarId }),
    });
    console.log("✅ updateTherapistCalendar success");
  },

  // ==========================================
  // CALENDAR METHODS
  // ==========================================

  async getCalendars(): Promise<any[]> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for calendar operations");
    }

    console.log("📞 getCalendars API call");
    return makeEnhancedApiCall(`/api/calendars`);
  },

  async getCalendarEvents(therapistEmail: string): Promise<any[]> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for calendar operations");
    }

    console.log("📞 getCalendarEvents API call for:", therapistEmail);
    return makeEnhancedApiCall(`/api/calendars/events?therapistEmail=${encodeURIComponent(therapistEmail)}`);
  },

  async getCalendarEventsForImport(
    calendarId: string,
    startDate: string,
    endDate: string
  ): Promise<CalendarEvent[]> {
    const params = new URLSearchParams({
      calendarId,
      startDate,
      endDate,
      useUserAuth: 'true' // Flag to use user OAuth
    });

    return makeEnhancedApiCall(`/api/import/calendar/events-for-import?${params}`);
  },

  // ==========================================
  // CALENDAR-ONLY METHODS
  // ==========================================

  async getCalendarOnlyPatients(
    therapistEmail?: string,
    startDate?: string,
    endDate?: string
  ): Promise<CalendarOnlyPatient[]> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for calendar operations");
    }

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
    return makeEnhancedApiCall(`/api/calendar-only/patients?${params}`);
  },

  async getPatientCalendarSessions(
    patientId: number,
    therapistEmail?: string
  ): Promise<CalendarSession[]> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for calendar operations");
    }

    const email = therapistEmail || getCurrentTherapistEmail();
    if (!email) {
      throw new Error("No therapist email provided");
    }

    const params = new URLSearchParams({
      therapistEmail: email
    });

    console.log("📅 getPatientCalendarSessions API call");
    return makeEnhancedApiCall(`/api/calendar-only/patients/${patientId}?${params}`);
  },

  async getCalendarOnlySessions(
    therapistEmail?: string,
    autoCheckIn: boolean = false,
    startDate?: string,
    endDate?: string
  ): Promise<CalendarSession[]> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for calendar operations");
    }

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
    return makeEnhancedApiCall(`/api/calendar-only/sessions?${params}`);
  },

  async debugCalendarConnectivity(therapistEmail?: string): Promise<any> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for calendar operations");
    }

    const email = therapistEmail || getCurrentTherapistEmail();
    if (!email) {
      throw new Error("No therapist email provided");
    }

    const params = new URLSearchParams({
      therapistEmail: email
    });

    console.log("🔍 debugCalendarConnectivity API call");
    return makeEnhancedApiCall(`/api/calendar-only/debug?${params}`);
  },

  // ==========================================
  // MONTHLY BILLING METHODS
  // ==========================================

  async getMonthlyBillingSummary(
    therapistEmail: string,
    year: number,
    month: number
  ): Promise<MonthlyBillingOverviewResponse> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for billing operations");
    }

    const params = new URLSearchParams({
      therapistEmail,
      year: year.toString(),
      month: month.toString()
    });

    console.log(`💰 getMonthlyBillingSummary API call - ${year}-${month}`);
    return makeEnhancedApiCall(`/api/monthly-billing/summary?${params}`);
  },

  async processMonthlyCharges(
    request: ProcessChargesRequest
  ): Promise<ProcessChargesResponse> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for billing operations");
    }

    console.log(`💰 processMonthlyCharges API call - Patient ${request.patientId}, ${request.year}-${request.month}`);
    return makeEnhancedApiCall(`/api/monthly-billing/process`, {
      method: "POST",
      body: JSON.stringify(request),
    });
  },

  async getBillingPeriodDetails(billingPeriodId: number): Promise<BillingPeriod> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for billing operations");
    }

    console.log(`💰 getBillingPeriodDetails API call - ID ${billingPeriodId}`);
    return makeEnhancedApiCall(`/api/monthly-billing/${billingPeriodId}`);
  },

  async voidBillingPeriod(
    billingPeriodId: number,
    therapistEmail: string,
    reason: string
  ): Promise<void> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for billing operations");
    }

    console.log(`💰 voidBillingPeriod API call - ID ${billingPeriodId}`);
    await makeEnhancedApiCall(`/api/monthly-billing/${billingPeriodId}/void`, {
      method: "PUT",
      body: JSON.stringify({
        therapistEmail,
        reason
      }),
    });
  },

  async recordBillingPeriodPayment(
    billingPeriodId: number,
    paymentRequest: RecordPaymentRequest
  ): Promise<BillingPeriodPayment> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for billing operations");
    }

    console.log(`💰 recordBillingPeriodPayment API call - ID ${billingPeriodId}`);
    return makeEnhancedApiCall(`/api/monthly-billing/${billingPeriodId}/payments`, {
      method: "POST",
      body: JSON.stringify(paymentRequest),
    });
  },

  async deleteBillingPeriodPayment(paymentId: number): Promise<void> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for billing operations");
    }

    console.log(`💰 deleteBillingPeriodPayment API call - Payment ID ${paymentId}`);
    await makeEnhancedApiCall(`/api/monthly-billing/payments/${paymentId}`, {
      method: "DELETE",
    });
  },

  async deleteBillingPeriod(billingPeriodId: number): Promise<void> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for billing operations");
    }

    console.log(`💰 deleteBillingPeriod API call - ID ${billingPeriodId}`);
    await makeEnhancedApiCall(`/api/monthly-billing/${billingPeriodId}`, {
      method: "DELETE",
    });
  },

  async exportMonthlyBillingCSV(
    therapistEmail: string,
    year: number,
    month: number
  ): Promise<Blob> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for CSV export");
    }

    const params = new URLSearchParams({
      therapistEmail,
      year: year.toString(),
      month: month.toString()
    });

    console.log(`📊 exportMonthlyBillingCSV API call - ${year}-${month}`);
    
    // For CSV export, we need to handle the response differently
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/monthly-billing/export-csv?${params}`, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ exportMonthlyBillingCSV error response:", errorText);
      throw new Error(`Failed to export CSV. Status: ${response.status}, Error: ${errorText}`);
    }

    return response.blob();
  },

  // ==========================================
  // PAYMENT METHODS
  // ==========================================

  async getPaymentSummary(
    therapistEmail: string,
    startDate?: string,
    endDate?: string,
    autoCheckIn: boolean = false,
    status?: string,
    patientFilter?: string
  ): Promise<any> {
    const params = new URLSearchParams({
      therapistEmail,
      autoCheckIn: autoCheckIn.toString()
    });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (status) params.append('status', status);
    if (patientFilter) params.append('patientFilter', patientFilter);

    console.log(`📞 getPaymentSummary API call - Auto Check-in: ${autoCheckIn}, Filters: ${status}, ${patientFilter}`);
    return makeEnhancedApiCall(`/api/payments/summary?${params}`);
  },

  async getPatientPayments(
    therapistEmail: string,
    startDate?: string,
    endDate?: string,
    status?: string,
    autoCheckIn: boolean = false
  ): Promise<any[]> {
    const params = new URLSearchParams({
      therapistEmail,
      autoCheckIn: autoCheckIn.toString()
    });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (status) params.append('status', status);

    console.log(`📞 getPatientPayments API call - Auto Check-in: ${autoCheckIn}`);
    return makeEnhancedApiCall(`/api/payments/patients?${params}`);
  },

  async getSessionPayments(
    therapistEmail: string,
    startDate?: string,
    endDate?: string,
    status?: string,
    autoCheckIn: boolean = false
  ): Promise<any[]> {
    const params = new URLSearchParams({
      therapistEmail,
      autoCheckIn: autoCheckIn.toString()
    });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (status) params.append('status', status);

    console.log(`📞 getSessionPayments API call - Auto Check-in: ${autoCheckIn}`);
    return makeEnhancedApiCall(`/api/payments/sessions?${params}`);
  },

  async sendPaymentRequest(patientId: string, autoCheckIn: boolean = false): Promise<void> {
    console.log(`📞 sendPaymentRequest API call - Auto Check-in: ${autoCheckIn}`);
    await makeEnhancedApiCall(`/api/payments/request`, {
      method: "POST",
      body: JSON.stringify({
        patientId,
        autoCheckIn
      }),
    });
  },

  async updatePaymentStatus(sessionId: number, newStatus: string, therapistEmail: string): Promise<void> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for API calls");
    }

    console.log("📞 updatePaymentStatus API call:", { sessionId, newStatus, therapistEmail });

    await makeEnhancedApiCall(`/api/payments/status`, {
      method: "PUT",
      body: JSON.stringify({
        sessionId,
        newStatus,
        therapistEmail,
        updatedBy: therapistEmail,
        reason: `Status changed via LV Notas interface to: ${newStatus}`
      }),
    });

    console.log("✅ updatePaymentStatus success");
  },

  // ==========================================
  // IMPORT METHODS
  // ==========================================

  async importPatientWithSessions(
    therapistEmail: string,
    patientData: PatientData
  ): Promise<{ patientId: string; sessionIds: string[] }> {
    return makeEnhancedApiCall(`/api/import/patient-with-sessions`, {
      method: "POST",
      body: JSON.stringify({
        therapistEmail,
        patientData
      }),
    });
  },

  // ==========================================
  // THERAPIST SETTINGS METHODS
  // ==========================================

  async getTherapistSettings(therapistEmail: string): Promise<{
    therapistId: number;
    therapistEmail: string;
    settings: Record<string, string>;
    metadata: Record<string, { updated_at: string }>;
    count: number;
  }> {
    return makeEnhancedApiCall(`/api/therapists/${encodeURIComponent(therapistEmail)}/settings`);
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
    return makeEnhancedApiCall(`/api/therapists/${encodeURIComponent(therapistEmail)}/settings`, {
      method: "PUT",
      body: JSON.stringify({ settings }),
    });
  },

  async getTherapistSetting(therapistEmail: string, settingKey: string): Promise<{
    therapistId: number;
    therapistEmail: string;
    settingKey: string;
    value: string;
    updated_at: string;
  }> {
    return makeEnhancedApiCall(`/api/therapists/${encodeURIComponent(therapistEmail)}/settings/${encodeURIComponent(settingKey)}`);
  },

  async deleteTherapistSetting(therapistEmail: string, settingKey: string): Promise<void> {
    await makeEnhancedApiCall(`/api/therapists/${encodeURIComponent(therapistEmail)}/settings/${encodeURIComponent(settingKey)}`, {
      method: "DELETE"
    });
  },

  async resetTherapistSettings(therapistEmail: string): Promise<{
    message: string;
    therapistId: number;
    therapistEmail: string;
    resetSettings: Record<string, string>;
    count: number;
  }> {
    return makeEnhancedApiCall(`/api/therapists/${encodeURIComponent(therapistEmail)}/settings/reset`, {
      method: "POST"
    });
  },

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  async testConnection(): Promise<{ message: string }> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for API calls");
    }

    console.log("📞 testConnection API call");
    const result = await makeEnhancedApiCall<{ message: string }>(`/api/test`);
    console.log("✅ testConnection success:", result);
    return result;
  },

  // Helper methods
  getCurrentTherapistEmail,
  canMakeAuthenticatedCall,
  getAuthHeaders,
  makeEnhancedApiCall, // Export the enhanced wrapper for custom usage
};