import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import admin from 'firebase-admin';
import { readFile } from 'fs/promises';
import path from 'path';

// Declare a custom interface to extend the Request type
declare global {
    namespace Express {
        interface Request {
            user?: admin.auth.DecodedIdToken;
        }
    }
}

function getWebhookUrl(): string {
    if (process.env.NODE_ENV === 'development') {
        const webhookUrl = process.env.WEBHOOK_URL_LOCAL;
        if (!webhookUrl) {
            throw new Error('WEBHOOK_URL_LOCAL is not set in development environment');
        }
        return webhookUrl;
    } else {
        return process.env.WEBHOOK_URL_LIVE || 'https://clinic-api-141687742631.us-central1.run.app';
    }
}

const webhookUrl = getWebhookUrl();

// Import routes explicitly
import checkinRoute from './routes/checkin.js';
import calendarWebhookRoute from './routes/calendar-webhook.js';
import patientsRoute from './routes/patients.js';
import sessionsRoute from './routes/sessions.js';
import therapistsRoute from './routes/therapists.js';
import { googleCalendarService } from './services/google-calendar.js';
import calendarsRoute from './routes/calendars.js';
import onboardingRoute from './routes/onboarding.js';
import paymentsRoute from './routes/payments.js';
import importRoute from './routes/import.js';
import pool from './config/database.js';

const app = express();
app.set('trust proxy', 1);

