// src/services/api/calendar-service.ts - Calendar API Service

import { baseApiService } from './base-service';

const { makeApiCall, canMakeAuthenticatedCall, validateRequired, validateEmail, handleApiError } = baseApiService;

export const calendarService = {
  // ==========================================
  // CALENDAR METHODS
  // ==========================================

  async getCalendars(): Promise<any[]> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for calendar operations");
    }

    try {
      console.log("📞 getCalendars API call");
      return await makeApiCall<any[]>(`/api/calendars`);
    } catch (error) {
      return handleApiError(error as Error, 'getCalendars');
    }
  },

  async getCalendarEvents(therapistEmail: string): Promise<any[]> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for calendar operations");
    }

    try {
      validateRequired(therapistEmail, 'Therapist email');
      validateEmail(therapistEmail);

      console.log("📞 getCalendarEvents API call for:", therapistEmail);
      return await makeApiCall<any[]>(`/api/calendars/events?therapistEmail=${encodeURIComponent(therapistEmail)}`);
    } catch (error) {
      return handleApiError(error as Error, 'getCalendarEvents');
    }
  },

  async getCalendarEventsForImport(
    calendarId: string,
    startDate: string,
    endDate: string
  ): Promise<any[]> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for calendar operations");
    }

    try {
      validateRequired(calendarId, 'Calendar ID');
      validateRequired(startDate, 'Start date');
      validateRequired(endDate, 'End date');

      const params = new URLSearchParams({
        calendarId,
        startDate,
        endDate,
        useUserAuth: 'true'
      });

      console.log("📞 getCalendarEventsForImport API call");
      return await makeApiCall<any[]>(`/api/import/calendar/events-for-import?${params}`);
    } catch (error) {
      return handleApiError(error as Error, 'getCalendarEventsForImport');
    }
  },
};