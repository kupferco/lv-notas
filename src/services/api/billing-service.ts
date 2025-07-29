// src/services/api/billing-service.ts - Billing API Service

import { baseApiService } from './base-service';

const { makeApiCall, makeApiBlobCall, canMakeAuthenticatedCall, validateRequired, validateEmail, handleApiError } = baseApiService;

export const billingService = {
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

    try {
      validateRequired(therapistEmail, 'Therapist email');
      validateEmail(therapistEmail);
      validateRequired(year, 'Year');
      validateRequired(month, 'Month');

      const params = new URLSearchParams({
        therapistEmail,
        year: year.toString(),
        month: month.toString()
      });

      console.log(`💰 getMonthlyBillingSummary API call - ${year}-${month}`);
      return await makeApiCall(`/api/monthly-billing/summary?${params}`);
    } catch (error) {
      return handleApiError(error as Error, 'getMonthlyBillingSummary');
    }
  },

  async getMonthlyBillingOverview(
    therapistEmail: string,
    year: number,
    month: number
  ): Promise<any> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for billing operations");
    }

    try {
      validateRequired(therapistEmail, 'Therapist email');
      validateEmail(therapistEmail);
      validateRequired(year, 'Year');
      validateRequired(month, 'Month');

      const params = new URLSearchParams({
        therapistEmail,
        year: year.toString(),
        month: month.toString()
      });

      console.log(`📊 getMonthlyBillingOverview API call - ${year}-${month}`);
      return await makeApiCall(`/api/monthly-billing/overview?${params}`);
    } catch (error) {
      return handleApiError(error as Error, 'getMonthlyBillingOverview');
    }
  },

  async processCharges(request: any): Promise<any> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for billing operations");
    }

    try {
      validateRequired(request, 'Process charges request');

      console.log("💳 processCharges API call:", request);
      return await makeApiCall(`/api/monthly-billing/process-charges`, {
        method: "POST",
        body: JSON.stringify(request),
      });
    } catch (error) {
      return handleApiError(error as Error, 'processCharges');
    }
  },

  async recordPayment(request: any): Promise<any> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for billing operations");
    }

    try {
      validateRequired(request, 'Record payment request');

      console.log("💰 recordPayment API call:", request);
      return await makeApiCall(`/api/monthly-billing/record-payment`, {
        method: "POST",
        body: JSON.stringify(request),
      });
    } catch (error) {
      return handleApiError(error as Error, 'recordPayment');
    }
  },

  async processMonthlyCharges(request: any): Promise<any> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for billing operations");
    }

    try {
      validateRequired(request, 'Process monthly charges request');

      console.log("💳 processMonthlyCharges API call:", request);
      return await makeApiCall(`/api/monthly-billing/process`, {
        method: "POST",
        body: JSON.stringify(request),
      });
    } catch (error) {
      return handleApiError(error as Error, 'processMonthlyCharges');
    }
  },

  async getBillingHistory(therapistEmail: string, limit?: number): Promise<any> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for billing operations");
    }

    try {
      validateRequired(therapistEmail, 'Therapist email');
      validateEmail(therapistEmail);

      const params = new URLSearchParams({
        therapistEmail,
        ...(limit && { limit: limit.toString() })
      });

      console.log("📊 getBillingHistory API call");
      return await makeApiCall(`/api/billing/history?${params}`);
    } catch (error) {
      return handleApiError(error as Error, 'getBillingHistory');
    }
  },

  async getBillingPeriodDetails(billingPeriodId: number): Promise<any> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for billing operations");
    }

    try {
      validateRequired(billingPeriodId, 'Billing period ID');

      console.log("📊 getBillingPeriodDetails API call:", billingPeriodId);
      return await makeApiCall(`/api/monthly-billing/${billingPeriodId}`);
    } catch (error) {
      return handleApiError(error as Error, 'getBillingPeriodDetails');
    }
  },

  async recordBillingPeriodPayment(billingPeriodId: number, paymentData: any): Promise<any> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for billing operations");
    }

    try {
      validateRequired(billingPeriodId, 'Billing period ID');
      validateRequired(paymentData, 'Payment data');

      console.log("💳 recordBillingPeriodPayment API call:", { billingPeriodId, paymentData });
      return await makeApiCall(`/api/monthly-billing/${billingPeriodId}/payments`, {
        method: "POST",
        body: JSON.stringify(paymentData),
      });
    } catch (error) {
      return handleApiError(error as Error, 'recordBillingPeriodPayment');
    }
  },

  async voidBillingPeriod(billingPeriodId: number, therapistEmail: string, reason: string): Promise<any> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for billing operations");
    }

    try {
      validateRequired(billingPeriodId, 'Billing period ID');
      validateRequired(therapistEmail, 'Therapist email');
      validateEmail(therapistEmail);
      validateRequired(reason, 'Void reason');

      console.log("🗑️ voidBillingPeriod API call:", { billingPeriodId, reason });
      return await makeApiCall(`/api/monthly-billing/${billingPeriodId}/void`, {
        method: "PUT",
        body: JSON.stringify({ therapistEmail, reason }),
      });
    } catch (error) {
      return handleApiError(error as Error, 'voidBillingPeriod');
    }
  },

  async deleteBillingPeriodPayment(paymentId: number): Promise<any> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for billing operations");
    }

    try {
      validateRequired(paymentId, 'Payment ID');

      console.log("🗑️ deleteBillingPeriodPayment API call:", paymentId);
      return await makeApiCall(`/api/monthly-billing/payments/${paymentId}`, {
        method: "DELETE",
      });
    } catch (error) {
      return handleApiError(error as Error, 'deleteBillingPeriodPayment');
    }
  },

  async exportMonthlyBillingCSV(therapistEmail: string, year: number, month: number): Promise<Blob> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for billing operations");
    }

    try {
      validateRequired(therapistEmail, 'Therapist email');
      validateEmail(therapistEmail);
      validateRequired(year, 'Year');
      validateRequired(month, 'Month');

      const params = new URLSearchParams({
        therapistEmail,
        year: year.toString(),
        month: month.toString()
      });

      console.log("📊 exportMonthlyBillingCSV API call");
      return await makeApiBlobCall(`/api/monthly-billing/export-csv?${params}`);
    } catch (error) {
      return handleApiError(error as Error, 'exportMonthlyBillingCSV');
    }
  },
};