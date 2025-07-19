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

// Environment detection
export const isDevelopment = window.location.hostname === 'localhost' || 
                            window.location.hostname === '127.0.0.1';

const isFirebaseHosting = () => {
  return window.location.hostname.includes("web.app") ||
         window.location.hostname.includes("firebaseapp.com");
};

let auth: Auth | null = null;
let app: FirebaseApp | null = null;
let isInitialized = false;
let tokenRefreshInterval: NodeJS.Timeout | null = null;

// Token health check function
export const checkTokenHealth = async (): Promise<any> => {
  try {
    const user = getCurrentUser();
    if (!user) {
      console.log("🚨 No user - Firebase not initialized");
      return { status: 'no_user' };
    }

    const token = await user.getIdToken(false); // Don't force refresh yet
    const tokenPayload = JSON.parse(atob(token.split('.')[1]));
    
    const issuedAt = new Date(tokenPayload.iat * 1000);
    const expiresAt = new Date(tokenPayload.exp * 1000);
    const now = new Date();
    
    console.log("🔑 Token health check:");
    console.log("  Issued at:", issuedAt);
    console.log("  Expires at:", expiresAt);
    console.log("  Current time:", now);
    console.log("  Minutes until expiry:", Math.round((expiresAt.getTime() - now.getTime()) / 1000 / 60));
    
    if (expiresAt < now) {
      console.log("⚠️ TOKEN EXPIRED!");
      return { status: 'expired', expiresAt, now };
    }
    
    if ((expiresAt.getTime() - now.getTime()) < 5 * 60 * 1000) { // Less than 5 minutes
      console.log("⚠️ TOKEN EXPIRING SOON!");
      return { status: 'expiring_soon', expiresAt, now };
    }
    
    return { status: 'valid', expiresAt, now };
    
  } catch (error) {
    console.log("🚨 Token check failed:", error);
    return { status: 'error', error };
  }
};

// Setup auto token refresh
const setupTokenRefresh = (user: User) => {
  // Clear any existing interval
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval);
  }

  // Set up auto token refresh every 5 minutes
  tokenRefreshInterval = setInterval(async () => {
    try {
      const health = await checkTokenHealth();
      if (health.status === 'expiring_soon' || health.status === 'expired') {
        console.log("🔄 Auto-refreshing token...");
        await user.getIdToken(true); // Force refresh
        console.log("✅ Token auto-refreshed");
      }
    } catch (error) {
      console.log("🚨 Auto token refresh failed:", error);
    }
  }, 5 * 60 * 1000); // Check every 5 minutes

  console.log("✅ Auto token refresh setup completed");
};

// Clean up token refresh
const cleanupTokenRefresh = () => {
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval);
    tokenRefreshInterval = null;
    console.log("🧹 Token refresh interval cleared");
  }
};

// Check if user has calendar permissions
const hasCalendarPermissions = (): boolean => {
  // Check if we have a stored Google access token with calendar scope
  const googleToken = localStorage.getItem("google_access_token");
  const calendarPermissionGranted = localStorage.getItem("calendar_permission_granted");
  
  return !!(googleToken && calendarPermissionGranted === "true");
};

// Get current user
export const getCurrentUser = (): User | null => {
  if (!auth) return null;
  return auth.currentUser || null;
};

