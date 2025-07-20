// src/config/index.ts
import { SAFE_PROXY_API_KEY } from '@env';
import firebaseService, { auth } from './firebase';
const { initializeFirebase } = firebaseService;

const PROXY_URL = window.location.hostname === 'localhost'
  ? process.env.EXPO_PUBLIC_LOCAL_URL
  : (process.env.EXPO_PUBLIC_SAFE_PROXY_URL || process.env.EXPO_PUBLIC_LOCAL_URL);

// Log environment info
console.log("Environment variables:", {
  deployment_version: '1.0.0',
  proxy_url: PROXY_URL,
  client_key: SAFE_PROXY_API_KEY ? "Present" : "Missing"
});

const isFirebaseHosting = () => {
  return window.location.hostname.includes('web.app') ||
    window.location.hostname.includes('firebaseapp.com');
};

const getGoogleToken = async () => {
  try {
    if (!isFirebaseHosting()) return null;

    await initializeFirebase();
    const user = auth?.currentUser;

    console.log("Current user:", user ? user.email : "No user");

    if (!user) {
      throw new Error('No authenticated user');
    }

    const token = await user.getIdToken(true);
    console.log("Got authenticated token:", token.substring(0, 20) + '...'); // Partial token for security

    // Verify token claims
    const tokenClaims = await user.getIdTokenResult();
    console.log("Token Claims:", {
      email: tokenClaims.claims.email,
    });

    return token;
  } catch (error) {
    console.error('Failed to get Google token:', error);
    throw error;
  }
};

const getSecretFromManager = async () => {
  // For web environments, return the Firebase environment config
  return process.env.FIREBASE_SAFE_PROXY_KEY || SAFE_PROXY_API_KEY;
};

const getLocalApiKey = async () => {
  console.log("Fetching local proxy key");
  const response = await fetch(`${process.env.EXPO_PUBLIC_LOCAL_URL}/api/key`, {
    headers: {
      "X-API-Key": SAFE_PROXY_API_KEY
    }
  });

  console.log("Local proxy response status:", response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Local proxy error response:", errorText);
    throw new Error('Failed to get API key from local proxy');
  }

  const data = await response.json();
  return data.apiKey;
};

const getProductionApiKey = async () => {
  const clientKey = await getSecretFromManager(); // This currently returns env var
  const proxyUrl = process.env.EXPO_PUBLIC_SAFE_PROXY_URL;

  console.log("Production proxy details:", {
    clientKey: clientKey ? 'Present' : 'Missing',
    proxyUrl
  });

  if (!clientKey || !proxyUrl) {
    throw new Error("Missing client key or proxy URL");
  }

  // Get Firebase authentication token
  const token = await getGoogleToken();
  console.log("Firebase authentication token:", token ? 'Present' : 'Missing');

  console.log("Safe-proxy api key: ", clientKey ? 'Present' : 'Missing')
  const response = await fetch(`${proxyUrl}/api/key`, {
    headers: {
      "X-API-Key": clientKey,
      "Authorization": `Bearer ${token}`
    }
  });

  console.log("Proxy response status:", response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Proxy error response:", errorText);
    throw new Error(`Failed to get API key. Status: ${response.status}, Error: ${errorText}`);
  }

  const data = await response.json();
  return data.apiKey;
};

const config = {
  proxyUrl: PROXY_URL,
  firebaseConfig: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  },
  getApiKey: async () => {
    const isLocal = window.location.hostname === 'localhost';
    return isLocal
      ? await getLocalApiKey()
      : await getProductionApiKey();
  }
};

export { config };
