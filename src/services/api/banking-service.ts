// src/services/api/banking-service.ts - Banking/Pluggy API Service

import { baseApiService } from './base-service';

const { makeApiCall, canMakeAuthenticatedCall, validateRequired, handleApiError } = baseApiService;

export const bankingService = {
  // ==========================================
  // PAYMENT MATCHING METHODS
  // ==========================================

  async findPotentialMatches(
    therapistId: string,
    startDate: string,
    endDate: string,
    limit: number = 100
  ): Promise<any> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for banking operations");
    }

    try {
      validateRequired(therapistId, 'Therapist ID');
      validateRequired(startDate, 'Start date');
      validateRequired(endDate, 'End date');

      const params = new URLSearchParams({
        start: startDate,
        end: endDate,
        limit: limit.toString()
      });

      console.log(`🔍 findPotentialMatches API call - therapist ${therapistId}, ${startDate} to ${endDate}`);
      return await makeApiCall(`/api/pluggy/potential-matches/${therapistId}?${params}`, {
        method: "GET",
        headers: {
          'X-Test-Mode': 'mock' // Use mock mode for now
        }
      });
    } catch (error) {
      return handleApiError(error as Error, 'findPotentialMatches');
    }
  },

  // Add other banking methods as needed...
};