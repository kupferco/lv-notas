// src/config/firebase.ts
import { initializeApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
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
import type { Auth } from "firebase/auth";
import { config } from "./config";

// Global variables
let auth: Auth | null = null;
let app: FirebaseApp | null = null;
let isInitialized = false;
let isSigningIn = false;

// Test if we have calendar access
const testCalendarAccess = async (accessToken: string): Promise<boolean> => {
  try {
    console.log("🧪 Testing calendar access...");
    const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      console.log("✅ Calendar access confirmed");
      return true;
    } else {
      console.log("❌ Calendar access denied:", response.status);
      return false;
    }
  } catch (error) {
    console.log("❌ Calendar access test failed:", error);
    return false;
  }
};

// Get current user
export const getCurrentUser = (): User | null => {
  if (!auth) return null;
  return auth.currentUser || null;
};

// Initialize Firebase once
const initializeFirebase = async (): Promise<User | null> => {
  if (isInitialized && auth) {
    console.log("✅ Firebase already initialized");
    return getCurrentUser();
  }

  try {
    console.log("🔥 Initializing Firebase...");

    if (!config.firebaseConfig?.apiKey || !config.firebaseConfig?.authDomain || !config.firebaseConfig?.projectId) {
      console.error("❌ Firebase configuration is incomplete");
      return null;
    }

    app = initializeApp(config.firebaseConfig);
    auth = getAuth(app);

    // Set persistence to local storage
    await setPersistence(auth, browserLocalPersistence);
    console.log("✅ Firebase persistence set to local");

    isInitialized = true;

    // Return current user if already signed in
    return getCurrentUser();

  } catch (error) {
    console.error("❌ Error initializing Firebase:", error);
    isInitialized = true; // Set to true to avoid repeated attempts
    return null;
  }
};

