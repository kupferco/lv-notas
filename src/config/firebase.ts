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
import { googleOAuthService } from "../services/googleOAuthService";

// Global variables
let auth: Auth | null = null;
let app: FirebaseApp | null = null;
let isInitialized = false;
let isSigningIn = false;

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

    // Add calendar scopes
    provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
    provider.addScope('https://www.googleapis.com/auth/calendar.events');
    provider.addScope('email');
    provider.addScope('profile');

    // CRITICAL: Always request offline access to get refresh tokens
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
      console.log("🔐 Requesting Google sign-in with offline access...");
    }

    const result = await signInWithPopup(auth, provider);
    console.log("✅ Google sign-in completed:", result.user.email);

    // Get the credential and store tokens using our service
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (credential?.accessToken) {
      // Store tokens using our dedicated service
      // Note: Firebase doesn't reliably provide refresh tokens through this method
      googleOAuthService.storeTokens(
        credential.accessToken,
        undefined, // Firebase OAuthCredential doesn't include refreshToken
        3600 // Google access tokens typically last 1 hour
      );

      console.log("⚠️ Refresh token not available through Firebase credential - user will need to re-authenticate when token expires");

      // Test if we actually have calendar permissions
      const hasCalendarAccess = await googleOAuthService.testCalendarAccess(credential.accessToken);
      if (!hasCalendarAccess && !forceConsent) {
        console.log("⚠️ Calendar access not available, retrying with consent...");
        return await signInWithGoogle(true);
      }
    } else {
      console.warn("⚠️ No Google access token received");
      googleOAuthService.clearTokens();
      
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
    googleOAuthService.clearTokens();
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Sign out (preserves Google tokens)
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

    // DO NOT clear Google tokens here - we want to preserve them
    // googleOAuthService.clearTokens();

    console.log("✅ Sign out completed (Google tokens preserved)");

  } catch (error) {
    console.error("❌ Error signing out:", error);
    throw error;
  }
};

// Complete sign out that clears everything including Google tokens
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
    googleOAuthService.clearTokens();
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

// Environment detection
export const isDevelopment = window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';

// Get valid Google access token (delegates to service)
export const getGoogleAccessToken = async (): Promise<string | null> => {
  return await googleOAuthService.getValidAccessToken();
};

// Check if user has calendar permissions (delegates to service)
export const checkCalendarPermissions = (): boolean => {
  return googleOAuthService.hasCalendarPermissions();
};

// Initialize Google OAuth service (call this during app initialization)
export const initializeGoogleOAuth = (): void => {
  console.log("🔄 Initializing Google OAuth service...");
  
  // Migrate from old token format if needed
  googleOAuthService.migrateFromOldFormat();
  
  // Log current token status
  const tokenInfo = googleOAuthService.getTokenInfo();
  console.log("📊 Google OAuth status:", tokenInfo);
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
  signOutAndClearAll,
  onAuthStateChange,
  checkAuthState,
  getGoogleAccessToken,
  checkCalendarPermissions,
  initializeGoogleOAuth,
  refreshAuthToken,
  isDevelopment
};