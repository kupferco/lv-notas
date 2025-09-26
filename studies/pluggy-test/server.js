// server.js
// Minimal Express server to test Pluggy Connect widget and transaction retrieval

import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

const CLIENT_ID = process.env.PLUGGY_CLIENT_ID;
const CLIENT_SECRET = process.env.PLUGGY_CLIENT_SECRET;
const STORED_ITEM_ID = process.env.PLUGGY_ITEM_ID; // We'll store this manually for now
const API_URL = 'https://api.pluggy.ai';

app.use(express.json());
app.use(express.static('public'));

// Serve Pluggy Connect SDK from node_modules
app.get('/pluggy-connect.js', (req, res) => {
  try {
    const pluggyPath = path.join(__dirname, 'node_modules', 'pluggy-connect-sdk', 'dist', 'pluggy-connect.min.js');
    res.sendFile(pluggyPath);
  } catch (error) {
    console.error('Error serving Pluggy Connect SDK:', error);
    res.status(404).send('Pluggy Connect SDK not found. Run: npm install pluggy-connect-sdk');
  }
});

// Get API key (cache it for 2 hours as per Pluggy docs)
let cachedApiKey = null;
let apiKeyExpiry = null;

async function getApiKey() {
  if (cachedApiKey && apiKeyExpiry && Date.now() < apiKeyExpiry) {
    return cachedApiKey;
  }

  const response = await fetch(`${API_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    throw new Error(`Auth failed: ${response.status}`);
  }

  const data = await response.json();
  cachedApiKey = data.apiKey;
  apiKeyExpiry = Date.now() + (1.5 * 60 * 60 * 1000); // 1.5 hours (safe margin)
  
  return cachedApiKey;
}

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Create a Connect Token for the widget
app.post('/api/connect-token', async (req, res) => {
  console.log('=== Connect Token Request ===');
  console.log('Request headers:', req.headers);
  console.log('Request body:', req.body);
  
  try {
    console.log('Getting API key...');
    const apiKey = await getApiKey();
    console.log('API key received:', apiKey ? 'Yes' : 'No');
    
    const requestBody = {
      itemId: null, // null for new connection
      options: {
        webhook: 'https://your-webhook-url.com/webhook', // Optional
        updateMode: 'add', // Options: 'add', 'replace'
      }
    };
    
    console.log('Making Pluggy API request with body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(`${API_URL}/connect_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Pluggy API response status:', response.status);
    console.log('Pluggy API response headers:', [...response.headers.entries()]);
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Pluggy API error response:', error);
      throw new Error(`Connect token failed: ${response.status} - ${error}`);
    }

    const data = await response.json();
    console.log('Pluggy API response data:', JSON.stringify(data, null, 2));
    
    // Check what property name Pluggy actually returns
    const tokenProperty = data.connectToken || data.accessToken || data.token || data.connect_token;
    console.log('Token property found:', tokenProperty ? 'Yes' : 'No');
    console.log('Available properties:', Object.keys(data));
    
    const responseData = {
      connectToken: tokenProperty,
      originalResponse: data
    };
    
    console.log('Sending response:', JSON.stringify(responseData, null, 2));
    res.json(responseData);
    
  } catch (error) {
    console.error('Connect token error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get accounts using stored Item ID
app.get('/api/accounts', async (req, res) => {
  try {
    if (!STORED_ITEM_ID) {
      return res.status(400).json({ 
        error: 'No Item ID configured. Please add PLUGGY_ITEM_ID to .env after connecting through widget.' 
      });
    }

    const apiKey = await getApiKey();
    
    const response = await fetch(`${API_URL}/accounts?itemId=${STORED_ITEM_ID}`, {
      headers: { 'X-API-KEY': apiKey },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Accounts fetch failed: ${response.status} - ${error}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Accounts error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get transactions for a specific account
app.get('/api/transactions/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;
    const apiKey = await getApiKey();
    
    const response = await fetch(`${API_URL}/transactions?accountId=${accountId}&pageSize=20`, {
      headers: { 'X-API-KEY': apiKey },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Transactions fetch failed: ${response.status} - ${error}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Transactions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug route to check NPM package structure
app.get('/api/debug-npm', async (req, res) => {
  try {
    const fs = await import('fs');
    const pluggyPath = path.join(__dirname, 'node_modules', 'pluggy-connect-sdk');
    
    if (!fs.existsSync(pluggyPath)) {
      return res.json({ 
        error: 'pluggy-connect-sdk not installed',
        suggestion: 'Run: npm install pluggy-connect-sdk'
      });
    }
    
    // Check package.json
    const packageJsonPath = path.join(pluggyPath, 'package.json');
    let packageInfo = {};
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = fs.readFileSync(packageJsonPath, 'utf8');
      packageInfo = JSON.parse(packageJson);
    }
    
    // List directory contents
    const files = fs.readdirSync(pluggyPath);
    
    res.json({
      packagePath: pluggyPath,
      version: packageInfo.version,
      main: packageInfo.main,
      files: files,
      packageInfo: packageInfo
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get('/api/health', async (req, res) => {
  try {
    await getApiKey();
    res.json({ 
      status: 'ok', 
      hasItemId: !!STORED_ITEM_ID,
      itemId: STORED_ITEM_ID ? `${STORED_ITEM_ID.substring(0, 8)}...` : null
    });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`API Health: http://localhost:${PORT}/api/health`);
  
  if (STORED_ITEM_ID) {
    console.log(`Item ID configured: ${STORED_ITEM_ID.substring(0, 8)}...`);
  } else {
    console.log('No Item ID configured - connect through widget first');
  }
});