import { SAFE_PROXY_API_KEY } from "@env";
import { auth, initializeFirebase } from './firebase';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { Platform } from "react-native";


const PROXY_URL = window.location.hostname === 'localhost'
  ? "http://localhost:3000"
  : (process.env.EXPO_PUBLIC_SAFE_PROXY_URL || "http://localhost:3000");

// Log environment info
console.log("Environment variables:", {
  proxy_url: PROXY_URL,
  direct_base: process.env.EXPO_PUBLIC_AIRTABLE_BASE_ID,
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
    const user = auth.currentUser;

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
      google_cloud_platform_scope: tokenClaims.claims['https://www.googleapis.com/auth/cloud-platform']
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

const getLocalAirtableApiKey = async () => {
  console.log("Fetching local proxy key");
  const response = await fetch('http://localhost:3000/api/key', {
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

const getProductionAirtableApiKey = async () => {
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
  console.log("Firebase authentication tokenzinho:", token ? 'Present' : 'Missing');

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
  airtableBaseId: process.env.EXPO_PUBLIC_AIRTABLE_BASE_ID,
  proxyUrl: PROXY_URL,
  getAirtableApiKey: async () => {
    const isLocal = window.location.hostname === 'localhost';
    return isLocal
      ? await getLocalAirtableApiKey()
      : await getProductionAirtableApiKey();
  }
};

export { config };