// Initialize Firebase once
const initializeFirebase = async (): Promise<User | null> => {
  if (isInitialized && auth) {
    console.log("Firebase already initialized");
    const currentUser = getCurrentUser();
    
    // Even if Firebase is initialized, check if we need calendar permissions
    if (currentUser && !hasCalendarPermissions()) {
      console.log("🔄 User exists but missing calendar permissions - forcing re-authentication");
      // Force re-authentication with calendar permissions
      await signOutUser();
      return await signInWithGoogle();
    }
    
    return currentUser;
  }

  try {
    console.log("🔥 Initializing Firebase...");
    
    // Always use real Firebase (both development and production)
    if (!config.firebaseConfig?.apiKey || !config.firebaseConfig?.authDomain || !config.firebaseConfig?.projectId) {
      console.error("Firebase configuration is incomplete");
      console.error("Config:", config.firebaseConfig);
      return null;
    }

    console.log("🔥 Initializing Firebase with config:", {
      apiKey: config.firebaseConfig.apiKey ? "Present" : "Missing",
      authDomain: config.firebaseConfig.authDomain,
      projectId: config.firebaseConfig.projectId
    });
    
    app = initializeApp(config.firebaseConfig);
    auth = getAuth(app);

    // Set persistence to local storage
    await setPersistence(auth, browserLocalPersistence);
    console.log("✅ Firebase persistence set to local");

    isInitialized = true;

    // Return current user if already signed in
    return new Promise((resolve) => {
      if (!auth) {
        resolve(null);
        return;
      }

      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        unsubscribe(); // Remove listener after first check
        console.log("Firebase auth state:", user ? `signed in as ${user.email}` : "signed out");
        
        if (user) {
          setupTokenRefresh(user);
          
          // Check if user has calendar permissions
          if (!hasCalendarPermissions()) {
            console.log("⚠️ User authenticated but missing calendar permissions - forcing re-authentication");
            // Force re-authentication with calendar permissions
            try {
              await signOutUser();
              const newUser = await signInWithGoogle();
              resolve(newUser);
            } catch (error) {
              console.error("❌ Error during forced re-authentication:", error);
              resolve(null);
            }
          } else {
            console.log("✅ User has calendar permissions");
            resolve(user);
          }
        } else {
          cleanupTokenRefresh();
          resolve(user);
        }
      });
    });

  } catch (error) {
    console.error("❌ Error initializing Firebase:", error);
    isInitialized = true; // Set to true to avoid repeated attempts
    return null;
  }
};

