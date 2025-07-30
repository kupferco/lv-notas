// src/services/api/session-service.ts - Session API Service

import type { Session } from "../../types/index";
import { baseApiService } from './base-service';

const { makeApiCall, canMakeAuthenticatedCall, getCurrentTherapistEmail, validateRequired, handleApiError } = baseApiService;

export const sessionService = {
  // ==========================================
  // SESSION MANAGEMENT
  // ==========================================

  async getPatientSessions(patientId: string): Promise<Session[]> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for API calls");
    }

    try {
      validateRequired(patientId, 'Patient ID');
      
      const therapistEmail = getCurrentTherapistEmail();
      if (!therapistEmail) {
        throw new Error("No therapist email available");
      }

      console.log("📞 getPatientSessions API call for patient:", patientId);
      return await makeApiCall<Session[]>(`/api/sessions/${patientId}?therapistEmail=${encodeURIComponent(therapistEmail)}`);
    } catch (error) {
      return handleApiError(error as Error, 'getPatientSessions');
    }
  },

  async getSessions(therapistEmail: string): Promise<Session[]> {
    try {
      validateRequired(therapistEmail, 'Therapist email');
      
      console.log("📞 getSessions API call for therapist:", therapistEmail);
      return await makeApiCall<Session[]>(`/api/sessions?therapistEmail=${encodeURIComponent(therapistEmail)}`);
    } catch (error) {
      return handleApiError(error as Error, 'getSessions');
    }
  },

  async createSession(sessionData: {
    patientId: string;
    date: string;
    status: string;
    therapistEmail: string;
  }): Promise<Session> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for API calls");
    }

    try {
      validateRequired(sessionData.patientId, 'Patient ID');
      validateRequired(sessionData.date, 'Session date');
      validateRequired(sessionData.status, 'Session status');
      validateRequired(sessionData.therapistEmail, 'Therapist email');

      console.log("📞 createSession API call:", sessionData);
      return await makeApiCall<Session>(`/api/sessions`, {
        method: "POST",
        body: JSON.stringify(sessionData),
      });
    } catch (error) {
      return handleApiError(error as Error, 'createSession');
    }
  },

  async updateSession(sessionId: string, updateData: {
    patientId?: string;
    date?: string;
    status?: string;
  }): Promise<Session> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for API calls");
    }

    try {
      validateRequired(sessionId, 'Session ID');

      console.log("📞 updateSession API call:", { sessionId, updateData });
      return await makeApiCall<Session>(`/api/sessions/${sessionId}`, {
        method: "PUT",
        body: JSON.stringify(updateData),
      });
    } catch (error) {
      return handleApiError(error as Error, 'updateSession');
    }
  },

  async deleteSession(sessionId: string): Promise<void> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for API calls");
    }

    try {
      validateRequired(sessionId, 'Session ID');

      console.log("📞 deleteSession API call:", sessionId);
      await makeApiCall<void>(`/api/sessions/${sessionId}`, {
        method: "DELETE",
      });
      console.log("✅ deleteSession success");
    } catch (error) {
      return handleApiError(error as Error, 'deleteSession');
    }
  },

  async submitCheckIn(patientId: string, sessionId: string): Promise<void> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for API calls");
    }

    try {
      validateRequired(patientId, 'Patient ID');
      validateRequired(sessionId, 'Session ID');

      console.log("📞 submitCheckIn API call");
      await makeApiCall<void>(`/api/checkin`, {
        method: "POST",
        body: JSON.stringify({ patientId, sessionId }),
      });
      console.log("✅ submitCheckIn success");
    } catch (error) {
      return handleApiError(error as Error, 'submitCheckIn');
    }
  },

  async updateSessionPaymentStatus(sessionId: string, paymentStatus: string): Promise<any> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for billing operations");
    }

    try {
      validateRequired(sessionId, 'Session ID');
      validateRequired(paymentStatus, 'Payment status');

      console.log("💰 updateSessionPaymentStatus API call:", { sessionId, paymentStatus });
      return await makeApiCall(`/api/sessions/${sessionId}/payment-status`, {
        method: "PUT",
        body: JSON.stringify({ paymentStatus }),
      });
    } catch (error) {
      return handleApiError(error as Error, 'updateSessionPaymentStatus');
    }
  },
};