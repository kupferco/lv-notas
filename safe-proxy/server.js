require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const admin = require('firebase-admin');

// Initialize Firebase Admin with your service account
const serviceAccount = require('./service-account-key.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


const app = express();

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

// Updated CORS configuration
const corsOptions = {
    origin: [
        'https://lv-notas.web.app',
        'https://lv-notas.firebaseapp.com',
        'http://localhost:8081',
        'http://localhost:19006'
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-API-Key', 'Authorization'],
    credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(limiter);
app.use(express.json());

// Authentication middleware
const authenticateRequest = async (req, res, next) => {
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

// Protected endpoint example
app.get('/api/proxy', authenticateRequest, async (req, res) => {
    try {
        // Here you'll make the request to the actual API using your protected key
        // Example: const response = await fetch('https://api.example.com/data', {
        //     headers: { 'Authorization': process.env.SERVER_API_KEY }
        // });
        res.json({ message: 'Authenticated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add this with your other endpoints
app.get('/api/key', authenticateRequest, (req, res) => {
    try {
        res.json({ apiKey: process.env.AIRTABLE_API_KEY });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});