// Sign in with Google and request calendar permissions
export const signInWithGoogle = async (): Promise<User | null> => {
  try {
    console.log("🚀 Starting Google sign-in with calendar permissions...");
    
    await initializeFirebase();
    
    if (!auth) {
      throw new Error("Firebase not initialized");
    }

    const provider = new GoogleAuthProvider();
    
    // CRITICAL: Add calendar scopes BEFORE setting custom parameters (READ ONLY)
    provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
    // provider.addScope('https://www.googleapis.com/auth/calendar.events');
    provider.addScope('email');
    provider.addScope('profile');
    
    // Force consent screen to ensure we get all permissions including calendar
    provider.setCustomParameters({
      'prompt': 'consent', // Force consent to get fresh permissions
      'access_type': 'offline', // Request offline access for refresh tokens
      'include_granted_scopes': 'true' // Include previously granted scopes
    });

    console.log("🔐 Requesting Google sign-in with scopes:", [
      'https://www.googleapis.com/auth/calendar.readonly',
      // 'https://www.googleapis.com/auth/calendar.events',
      'email',
      'profile'
    ]);

    const result = await signInWithPopup(auth, provider);
    console.log("✅ Google sign-in completed:", result.user.email);

    // Get the credential and access token
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      localStorage.setItem("google_access_token", credential.accessToken);
      localStorage.setItem("calendar_permission_granted", "true");
      console.log("✅ Google access token stored with calendar permissions");
      
      // Test calendar access immediately
      try {
        const testResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
          headers: {
            'Authorization': `Bearer ${credential.accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (testResponse.ok) {
          console.log("✅ Calendar access confirmed immediately after authentication");
        } else {
          console.warn("⚠️ Calendar access test failed despite getting token:", testResponse.status);
        }
      } catch (testError) {
        console.warn("⚠️ Calendar access test error:", testError);
      }
      
    } else {
      console.warn("⚠️ No Google access token received - calendar permissions may not be granted");
      localStorage.setItem("calendar_permission_granted", "false");
      throw new Error("Failed to obtain Google access token for calendar access");
    }

    // Setup token refresh for new user
    setupTokenRefresh(result.user);

    return result.user;
  } catch (error) {
    console.error("❌ Error signing in with Google:", error);
    
    // Clear any partial authentication state
    localStorage.removeItem("google_access_token");
    localStorage.removeItem("calendar_permission_granted");
    
    throw error;
  }
};

// Sign out
export const signOutUser = async (): Promise<void> => {
  try {
    console.log("🚪 Starting sign out process...");
    
    // Clean up token refresh first
    cleanupTokenRefresh();
    
    if (auth) {
      await signOut(auth);
      console.log("✅ Firebase sign out completed");
    }

    // Clear ALL stored data to force user back to onboarding
    console.log("🧹 Clearing all localStorage data...");
    localStorage.removeItem("google_access_token");
    localStorage.removeItem("calendar_permission_granted");
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

// Listen for auth state changes with better initialization handling
export const onAuthStateChange = (callback: (user: User | null) => void): (() => void) => {
  // If auth is not ready, initialize first
  if (!auth) {
    console.log("🔄 Auth not ready, initializing Firebase first...");
    initializeFirebase().then(() => {
      if (auth) {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          if (user) {
            setupTokenRefresh(user);
          } else {
            cleanupTokenRefresh();
          }
          callback(user);
        });
        return unsubscribe;
      } else {
        console.warn("❌ Firebase initialization failed, callback will not fire");
        callback(null);
      }
    }).catch((error) => {
      console.error("❌ Firebase initialization error in onAuthStateChange:", error);
      callback(null);
    });
    
    return () => {}; // Return empty cleanup function for now
  }

  // Auth is ready, set up listener
  if (!auth) {
    console.warn("❌ Auth is still null, cannot set up listener");
    return () => {};
  }

  return onAuthStateChanged(auth, (user) => {
    if (user) {
      setupTokenRefresh(user);
    } else {
      cleanupTokenRefresh();
    }
    callback(user);
  });
};

// Check authentication state
export const checkAuthState = async (): Promise<User | null> => {
  console.log("🔍 Checking auth state...");
  
  try {
    // Add a small delay to ensure localStorage is ready
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const user = await initializeFirebase();
    console.log("Auth state check result:", user ? `authenticated as ${user.email}` : "not authenticated");
    
    // Check calendar permissions
    if (user) {
      const hasPermissions = hasCalendarPermissions();
      console.log("Calendar permissions:", hasPermissions ? "granted" : "missing");
      
      if (!hasPermissions) {
        console.log("⚠️ User authenticated but calendar permissions missing - may need re-authentication");
      }
    }
    
    // Check token health if user exists
    if (user) {
      const health = await checkTokenHealth();
      console.log("Token health:", health.status);
      
      if (health.status === 'expired') {
        console.log("🔄 Token expired, attempting refresh...");
        try {
          await user.getIdToken(true); // Force refresh
          console.log("✅ Token refreshed successfully");
        } catch (refreshError) {
          console.error("❌ Token refresh failed:", refreshError);
          return null;
        }
      }
    }
    
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

// Check if calendar permissions are granted
export const checkCalendarPermissions = (): boolean => {
  return hasCalendarPermissions();
};

// Manual token refresh function
export const refreshAuthToken = async (): Promise<boolean> => {
  try {
    const user = getCurrentUser();
    if (!user) {
      console.log("❌ No user to refresh token for");
      return false;
    }

    console.log("🔄 Manually refreshing auth token...");
    await user.getIdToken(true); // Force refresh
    console.log("✅ Manual token refresh successful");
    return true;
  } catch (error) {
    console.error("❌ Manual token refresh failed:", error);
    return false;
  }
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
  checkTokenHealth,
  refreshAuthToken,
  checkCalendarPermissions,
  isDevelopment 
};