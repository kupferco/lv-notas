// clinic-api/src/routes/monthly-billing.ts
import express, { Router, Request, Response, NextFunction } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import { monthlyBillingService } from "../services/monthly-billing.js";
import pool from "../config/database.js";
import { googleCalendarService } from "../services/google-calendar.js";

const router: Router = Router();

// Type-safe handler
const asyncHandler = (
    handler: (
        req: Request<ParamsDictionary, any, any>,
        res: Response
    ) => Promise<Response | void>
) => {
    return async (
        req: Request<ParamsDictionary, any, any>,
        res: Response,
        next: NextFunction
    ) => {
        try {
            await handler(req, res);
        } catch (error) {
            next(error);
        }
    };
};

// GET /api/monthly-billing/summary?therapistEmail=&year=&month=
// Get billing summary for a therapist for a specific month
router.get("/summary", asyncHandler(async (req, res) => {
    const therapistEmail = req.query.therapistEmail as string;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;

    if (!therapistEmail) {
        return res.status(400).json({ error: "therapistEmail is required" });
    }

    if (month < 1 || month > 12) {
        return res.status(400).json({ error: "month must be between 1 and 12" });
    }

    try {
        const userAccessToken = req.headers['x-calendar-token'] as string;
        const summary = await monthlyBillingService.getBillingSummary(
            therapistEmail,
            year,
            month,
            userAccessToken
        );

        console.log('=== MONTHLY BILLING SUMMARY DEBUG ===');
        console.log('therapistEmail:', therapistEmail);
        console.log('year:', year, 'month:', month);
        console.log('summary:', summary);
        console.log('userAccessToken:', userAccessToken ? 'Present' : 'Missing');
        console.log('Headers x-calendar-token:', req.headers['x-calendar-token'] ? 'Present' : 'Missing');
        console.log('Headers x-google-access-token:', req.headers['x-google-access-token'] ? 'Present' : 'Missing');

        return res.json({
            year,
            month,
            summary
        });
    } catch (error) {
        console.error('Error getting billing summary:', error);
        return res.status(500).json({
            error: "Failed to get billing summary",
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));

// POST /api/monthly-billing/process
// Process monthly charges for a specific patient
router.post("/process", asyncHandler(async (req, res) => {
    const { therapistEmail, patientId, year, month } = req.body;
    const userAccessToken = req.headers['x-google-access-token'] as string;

    if (!therapistEmail || !patientId || !year || !month) {
        return res.status(400).json({
            error: "therapistEmail, patientId, year, and month are required"
        });
    }

    if (month < 1 || month > 12) {
        return res.status(400).json({ error: "month must be between 1 and 12" });
    }

    try {
        const billingPeriod = await monthlyBillingService.processMonthlyCharges(
            therapistEmail,
            parseInt(patientId),
            parseInt(year),
            parseInt(month),
            userAccessToken
        );

        return res.json({
            message: "Monthly charges processed successfully",
            billingPeriod
        });
    } catch (error) {
        console.error('Error processing monthly charges:', error);
        return res.status(500).json({
            error: "Failed to process monthly charges",
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));

// PUT /api/monthly-billing/:billingPeriodId/void
// Void a billing period
router.put("/:billingPeriodId/void", asyncHandler(async (req, res) => {
    const { billingPeriodId } = req.params;
    const { therapistEmail, reason } = req.body;

    if (!therapistEmail) {
        return res.status(400).json({ error: "therapistEmail is required" });
    }

    try {
        const success = await monthlyBillingService.voidBillingPeriod(
            parseInt(billingPeriodId),
            therapistEmail,
            reason
        );

        if (success) {
            return res.json({
                message: "Billing period voided successfully",
                billingPeriodId: parseInt(billingPeriodId)
            });
        } else {
            return res.status(400).json({
                error: "Cannot void billing period",
                details: "Period may have payments or is already voided"
            });
        }
    } catch (error) {

    }
}));

// GET /api/monthly-billing/:billingPeriodId
// Get billing period details by ID
router.get("/:billingPeriodId", asyncHandler(async (req, res) => {
    const { billingPeriodId } = req.params;
    const therapistEmail = req.query.therapistEmail as string;

    if (!billingPeriodId || isNaN(parseInt(billingPeriodId))) {
        return res.status(400).json({ error: "Valid billingPeriodId is required" });
    }

    try {
        const billingPeriod = await monthlyBillingService.getBillingPeriodDetails(
            parseInt(billingPeriodId)
        );

        return res.json(billingPeriod);
    } catch (error) {
        console.error('Error getting billing period details:', error);
        return res.status(500).json({
            error: "Failed to get billing period details",
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));

// Add this new debug route
router.get("/debug-calendars", asyncHandler(async (req, res) => {
    const therapistEmail = req.query.therapistEmail as string;
    const userAccessToken = req.headers['x-calendar-token'] as string;

    if (!therapistEmail || !userAccessToken) {
        return res.status(400).json({ error: "therapistEmail and userAccessToken required" });
    }

    try {
        // List calendars the user has access to
        const calendars = await googleCalendarService.listUserCalendars(userAccessToken);

        // Get therapist's stored calendar ID
        const therapistResult = await pool.query(
            'SELECT google_calendar_id FROM therapists WHERE email = $1',
            [therapistEmail]
        );

        const storedCalendarId = therapistResult.rows[0]?.google_calendar_id;

        return res.json({
            message: "Calendar debug info",
            userAccessibleCalendars: calendars,
            storedCalendarId: storedCalendarId,
            canAccessStoredCalendar: calendars.some(cal => cal.id === storedCalendarId)
        });
    } catch (error) {
        console.error('Calendar debug error:', error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error',
            details: error
        });
    }
}));

// POST /api/monthly-billing/:billingPeriodId/payments
// Record a payment for a billing period
router.post("/:billingPeriodId/payments", asyncHandler(async (req, res) => {
    const { billingPeriodId } = req.params;
    const { amount, paymentMethod, paymentDate, therapistEmail, referenceNumber, notes } = req.body;

    if (!billingPeriodId || isNaN(parseInt(billingPeriodId))) {
        return res.status(400).json({ error: "Valid billingPeriodId is required" });
    }

    if (!amount || !paymentMethod || !paymentDate || !therapistEmail) {
        return res.status(400).json({
            error: "amount, paymentMethod, paymentDate, and therapistEmail are required"
        });
    }

    try {
        const payment = await monthlyBillingService.recordPayment(
            parseInt(billingPeriodId),
            parseInt(amount), // Amount should be in cents
            paymentMethod,
            new Date(paymentDate),
            therapistEmail,
            referenceNumber,
            notes
        );

        return res.json({
            message: "Payment recorded successfully",
            payment
        });
    } catch (error) {
        console.error('Error recording payment:', error);
        return res.status(500).json({
            error: "Failed to record payment",
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));

// DELETE /api/monthly-billing/payments/:paymentId
// Delete a payment (optional - for completeness)
router.delete("/payments/:paymentId", asyncHandler(async (req, res) => {
    const { paymentId } = req.params;

    if (!paymentId || isNaN(parseInt(paymentId))) {
        return res.status(400).json({ error: "Valid paymentId is required" });
    }

    try {
        const success = await monthlyBillingService.deletePayment(parseInt(paymentId));

        if (success) {
            return res.json({
                message: "Payment deleted successfully",
                paymentId: parseInt(paymentId)
            });
        } else {
            return res.status(404).json({
                error: "Payment not found or could not be deleted"
            });
        }
    } catch (error) {
        console.error('Error deleting payment:', error);
        return res.status(500).json({
            error: "Failed to delete payment",
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));

export default router;