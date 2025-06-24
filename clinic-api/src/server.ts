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
        console.log('API Key received:', clientApiKey ? 'Yes' : 'No');
        console.log('Firebase token received:', firebaseToken ? 'Yes' : 'No');
        console.log('Expected API Key:', process.env.SAFE_PROXY_KEY);
        console.log('Headers:', req.headers);

        // Check API key
        if (!clientApiKey || clientApiKey !== process.env.SAFE_PROXY_KEY) {
            console.log('API Key mismatch');
            return res.status(401).json({ error: `Unauthorized - Invalid API Key` });
        }
        // ... rest of the function
        // Check API key
        if (!clientApiKey || clientApiKey !== process.env.SAFE_PROXY_KEY) {
            return res.status(401).json({ error: `Unauthorized - Invalid API Key` });
        }

        // Skip Firebase token verification for localhost
        const isLocalhost = req.headers.origin &&
            (req.headers.origin.includes('localhost:8081') ||
                req.headers.origin.includes('localhost:19006'));

        if (isLocalhost) {
            console.log('Localhost detected - skipping Firebase auth');
            return next();
        }

        // Verify Firebase token for production
        try {
            if (!firebaseToken) {
                return res.status(401).json({ error: 'Unauthorized - Missing Firebase Token' });
            }

            const decodedToken = await admin.auth().verifyIdToken(firebaseToken);

            // Optional: additional verification
            if (decodedToken.email !== 'daniel@kupfer.co') {
                return res.status(403).json({ error: 'Forbidden' });
            }

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

    app.post('/api/setup-webhook', authenticateRequest, async (req: Request, res: Response) => {
        try {
            const result = await googleCalendarService.createWebhook(webhookUrl);
            res.json({ message: 'Webhook setup successful', result });
        } catch (error) {
            console.error('Webhook setup failed:', error);
            res.status(500).json({ error: 'Failed to setup webhook' });
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
    if (webhookUrl) {
        try {
            await googleCalendarService.createWebhook(webhookUrl);
            console.log('Webhook automatically set up');
        } catch (error) {
            console.error('Failed to automatically set up webhook:', error);
        }
    }

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
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'X-API-Key', 'Authorization'],
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