import { SAFE_PROXY_API_KEY } from "@env";
import { auth } from './firebase';

const PROXY_URL = process.env.EXPO_PUBLIC_SAFE_PROXY_URL || "http://localhost:3000";

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

   const user = auth.currentUser;
   if (!user) {
     throw new Error('No authenticated user');
   }

   const token = await user.getIdToken();
   return token;
 } catch (error) {
   console.error('Failed to get Google token:', error);
   return null;
 }
};

const getSecretFromManager = async () => {
 // Only attempt to get secret from manager if we're on Firebase hosting
 if (!isFirebaseHosting()) return null;

 try {
   const projectId = 'lv-notas'; // Get this from your Firebase config
   const secretName = 'safe-proxy-key';  // The name of your secret

   const response = await fetch(
     `https://secretmanager.googleapis.com/v1/projects/${projectId}/secrets/${secretName}/versions/latest:access`,
     {
       headers: {
         'Authorization': 'Bearer ' + await getGoogleToken()
       }
     }
   );

   if (!response.ok) throw new Error('Failed to get secret');
   const data = await response.json();
   return atob(data.payload.data);
 } catch (error) {
   console.error('Failed to get secret:', error);
   return null;
 }
};

const config = {
 airtableBaseId: process.env.EXPO_PUBLIC_AIRTABLE_BASE_ID,
 proxyUrl: PROXY_URL,
 getAirtableApiKey: async () => {
   console.log("Loading client key from proxy...");
   try {
     let clientKey;
     
     // If we're on Firebase hosting, try to get key from Secret Manager
     if (isFirebaseHosting()) {
       clientKey = await getSecretFromManager();
     } else {
       // If we're local, use the env var
       clientKey = SAFE_PROXY_API_KEY;
     }

     if (!clientKey) {
       throw new Error("Client API key not found");
     }

     console.log("Making request to proxy at:", PROXY_URL);
     
     const response = await fetch(`${PROXY_URL}/api/key`, {
       headers: {
         "X-API-Key": clientKey
       }
     });
     if (!response.ok) throw new Error('Failed to get API key');
     const data = await response.json();
     return data.apiKey;
   } catch (error) {
     console.error('Failed to get API key from proxy:', error);
     throw error;
   }
 }
};

export { config };