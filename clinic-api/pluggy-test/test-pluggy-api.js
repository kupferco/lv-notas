// simple-pluggy-test.js
// Fresh start - simple Pluggy API test

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const CLIENT_ID = process.env.PLUGGY_CLIENT_ID;
const CLIENT_SECRET = process.env.PLUGGY_CLIENT_SECRET;
const API_URL = 'https://api.pluggy.ai';

async function testPluggy() {
  try {
    console.log('Testing Pluggy API...\n');

    // Step 1: Get API key
    console.log('1. Authenticating...');
    const authResponse = await fetch(`${API_URL}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
      }),
    });

    if (!authResponse.ok) {
      throw new Error(`Auth failed: ${authResponse.status}`);
    }

    const { apiKey } = await authResponse.json();
    console.log('✓ Authentication successful');

    // Step 2: Get connectors
    console.log('\n2. Getting available connectors...');
    const connectorsResponse = await fetch(`${API_URL}/connectors`, {
      headers: { 'X-API-KEY': apiKey },
    });

    if (!connectorsResponse.ok) {
      throw new Error(`Connectors failed: ${connectorsResponse.status}`);
    }

    const connectors = await connectorsResponse.json();
    console.log(`✓ Found ${connectors.total} connector(s)`);

    // Step 3: Show what we found
    console.log('\n3. Available connectors:');
    connectors.results.forEach((connector, i) => {
      console.log(`   ${i + 1}. ${connector.name} (${connector.type})`);
      console.log(`      ID: ${connector.id}`);
      if (connector.credentials) {
        console.log(`      Needs: ${connector.credentials.map(c => c.name).join(', ')}`);
      }
    });

    console.log('\n✓ Test completed successfully!');
    console.log('\nNext: We can now integrate this into your LV Notas backend.');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testPluggy();