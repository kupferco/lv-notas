export const config = {
  apiUrl: process.env.NODE_ENV === 'production' 
    ? process.env.EXPO_PUBLIC_SAFE_PROXY_URL || 'https://clinic-api-141687742631.us-central1.run.app'
    : `${process.env.EXPO_PUBLIC_LOCAL_URL}/api` || 'http://localhost:3000/api',
  firebaseConfig: {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID
  }
};
