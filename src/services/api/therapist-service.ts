// src/services/api/therapist-service.ts - Therapist API Service

import type { Therapist } from "../../types/index";
import { baseApiService } from './base-service';

const { makeApiCall, canMakeAuthenticatedCall, validateRequired, validateEmail, handleApiError } = baseApiService;

export const therapistService = {
  // ==========================================
  // THERAPIST MANAGEMENT
  // ==========================================

  async getTherapistByEmail(email: string): Promise<Therapist | null> {
    try {
      validateRequired(email, 'Therapist email');
      validateEmail(email);

      console.log("📞 getTherapistByEmail API call for:", email);
      
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

    try {
      validateRequired(therapist.name, 'Therapist name');
      validateRequired(therapist.email, 'Therapist email');
      validateEmail(therapist.email);
      validateRequired(therapist.googleCalendarId, 'Google Calendar ID');

      console.log("📞 createTherapist API call:", therapist);
      const result = await makeApiCall<Therapist>(`/api/therapists`, {
        method: "POST",
        body: JSON.stringify(therapist),
      });
      console.log("✅ createTherapist success:", result);
      return result;
    } catch (error) {
      return handleApiError(error as Error, 'createTherapist');
    }
  },

  async updateTherapistCalendar(email: string, calendarId: string): Promise<void> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for API calls");
    }

    try {
      validateRequired(email, 'Therapist email');
      validateEmail(email);
      validateRequired(calendarId, 'Calendar ID');

      console.log("📞 updateTherapistCalendar API call:", { email, calendarId });
      await makeApiCall(`/api/therapists/${encodeURIComponent(email)}/calendar`, {
        method: "PUT",
        body: JSON.stringify({ googleCalendarId: calendarId }),
      });
      console.log("✅ updateTherapistCalendar success");
    } catch (error) {
      return handleApiError(error as Error, 'updateTherapistCalendar');
    }
  },

  // ==========================================
  // THERAPIST SETTINGS METHODS
  // ==========================================

  async getTherapistSettings(therapistEmail: string): Promise<any> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for API calls");
    }

    try {
      validateRequired(therapistEmail, 'Therapist email');
      validateEmail(therapistEmail);

      console.log("📞 getTherapistSettings API call for:", therapistEmail);
      return await makeApiCall(`/api/therapists/${encodeURIComponent(therapistEmail)}/settings`);
    } catch (error) {
      if (error instanceof Error && error.message.includes("404")) {
        console.log("📭 Therapist settings not found (404) - using defaults");
        return null; // Return null for not found, let caller handle defaults
      }
      return handleApiError(error as Error, 'getTherapistSettings');
    }
  },

  async saveTherapistSettings(therapistEmail: string, settings: any): Promise<void> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for API calls");
    }

    try {
      validateRequired(therapistEmail, 'Therapist email');
      validateEmail(therapistEmail);
      validateRequired(settings, 'Settings');

      console.log("📞 saveTherapistSettings API call:", { therapistEmail, settings });
      await makeApiCall(`/api/therapists/${encodeURIComponent(therapistEmail)}/settings`, {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      console.log("✅ saveTherapistSettings success");
    } catch (error) {
      return handleApiError(error as Error, 'saveTherapistSettings');
    }
  },
};