// src/config/firebase.ts
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  setPersistence, 
  browserLocalPersistence, 
  onAuthStateChanged,
  signOut,
  User 
} from "firebase/auth";
import { config } from "./config";

// Environment detection
export const isDevelopment = window.location.hostname === 'localhost' || 
                            window.location.hostname === '127.0.0.1';

const isFirebaseHosting = () => {
  return window.location.hostname.includes("web.app") ||
         window.location.hostname.includes("firebaseapp.com");
};

let auth: any = null;
let app: any = null;
let isInitialized = false;

// Initialize Firebase once
const initializeFirebase = async (): Promise<User | null> => {
  if (isInitialized && auth) {
    console.log("Firebase already initialized");
    return getCurrentUser();
  }

  try {
    console.log("🔥 Initializing Firebase...");
    
    // Always use real Firebase (both development and production)
    if (!config.firebaseConfig?.apiKey || !config.firebaseConfig?.authDomain || !config.firebaseConfig?.projectId) {
      console.error("Firebase configuration is incomplete");
      return null;
    }

    console.log("🔥 Initializing Firebase...");
    app = initializeApp(config.firebaseConfig);
    auth = getAuth(app);

    // Set persistence to local storage
    await setPersistence(auth, browserLocalPersistence);
    console.log("✅ Firebase persistence set to local");

    isInitialized = true;

    // Return current user if already signed in
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe(); // Remove listener after first check
        console.log("Firebase auth state:", user ? `signed in as ${user.email}` : "signed out");
        resolve(user);
      });
    });

  } catch (error) {
    console.error("❌ Error initializing Firebase:", error);
    isInitialized = true; // Set to true to avoid repeated attempts
    return null;
  }
};

// Get current user
export const getCurrentUser = (): User | null => {
  return auth?.currentUser || null;
};

// Sign in with Google
export const signInWithGoogle = async (): Promise<User | null> => {
  try {
    // Always use real Google sign in (both development and production)
    await initializeFirebase();
    
    if (!auth) {
      throw new Error("Firebase not initialized");
    }

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      'prompt': 'select_account'
    });

    // Add required scopes for calendar access
    provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
    provider.addScope('https://www.googleapis.com/auth/calendar.events');

    const result = await signInWithPopup(auth, provider);
    console.log("✅ Google sign in completed:", result.user.email);

    // Store Google access token
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      localStorage.setItem("google_access_token", credential.accessToken);
      console.log("✅ Google access token stored");
    }

    return result.user;
  } catch (error) {
    console.error("❌ Error signing in with Google:", error);
    throw error;
  }
};

// Sign out
export const signOutUser = async (): Promise<void> => {
  try {
    console.log("🚪 Starting sign out process...");
    
    if (auth) {
      await signOut(auth);
      console.log("✅ Firebase sign out completed");
    }

    // Clear ALL stored data to force user back to onboarding
    console.log("🧹 Clearing all localStorage data...");
    localStorage.removeItem("google_access_token");
    localStorage.removeItem("therapist_calendar_id");
    localStorage.removeItem("therapist_email");
    localStorage.removeItem("therapist_name");
    localStorage.removeItem("currentTherapist");
    
    // Clear any other potential auth-related items
    localStorage.removeItem("firebase_user");
    localStorage.removeItem("auth_state");
    
    console.log("✅ All localStorage data cleared");
    console.log("✅ Sign out process completed - user will need to start from beginning");
    
  } catch (error) {
    console.error("❌ Error signing out:", error);
    throw error;
  }
};

// Listen for auth state changes
export const onAuthStateChange = (callback: (user: User | null) => void): (() => void) => {
  if (!auth) {
    console.warn("Auth not initialized, callback will not fire");
    return () => {};
  }

  return onAuthStateChanged(auth, callback);
};

// Check authentication state
export const checkAuthState = async (): Promise<User | null> => {
  console.log("🔍 Checking auth state...");
  
  try {
    // Add a small delay to ensure localStorage is ready
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const user = await initializeFirebase();
    console.log("Auth state check result:", user ? `authenticated as ${user.email}` : "not authenticated");
    return user;
  } catch (error) {
    console.error("Error checking auth state:", error);
    return null;
  }
};

// Get Google access token
export const getGoogleAccessToken = (): string | null => {
  return localStorage.getItem("google_access_token");
};

// Export the auth instance for direct use if needed
export { auth };
export default { 
  initializeFirebase, 
  getCurrentUser, 
  signInWithGoogle, 
  signOutUser, 
  onAuthStateChange, 
  checkAuthState,
  getGoogleAccessToken,
  isDevelopment 
};