// Sign in with Google and request calendar permissions
export const signInWithGoogle = async (forceConsent: boolean = false): Promise<User | null> => {
  // Prevent duplicate sign-in attempts
  if (isSigningIn) {
    console.log("⚠️ Sign-in already in progress, skipping duplicate request");
    return null;
  }

  try {
    isSigningIn = true;
    console.log("🚀 Starting Google sign-in with calendar permissions...");

    await initializeFirebase();

    if (!auth) {
      throw new Error("Firebase not initialized");
    }

    const provider = new GoogleAuthProvider();

    // Add calendar scopes (read-only for now)
    provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
    provider.addScope('email');
    provider.addScope('profile');

    // Smart consent logic - only force consent if needed
    if (forceConsent) {
      provider.setCustomParameters({
        'prompt': 'consent',
        'access_type': 'offline',
        'include_granted_scopes': 'true'
      });
      console.log("🔐 Requesting Google sign-in with FORCED consent...");
    } else {
      provider.setCustomParameters({
        'prompt': 'select_account',
        'access_type': 'offline',
        'include_granted_scopes': 'true'
      });
      console.log("🔐 Requesting Google sign-in with existing permissions...");
    }

    const result = await signInWithPopup(auth, provider);
    console.log("✅ Google sign-in completed:", result.user.email);

    // Store the Google access token
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      localStorage.setItem("google_access_token", credential.accessToken);
      localStorage.setItem("calendar_permission_granted", "true");
      console.log("✅ Google access token stored");

      // Test if we actually have calendar permissions
      const hasCalendarAccess = await testCalendarAccess(credential.accessToken);
      if (!hasCalendarAccess && !forceConsent) {
        console.log("⚠️ Calendar access not available, retrying with consent...");
        // Retry with forced consent
        return await signInWithGoogle(true);
      }
    } else {
      console.warn("⚠️ No Google access token received");
      localStorage.setItem("calendar_permission_granted", "false");
      
      if (!forceConsent) {
        console.log("⚠️ No access token, retrying with consent...");
        return await signInWithGoogle(true);
      }
    }

    return result.user;
  } catch (error) {
    console.error("❌ Error signing in with Google:", error);
    
    // If we get an error and haven't tried with consent yet, try that
    if (!forceConsent && error instanceof Error && 
        (error.message.includes('popup_blocked') || 
         error.message.includes('access_denied') ||
         error.message.includes('popup_closed_by_user'))) {
      console.log("⚠️ Sign-in failed, retrying with consent...");
      return await signInWithGoogle(true);
    }
    
    // Clean up on error
    localStorage.removeItem("google_access_token");
    localStorage.removeItem("calendar_permission_granted");
    
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Sign out
export const signOutUser = async (): Promise<void> => {
  try {
    console.log("🚪 Signing out...");

    // Reset sign-in flag
    isSigningIn = false;

    if (auth) {
      await signOut(auth);
      console.log("✅ Firebase sign out completed");
    }

    // Clear app-specific data but PRESERVE Google tokens for persistence
    localStorage.removeItem("therapist_calendar_id");
    localStorage.removeItem("therapist_email");
    localStorage.removeItem("therapist_name");
    localStorage.removeItem("currentTherapist");

    // DO NOT remove these - we want to keep Google permissions:
    // localStorage.removeItem("google_access_token");
    // localStorage.removeItem("calendar_permission_granted");

    console.log("✅ Sign out completed (Google tokens preserved)");

  } catch (error) {
    console.error("❌ Error signing out:", error);
    throw error;
  }
};

// Environment detection
export const isDevelopment = window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';

// Sign out and clear all data (for complete reset)
export const signOutAndClearAll = async (): Promise<void> => {
  try {
    console.log("🚪 Signing out and clearing all data...");

    // Reset sign-in flag
    isSigningIn = false;

    if (auth) {
      await signOut(auth);
      console.log("✅ Firebase sign out completed");
    }

    // Clear ALL data including Google tokens
    localStorage.removeItem("google_access_token");
    localStorage.removeItem("calendar_permission_granted");
    localStorage.removeItem("therapist_calendar_id");
    localStorage.removeItem("therapist_email");
    localStorage.removeItem("therapist_name");
    localStorage.removeItem("currentTherapist");

    console.log("✅ Complete sign out with all data cleared");

  } catch (error) {
    console.error("❌ Error signing out:", error);
    throw error;
  }
};
export const getGoogleAccessToken = async (): Promise<string | null> => {
  try {
    const storedToken = localStorage.getItem("google_access_token");
    
    if (!storedToken) {
      console.log("❌ No stored Google access token");
      return null;
    }

    // Test if current token is valid
    const isValid = await testCalendarAccess(storedToken);
    if (isValid) {
      console.log("✅ Stored Google token is valid");
      return storedToken;
    }

    console.log("⚠️ Stored Google token is invalid, attempting silent refresh...");
    
    // Try to get a fresh token by refreshing the Firebase user
    const user = getCurrentUser();
    if (user) {
      try {
        // Force refresh the Firebase token (this sometimes refreshes Google tokens too)
        await user.getIdToken(true);
        
        // Check if we magically got a new token
        const newStoredToken = localStorage.getItem("google_access_token");
        if (newStoredToken && newStoredToken !== storedToken) {
          const isNewValid = await testCalendarAccess(newStoredToken);
          if (isNewValid) {
            console.log("✅ Google token silently refreshed");
            return newStoredToken;
          }
        }
      } catch (error) {
        console.log("⚠️ Silent refresh failed:", error);
      }
    }

    console.log("❌ Silent refresh failed, user needs to re-authenticate");
    return null;
  } catch (error) {
    console.error("❌ Error getting Google access token:", error);
    return null;
  }
};

// Check if user has calendar permissions
export const checkCalendarPermissions = (): boolean => {
  const googleToken = localStorage.getItem("google_access_token");
  const calendarPermissionGranted = localStorage.getItem("calendar_permission_granted");
  return !!(googleToken && calendarPermissionGranted === "true");
};

// Listen for auth state changes
export const onAuthStateChange = (callback: (user: User | null) => void): (() => void) => {
  if (!auth) {
    console.log("🔄 Auth not ready, initializing Firebase first...");
    initializeFirebase().then(() => {
      if (auth) {
        return onAuthStateChanged(auth, callback);
      } else {
        console.warn("❌ Firebase initialization failed");
        callback(null);
      }
    }).catch((error) => {
      console.error("❌ Firebase initialization error:", error);
      callback(null);
    });

    return () => {}; // Return empty cleanup function
  }

  return onAuthStateChanged(auth, callback);
};

// Check authentication state
export const checkAuthState = async (): Promise<User | null> => {
  console.log("🔍 Checking auth state...");

  try {
    const user = await initializeFirebase();
    console.log("Auth state:", user ? `authenticated as ${user.email}` : "not authenticated");
    
    if (user) {
      const hasPermissions = checkCalendarPermissions();
      console.log("Calendar permissions:", hasPermissions ? "granted" : "missing");
    }

    return user;
  } catch (error) {
    console.error("❌ Error checking auth state:", error);
    return null;
  }
};

// Simple token refresh - just get a fresh Firebase token
export const refreshAuthToken = async (): Promise<boolean> => {
  try {
    const user = getCurrentUser();
    if (!user) {
      console.log("❌ No user to refresh token for");
      return false;
    }

    console.log("🔄 Refreshing Firebase token...");
    await user.getIdToken(true); // Force refresh
    console.log("✅ Firebase token refreshed");
    return true;
  } catch (error) {
    console.error("❌ Token refresh failed:", error);
    return false;
  }
};

// Export the auth instance
export { auth };

// Default export
export default {
  initializeFirebase,
  getCurrentUser,
  signInWithGoogle,
  signOutUser,
  onAuthStateChange,
  checkAuthState,
  getGoogleAccessToken,
  checkCalendarPermissions,
  refreshAuthToken,
  isDevelopment
};