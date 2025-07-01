// clinic-api/src/routes/import.ts
import express, { Router, Request, Response, NextFunction } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import pool from "../config/database.js";
import { googleCalendarService } from "../services/google-calendar.js";

const router: Router = Router();

// Type definitions for import requests (matching your existing schema)
interface PatientImportData {
    name: string;
    email: string;
    phone: string;
    sessionPrice: number; // in cents (matches `preco` column)
    therapyStartDate?: string; // Optional (matches `therapy_start_date`)
    lvNotasBillingStartDate: string; // Required (matches `lv_notas_billing_start_date`)
    sessions: Array<{
        date: string;
        googleEventId: string;
        status: 'agendada' | 'compareceu' | 'cancelada';
    }>;
}

interface ImportPatientBody {
    therapistEmail: string;
    patientData: PatientImportData;
}

// Type-safe async handler
const asyncHandler = (
    handler: (
        req: Request<ParamsDictionary, any, ImportPatientBody>,
        res: Response
    ) => Promise<Response | void>
) => {
    return async (
        req: Request<ParamsDictionary, any, ImportPatientBody>,
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

// Import patient with all their sessions
router.post("/patient-with-sessions", asyncHandler(async (req, res) => {
    const { therapistEmail, patientData } = req.body;

    console.log('📥 Importing patient:', patientData.name);
    console.log('📧 Therapist:', therapistEmail);
    console.log('📅 Sessions count:', patientData.sessions.length);

    // Start transaction
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Get therapist ID
        const therapistResult = await client.query(
            "SELECT id FROM therapists WHERE email = $1",
            [therapistEmail]
        );

        if (!therapistResult.rows[0]) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "Therapist not found" });
        }

        const therapistId = therapistResult.rows[0].id;

        // 2. Check if patient already exists (by email and therapist)
        let patientId: number;
        const existingPatient = await client.query(
            "SELECT id FROM patients WHERE email = $1 AND therapist_id = $2",
            [patientData.email.toLowerCase(), therapistId]
        );

        if (existingPatient.rows[0]) {
            // Update existing patient with new information
            patientId = existingPatient.rows[0].id;
            await client.query(
                `UPDATE patients 
         SET nome = $1, telefone = $2, preco = $3, therapy_start_date = $4, lv_notas_billing_start_date = $5
         WHERE id = $6`,
                [
                    patientData.name,
                    patientData.phone,
                    patientData.sessionPrice,
                    patientData.therapyStartDate || null,
                    patientData.lvNotasBillingStartDate,
                    patientId
                ]
            );
            console.log('✅ Updated existing patient:', patientId);
        } else {
            // Create new patient using your schema columns
            const patientResult = await client.query(
                `INSERT INTO patients 
         (nome, email, telefone, preco, therapist_id, therapy_start_date, lv_notas_billing_start_date, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
         RETURNING id`,
                [
                    patientData.name,
                    patientData.email.toLowerCase(),
                    patientData.phone,
                    patientData.sessionPrice,
                    therapistId,
                    patientData.therapyStartDate || null,
                    patientData.lvNotasBillingStartDate
                ]
            );
            patientId = patientResult.rows[0].id;
            console.log('✅ Created new patient:', patientId);
        }

        // 3. Import sessions
        const sessionIds: string[] = [];

        for (const session of patientData.sessions) {
            // Check if session already exists
            const existingSession = await client.query(
                "SELECT id FROM sessions WHERE google_calendar_event_id = $1",
                [session.googleEventId]
            );

            if (existingSession.rows[0]) {
                // Update existing session
                await client.query(
                    `UPDATE sessions 
           SET date = $1, patient_id = $2, therapist_id = $3, status = $4
           WHERE google_calendar_event_id = $5`,
                    [
                        session.date,
                        patientId,
                        therapistId,
                        session.status,
                        session.googleEventId
                    ]
                );
                sessionIds.push(existingSession.rows[0].id);
                console.log('✅ Updated existing session:', session.googleEventId);
            } else {
                // Create new session
                const sessionResult = await client.query(
                    `INSERT INTO sessions 
   (date, google_calendar_event_id, patient_id, therapist_id, status, session_price, created_at)
   VALUES ($1, $2, $3, $4, $5, (SELECT preco FROM patients WHERE id = $3), CURRENT_TIMESTAMP)
   RETURNING id`,
                    [
                        session.date,
                        session.googleEventId,
                        patientId,
                        therapistId,
                        session.status
                    ]
                );
                sessionIds.push(sessionResult.rows[0].id);
                console.log('✅ Created new session:', session.googleEventId);
            }
        }

        // 4. Set initial payment status for sessions after LV Notas billing start date
        const lvNotasBillingStartDate = new Date(patientData.lvNotasBillingStartDate);

        for (const session of patientData.sessions) {
            const sessionDate = new Date(session.date);

            if (sessionDate >= lvNotasBillingStartDate) {
                // Set payment status based on session date
                const paymentStatus = sessionDate <= new Date() ? 'pending' : 'not_billed';

                await client.query(
                    `UPDATE sessions 
           SET payment_status = $1
           WHERE google_calendar_event_id = $2`,
                    [paymentStatus, session.googleEventId]
                );
            }
        }

        await client.query('COMMIT');
        console.log('🎉 Import completed successfully');

        return res.json({
            message: "Patient and sessions imported successfully",
            patientId: patientId.toString(),
            sessionIds: sessionIds.map(id => id.toString()),
            stats: {
                sessionsImported: sessionIds.length,
                patientCreated: !existingPatient.rows[0]
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Import failed:', error);
        throw error;
    } finally {
        client.release();
    }
}));

router.get("/calendar/events-for-import", asyncHandler(async (req, res) => {
    try {
        const { calendarId, startDate, endDate, useUserAuth } = req.query;

        const calendarIdStr = typeof calendarId === 'string' ? calendarId : null;
        const startDateStr = typeof startDate === 'string' ? startDate : null;
        const endDateStr = typeof endDate === 'string' ? endDate : null;
        const useUserAuthFlag = useUserAuth === 'true';

        if (!calendarIdStr || !startDateStr || !endDateStr) {
            return res.status(400).json({
                error: "Missing required parameters: calendarId, startDate, endDate"
            });
        }

        console.log('📅 Fetching events for import:', {
            calendarId: calendarIdStr,
            startDate: startDateStr,
            endDate: endDateStr,
            useUserAuth: useUserAuthFlag
        });

        let events;

        if (useUserAuthFlag) {
            // Extract user's Google access token from headers
            const userAccessToken = req.headers['x-google-access-token'] as string;

            if (!userAccessToken) {
                return res.status(401).json({
                    error: "User Google access token required for calendar import"
                });
            }

            console.log('🔑 Using user OAuth token for calendar access');
            events = await googleCalendarService.getEventsInRangeWithUserAuth(
                calendarIdStr,
                startDateStr,
                endDateStr,
                userAccessToken
            );
        } else {
            // Fallback to service account (existing method)
            events = await googleCalendarService.getEventsInRange(
                calendarIdStr,
                startDateStr,
                endDateStr
            );
        }

        console.log(`📊 Found ${events.length} events in range`);

        res.json(events);

    } catch (error) {
        console.error('❌ DETAILED ERROR in calendar events import:', error);
        res.status(500).json({
            error: "Failed to fetch calendar events",
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));

export default router;