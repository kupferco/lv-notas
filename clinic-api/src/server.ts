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

// Import routes explicitly
import checkinRoute from './routes/checkin.js';

const app = express();

// Create a type-safe middleware wrapper
const authenticateRequest = (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  const handler = async () => {
    const clientApiKey = req.header('X-API-Key');
    const firebaseToken = req.header('Authorization')?.split('Bearer ')[1];

    // Check API key
    if (!clientApiKey || clientApiKey !== process.env.SAFE_PROXY_KEY) {
      return res.status(401).json({ error: `Unauthorized - Invalid API Key` });
    }

    // Skip Firebase token verification for localhost
    const isLocalhost = req.headers.origin &&
      (req.headers.origin.includes('localhost:8081') ||
        req.headers.origin.includes('localhost:19006'));

    if (isLocalhost) {
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
    app.use('/api/checkin', authenticateRequest, checkinRoute);

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
};

// Initialize app
const initializeApp = async () => {
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
        console.log(`Server running on port ${PORT}`);
    });
};

// Run the initialization
initializeApp().catch(error => {
    console.error('Failed to initialize app:', error);
});