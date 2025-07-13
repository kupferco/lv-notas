// clinic-api/src/routes/monthly-billing.ts
import express, { Router, Request, Response, NextFunction } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import { monthlyBillingService } from "../services/monthly-billing.js";
import pool from "../config/database.js";

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
        const summary = await monthlyBillingService.getBillingSummary(
            therapistEmail,
            year,
            month
        );

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

export default router;