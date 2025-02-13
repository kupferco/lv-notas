require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const app = express();

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

console.log(process.env.ALLOWED_ORIGINS)

// Middleware
app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));
app.use(limiter);
app.use(express.json());

// Authentication middleware
const authenticateRequest = (req, res, next) => {
    const clientApiKey = req.header('X-API-Key');

    if (!clientApiKey || clientApiKey !== process.env.SAFE_PROXY_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
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