// Create a type-safe middleware wrapper
const authenticateRequest = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const handler = async () => {

        const clientApiKey = req.header('X-API-Key')?.normalize();
        const firebaseToken = req.header('Authorization')?.split('Bearer ')[1];

        console.log('=== Auth Request ===');
        console.log('Path:', req.path);
        // console.log('API Key received:', clientApiKey ? 'Yes' : 'No');
        // console.log('Firebase token received:', firebaseToken ? 'Yes' : 'No');
        // console.log('Expected API Key:', process.env.SAFE_PROXY_KEY);
        // console.log('Headers:', req.headers);

        // Check API key
        if (!clientApiKey || clientApiKey !== process.env.SAFE_PROXY_KEY) {
            console.log('API Key mismatch');

            // Temporarily add debug info to the error response
            return res.status(401).json({
                error: `Unauthorized - Invalid API Key`,
                debug: {
                    receivedKeyPreview: clientApiKey ? clientApiKey.substring(0, 10) + '...' : 'Missing',
                    expectedKeyPreview: process.env.SAFE_PROXY_KEY ? process.env.SAFE_PROXY_KEY.substring(0, 10) + '...' : 'Missing',
                    receivedLength: clientApiKey ? clientApiKey.length : 0,
                    expectedLength: process.env.SAFE_PROXY_KEY ? process.env.SAFE_PROXY_KEY.length : 0,
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Skip Firebase token verification for localhost
        const isLocalhost = req.headers.origin &&
            (req.headers.origin.includes('localhost:8081') ||
                req.headers.origin.includes('localhost:19006'));

        if (isLocalhost) {
            console.log('Localhost detected - but still going ahead with firebase auth');
            // return next();
        }

        // Verify Firebase token for production
        try {
            if (!firebaseToken) {
                return res.status(401).json({ error: 'Unauthorized - Missing Firebase Token' });
            }

            const decodedToken = await admin.auth().verifyIdToken(firebaseToken);

            // Optional: additional verification (disabled!!)
            // if (decodedToken.email !== 'daniel@kupfer.co') {
            //     return res.status(403).json({ error: 'Forbidden' });
            // }

            // Attach user info to request if needed
            req.user = decodedToken;
            next();
        } catch (error) {
            console.error('Token verification error:', error);
            return res.status(401).json({ error: 'Unauthorized - Invalid Token' });
        }
    };

    handler().catch(next);
};

export default authenticateRequest;

// Set up routes
const setupRoutes = () => {
    // Use routes explicitly
    app.use('/api/patients', authenticateRequest, patientsRoute);
    app.use('/api/sessions', authenticateRequest, sessionsRoute);
    app.use('/api/therapists', authenticateRequest, therapistsRoute);
    app.use('/api/checkin', authenticateRequest, checkinRoute);
    app.use('/api/calendar-webhook', calendarWebhookRoute);
    app.use('/api/calendars', authenticateRequest, calendarsRoute);
    app.use('/api/onboarding', authenticateRequest, onboardingRoute);
    app.use('/api/payments', authenticateRequest, paymentsRoute);
    app.use('/api/import', authenticateRequest, importRoute);

    // app.post('/api/setup-webhook', authenticateRequest, async (req: Request, res: Response) => {
    // Replace your existing setup-webhook endpoint (around line 120) with this:
    app.post('/api/setup-webhook', async (req: Request, res: Response) => {
        try {
            // Get the current webhook URL from environment (not the startup value)
            const currentWebhookUrl = process.env.WEBHOOK_URL || process.env.WEBHOOK_URL_LOCAL;

            if (!currentWebhookUrl) {
                res.status(400).json({ error: 'WEBHOOK_URL not set in environment' });
                return;
            }

            console.log('Current webhook URL:', currentWebhookUrl);
            const result = await googleCalendarService.createWebhook(currentWebhookUrl);
            res.json({ message: 'Webhook setup successful', result, webhookUrl: currentWebhookUrl });
        } catch (error: any) {
            console.error('Webhook setup failed:', error);
            res.status(500).json({ error: 'Failed to setup webhook' });
        }
    });

    // Add this endpoint to server.ts
    app.post('/api/update-webhook-url', async (req: Request, res: Response) => {
        try {
            const { webhookUrl } = req.body;

            if (!webhookUrl) {
                res.status(400).json({ error: 'webhookUrl required' });
                return;
            }

            // Dynamically update the running server's environment
            process.env.WEBHOOK_URL = webhookUrl;
            process.env.WEBHOOK_URL_LOCAL = webhookUrl;

            console.log("🔄 Dynamically updated WEBHOOK_URL:", webhookUrl);

            res.json({
                message: 'Webhook URL updated successfully',
                newUrl: webhookUrl
            });
        } catch (error: any) {
            console.error('Error updating webhook URL:', error);
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/debug-webhook', async (req: Request, res: Response) => {
        try {
            await googleCalendarService.debugWebhookWatch(webhookUrl);
            res.json({ message: 'Webhook debug completed' });
        } catch (error) {
            console.error('Webhook debug failed:', error);
            res.status(500).json({ error: 'Webhook debug failed' });
        }
    });

    // Add this to your server.ts file temporarily for debugging
    app.get('/api/debug-webhook', async (req: Request, res: Response) => {
        try {
            console.log("🔍 Checking webhook status...");

            // Check database for active webhooks
            const webhooks = await pool.query('SELECT * FROM calendar_webhooks ORDER BY created_at DESC');
            console.log(`📋 Found ${webhooks.rows.length} webhooks in database:`);

            webhooks.rows.forEach((webhook, index) => {
                console.log(`${index + 1}. Channel ID: ${webhook.channel_id}`);
                console.log(`   Resource ID: ${webhook.resource_id}`);
                console.log(`   Expiration: ${webhook.expiration}`);
                console.log(`   Created: ${webhook.created_at}`);
                console.log(`   Expired: ${new Date() > new Date(webhook.expiration) ? 'YES' : 'NO'}`);
            });

            // Check current WEBHOOK_URL
            console.log(`🌐 Current WEBHOOK_URL: ${process.env.WEBHOOK_URL}`);

            // Test if webhook URL is accessible
            if (process.env.WEBHOOK_URL) {
                try {
                    const testResponse = await fetch(`${process.env.WEBHOOK_URL}/api/test`);
                    console.log(`📡 Webhook URL test: ${testResponse.status} ${testResponse.statusText}`);
                } catch (fetchError: any) {
                    console.log(`❌ Webhook URL not accessible: ${fetchError.message}`);
                }
            }

            res.json({
                webhooks: webhooks.rows,
                webhookUrl: process.env.WEBHOOK_URL,
                message: "Check console for detailed webhook status"
            });

        } catch (error: any) {
            console.error("Error checking webhook status:", error);
            res.status(500).json({ error: error.message });
        }
    });

    // Add this to your server.ts file for testing

    app.all('/api/calendar-webhook-test', async (req: Request, res: Response) => {
        console.log('\n🔔 TEST WEBHOOK CALLED!');
        console.log('Method:', req.method);
        console.log('Headers:', JSON.stringify(req.headers, null, 2));
        console.log('Body:', JSON.stringify(req.body, null, 2));

        res.status(200).json({
            message: 'Webhook test received!',
            timestamp: new Date().toISOString(),
            method: req.method,
            headers: req.headers,
            body: req.body
        });
    });

    // Add this to server.ts to test Google-specific headers
    app.all('/api/calendar-webhook', async (req: Request, res: Response) => {
        const timestamp = new Date().toISOString();

        console.log(`\n🔔 WEBHOOK CALLED! [${timestamp}]`);
        console.log("Method:", req.method);
        console.log("URL:", req.url);
        console.log("User-Agent:", req.get('User-Agent'));

        // Log Google-specific headers
        const googleHeaders = {
            'x-goog-channel-id': req.get('x-goog-channel-id'),
            'x-goog-resource-state': req.get('x-goog-resource-state'),
            'x-goog-resource-id': req.get('x-goog-resource-id'),
            'x-goog-resource-uri': req.get('x-goog-resource-uri'),
            'x-goog-message-number': req.get('x-goog-message-number')
        };

        console.log("Google Headers:", googleHeaders);
        console.log("All Headers:", JSON.stringify(req.headers, null, 2));
        console.log("Body:", JSON.stringify(req.body, null, 2));

        // Always respond with 200 OK immediately
        res.status(200).send('OK');

        // Continue processing...
        const resourceState = req.get('x-goog-resource-state');
        if (resourceState === 'sync') {
            console.log("✅ Sync notification received - webhook is working!");
        } else if (resourceState === 'exists') {
            console.log("🔄 Change notification received - processing...");
        }
    });

    // Add this to your server.ts file to verify webhook status with Google
    // app.get('/api/verify-webhook', async (req, res) => {
    //     try {
    //         console.log("🔍 Verifying webhook with Google Calendar...");


    //         // Get webhooks from our database
    //         const webhooks = await pool.query('SELECT * FROM calendar_webhooks ORDER BY created_at DESC LIMIT 1');

    //         if (webhooks.rows.length === 0) {
    //             return res.json({
    //                 status: 'no_webhooks',
    //                 message: 'No webhooks found in database'
    //             });
    //         }

    //         const webhook = webhooks.rows[0];
    //         console.log(`📋 Found webhook: ${webhook.channel_id}`);

    //         // Try to stop the webhook - if it succeeds, the webhook was active
    //         // If it fails with 404, the webhook was already dead on Google's side
    //         try {
    //             await googleCalendarService.stopWebhook(webhook.channel_id, webhook.resource_id);

    //             // Remove from database since we just stopped it
    //             await pool.query('DELETE FROM calendar_webhooks WHERE channel_id = $1', [webhook.channel_id]);

    //             console.log("✅ Webhook was active on Google's side (successfully stopped)");

    //             res.json({
    //                 status: 'was_active',
    //                 message: 'Webhook was active but has been stopped. You can now re-register.',
    //                 webhook: {
    //                     channelId: webhook.channel_id,
    //                     expiration: webhook.expiration
    //                 }
    //             });

    //         } catch (stopError: any) {
    //             console.log("❌ Error stopping webhook:", stopError.message);

    //             if (stopError.message.includes('404') || stopError.message.includes('not found')) {
    //                 // Webhook was already dead on Google's side
    //                 console.log("💀 Webhook was dead on Google's side");

    //                 // Clean up our database
    //                 await pool.query('DELETE FROM calendar_webhooks WHERE channel_id = $1', [webhook.channel_id]);

    //                 res.json({
    //                     status: 'was_dead',
    //                     message: 'Webhook was dead on Google\'s side. Database cleaned up. You should re-register.',
    //                     webhook: {
    //                         channelId: webhook.channel_id,
    //                         expiration: webhook.expiration
    //                     }
    //                 });
    //             } else {
    //                 res.json({
    //                     status: 'error',
    //                     message: 'Error checking webhook status',
    //                     error: stopError.message
    //                 });
    //             }
    //         }

    //     } catch (error: any) {
    //         console.error("Error verifying webhook:", error);
    //         res.status(500).json({
    //             status: 'error',
    //             error: error.message
    //         });
    //     }
    // });

    // Add this to server.ts to verify calendar access
    app.get('/api/verify-calendar', async (req: Request, res: Response) => {
        try {
            console.log("🔍 Verifying calendar access...");
            console.log("Calendar ID:", process.env.GOOGLE_CALENDAR_ID);

            // Try to fetch events from the calendar
            const events = await googleCalendarService.getRecentEvents();
            console.log(`📅 Found ${events?.length || 0} recent events in calendar`);

            // Try to fetch events from a longer timeframe
            const allEvents = await googleCalendarService.getUpdatedEventsSince(
                new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            );
            console.log(`📅 Found ${allEvents?.length || 0} events in last 24 hours`);

            if (allEvents && allEvents.length > 0) {
                console.log("Recent events:");
                allEvents.forEach((event, index) => {
                    console.log(`${index + 1}. "${event.summary}" - ${event.start?.dateTime || event.start?.date}`);
                });
            }

            res.json({
                calendarId: process.env.GOOGLE_CALENDAR_ID,
                recentEvents: events?.length || 0,
                last24Hours: allEvents?.length || 0,
                events: allEvents?.slice(0, 5).map(e => ({
                    id: e.id,
                    summary: e.summary,
                    start: e.start?.dateTime || e.start?.date,
                    status: e.status
                })) || []
            });

        } catch (error: any) {
            console.error("❌ Error verifying calendar:", error);
            res.status(500).json({
                error: error.message,
                calendarId: process.env.GOOGLE_CALENDAR_ID
            });
        }
    });


    // Add to server.ts
    app.get('/api/check-recent-events', async (req: Request, res: Response) => {
        try {
            console.log("🔍 Checking for recent calendar changes...");

            const events = await googleCalendarService.getRecentEvents();
            console.log(`📅 Found ${events?.length || 0} events updated in last 30 seconds`);

            if (events && events.length > 0) {
                console.log("Recent events:");
                events.forEach((event, index) => {
                    console.log(`${index + 1}. "${event.summary}" - Updated: ${event.updated}`);
                });
            }

            res.json({
                recentEvents: events?.length || 0,
                events: events?.map(e => ({
                    id: e.id,
                    summary: e.summary,
                    updated: e.updated,
                    status: e.status
                })) || []
            });

        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // Protected endpoint example
    app.get('/api/proxy', authenticateRequest, (req: Request, res: Response) => {
        try {
            res.json({ message: 'Authenticated successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // API key endpoint
    app.get('/api/key', authenticateRequest, (req: Request, res: Response) => {
        try {
            res.json({ apiKey: process.env.AIRTABLE_API_KEY });
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.get('/api/test', (req, res) => {
        res.json({ message: 'API is working' });
    });
};

// Initialize app
const initializeApp = async () => {
    console.log('Initializing sql...');
    // Test database connection first
    try {
        const client = await pool.connect();
        console.log('Successfully connected to PostgreSQL');
        await client.release();
    } catch (err) {
        console.error('Error connecting to PostgreSQL:', err);
        process.exit(1); // Exit if we can't connect to the database
    }

    console.log('Setting up webhook...');
    console.log('Webhook Url: ', webhookUrl);
    // Automatically set up webhook if WEBHOOK_URL is available
    // if (webhookUrl) {
    //     try {
    //         await googleCalendarService.createWebhook(webhookUrl);
    //         console.log('Webhook automatically set up :: ', webhookUrl);
    //     } catch (error) {
    //         console.error('Failed to automatically set up webhook:', error);
    //     }
    // }

    // Load service account key
    const serviceAccount = JSON.parse(
        await readFile(path.resolve('./service-account-key.json'), 'utf8')
    );

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    // Middleware setup remains the same
    app.use(cors({
        origin: [
            'https://lv-notas.web.app',
            'https://lv-notas.firebaseapp.com',
            'http://localhost:8081',
            'http://localhost:19006'
        ],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'X-API-Key', 'Authorization', 'X-Calendar-Token'],
        credentials: true
    }));

    app.use(rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 100
    }));

    app.use(express.json());

    // Set up routes
    setupRoutes();

    // Start server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🌐 Server running on port ${PORT}`);
    });
};

// Run the initialization
initializeApp().catch(error => {
    console.error('Failed to initialize app:', error);
});