// src/config/config.ts
export const config = {
  apiUrl: process.env.NODE_ENV === 'production' 
    ? process.env.EXPO_PUBLIC_SAFE_PROXY_URL || 'https://clinic-api-141687742631.us-central1.run.app'
    : `${process.env.EXPO_PUBLIC_LOCAL_URL}` || 'http://localhost:3000',
  firebaseConfig: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID
  }
};
