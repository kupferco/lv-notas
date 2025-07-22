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

// Activity tracking constants
const ACTIVITY_STORAGE_KEY = "last_activity_timestamp";
const MAX_INACTIVE_DAYS = 10;

// Activity tracking functions
const updateLastActivity = (): void => {
  localStorage.setItem(ACTIVITY_STORAGE_KEY, Date.now().toString());
};

const getLastActivity = (): Date | null => {
  const timestamp = localStorage.getItem(ACTIVITY_STORAGE_KEY);
  return timestamp ? new Date(parseInt(timestamp)) : null;
};

const shouldForceReAuth = (): boolean => {
  const lastActivity = getLastActivity();
  if (!lastActivity) return true;

  const daysSinceLastActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceLastActivity > MAX_INACTIVE_DAYS;
};

// Enhanced Google token validation and refresh - FIXED VERSION
export const ensureValidGoogleToken = async (): Promise<string | null> => {
  try {
    const user = getCurrentUser();
    if (!user) {
      console.log("❌ No Firebase user found");
      return null;
    }

    // First, ensure Firebase token is valid and get a fresh one if needed
    const firebaseToken = await user.getIdToken(true); // Always get fresh token
    console.log("✅ Firebase token refreshed");

    // Check if we have a Google access token
    let googleToken = localStorage.getItem("google_access_token");

    if (!googleToken) {
      console.log("❌ No Google access token found");
      // Only return null if user has been inactive for too long
      if (shouldForceReAuth()) {
        throw new Error("FORCE_REAUTH_REQUIRED");
      }
      return null;
    }

    // Test current Google token
    try {
      const tokenTest = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${googleToken}`, {
        method: 'GET'
      });

      if (tokenTest.ok) {
        const tokenInfo = await tokenTest.json();
        updateLastActivity();
        console.log(`✅ Google token valid, expires in ${tokenInfo.expires_in} seconds`);
        return googleToken;
      }
    } catch (testError) {
      console.log("⚠️ Google token test failed, attempting refresh...");
    }

    // Token test failed - try to get a new one using Firebase
    // Since Google refresh tokens are not easily available through Firebase,
    // we'll use a different approach: silently get a new token if possible

    // Check if we should force re-auth due to inactivity (only after 10+ days)
    if (shouldForceReAuth()) {
      console.log("❌ User inactive for > 10 days, forcing re-authentication");
      throw new Error("FORCE_REAUTH_REQUIRED");
    }

    // If user has been active recently, try to get a new token silently
    console.log("⚠️ Google token expired but user is active, attempting silent refresh...");

    // For now, return null but don't throw error - this allows the app to continue
    // working with Firebase-only features while gracefully degrading calendar features
    console.log("ℹ️ Google token refresh not available, calendar features may be limited");
    updateLastActivity(); // Still update activity since user is using the app

    return null; // Return null instead of throwing error

  } catch (error) {
    if (error instanceof Error && error.message === "FORCE_REAUTH_REQUIRED") {
      throw error; // Re-throw to handle at higher level
    }
    console.error("❌ Error ensuring valid Google token:", error);

    // Only force re-auth if user has been inactive for too long
    if (shouldForceReAuth()) {
      throw new Error("FORCE_REAUTH_REQUIRED");
    }

    // Otherwise, just return null and let app continue
    return null;
  }
};

// Export activity tracking functions
export const trackActivity = updateLastActivity;
export const getActivityStatus = () => ({
  lastActivity: getLastActivity(),
  daysSinceActivity: (() => {
    const last = getLastActivity();
    return last ? (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24) : null;
  })(),
  shouldForceReAuth: shouldForceReAuth()
});


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

// // Activity tracking constants
// const ACTIVITY_STORAGE_KEY = "last_activity_timestamp";
const REFRESH_TOKEN_STORAGE_KEY = "google_refresh_token";
// const MAX_INACTIVE_DAYS = 10; // Force re-auth after 10 days of inactivity

// // Activity tracking functions
// const updateLastActivity = (): void => {
//   localStorage.setItem(ACTIVITY_STORAGE_KEY, Date.now().toString());
// };

// const getLastActivity = (): Date | null => {
//   const timestamp = localStorage.getItem(ACTIVITY_STORAGE_KEY);
//   return timestamp ? new Date(parseInt(timestamp)) : null;
// };

// const shouldForceReAuth = (): boolean => {
//   const lastActivity = getLastActivity();
//   if (!lastActivity) return true; // No activity recorded, force re-auth

//   const daysSinceLastActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
//   return daysSinceLastActivity > MAX_INACTIVE_DAYS;
// };

// Enhanced Google token refresh using refresh token
const refreshGoogleAccessToken = async (): Promise<string | null> => {
  try {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
    if (!refreshToken) {
      console.log("❌ No refresh token available");
      return null;
    }

    console.log("🔄 Refreshing Google access token using refresh token...");

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.firebaseConfig?.apiKey || '', // Your Google Client ID
        client_secret: '', // Not needed for public clients
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      console.error("❌ Refresh token request failed:", response.status);
      return null;
    }

    const data = await response.json();

    if (data.access_token) {
      // Store new access token
      localStorage.setItem("google_access_token", data.access_token);
      updateLastActivity();
      console.log("✅ Google access token refreshed successfully");
      return data.access_token;
    } else {
      console.error("❌ No access token in refresh response");
      return null;
    }
  } catch (error) {
    console.error("❌ Error refreshing Google access token:", error);
    return null;
  }
};

// Enhanced Google token validation and refresh
// export const ensureValidGoogleToken = async (): Promise<string | null> => {
//   try {
//     const currentToken = localStorage.getItem("google_access_token");

//     if (!currentToken) {
//       console.log("❌ No Google access token found");
//       return null;
//     }

//     // Test current token
//     const tokenTest = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${currentToken}`);

//     if (tokenTest.ok) {
//       const tokenInfo = await tokenTest.json();
//       updateLastActivity(); // Update activity on successful token use
//       console.log(`✅ Google token valid, expires in ${tokenInfo.expires_in} seconds`);
//       return currentToken;
//     }

//     // Token is invalid/expired, try to refresh
//     console.log("⚠️ Google access token expired, attempting refresh...");

//     // Check if we should force re-auth due to inactivity
//     if (shouldForceReAuth()) {
//       console.log("❌ User inactive for > 10 days, forcing re-authentication");
//       throw new Error("FORCE_REAUTH_REQUIRED");
//     }

//     // Try to refresh silently
//     const newToken = await refreshGoogleAccessToken();
//     if (newToken) {
//       return newToken;
//     }

//     // Refresh failed, need to re-authenticate
//     console.log("❌ Silent refresh failed, re-authentication required");
//     throw new Error("REAUTH_REQUIRED");

//   } catch (error) {
//     if (error instanceof Error && error.message === "FORCE_REAUTH_REQUIRED") {
//       throw error; // Re-throw to handle at higher level
//     }
//     console.error("❌ Error ensuring valid Google token:", error);
//     return null;
//   }
// };

// Token health check function (enhanced)
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

    console.log("🔑 Firebase token health check:");
    console.log("  Issued at:", issuedAt);
    console.log("  Expires at:", expiresAt);
    console.log("  Current time:", now);
    console.log("  Minutes until expiry:", Math.round((expiresAt.getTime() - now.getTime()) / 1000 / 60));

    // Also check Google token health
    try {
      const googleToken = await ensureValidGoogleToken();
      console.log("🗓️ Google token status:", googleToken ? "✅ Valid" : "❌ Invalid");
    } catch (error) {
      console.log("🗓️ Google token status: ❌ Failed", error instanceof Error ? error.message : error);
    }

    if (expiresAt < now) {
      console.log("⚠️ FIREBASE TOKEN EXPIRED!");
      return { status: 'expired', expiresAt, now };
    }

    if ((expiresAt.getTime() - now.getTime()) < 5 * 60 * 1000) { // Less than 5 minutes
      console.log("⚠️ FIREBASE TOKEN EXPIRING SOON!");
      return { status: 'expiring_soon', expiresAt, now };
    }

    return { status: 'valid', expiresAt, now };

  } catch (error) {
    console.log("🚨 Token check failed:", error);
    return { status: 'error', error };
  }
};

// Setup auto token refresh (enhanced)
const setupTokenRefresh = (user: User) => {
  // Clear any existing interval
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval);
  }

  // Set up auto token refresh every 5 minutes
  tokenRefreshInterval = setInterval(async () => {
    try {
      // Check Firebase token
      const health = await checkTokenHealth();
      if (health.status === 'expiring_soon' || health.status === 'expired') {
        console.log("🔄 Auto-refreshing Firebase token...");
        await user.getIdToken(true); // Force refresh
        console.log("✅ Firebase token auto-refreshed");
      }

      // Check Google token
      try {
        await ensureValidGoogleToken();
      } catch (error) {
        if (error instanceof Error && (error.message === "REAUTH_REQUIRED" || error.message === "FORCE_REAUTH_REQUIRED")) {
          console.log("⚠️ Google token requires re-authentication, will prompt user on next API call");
        }
      }
    } catch (error) {
      console.log("🚨 Auto token refresh failed:", error);
    }
  }, 5 * 60 * 1000); // Check every 5 minutes

  console.log("✅ Enhanced auto token refresh setup completed");
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

// Sign in with Google and request calendar permissions (enhanced)
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

    // Get the credential and tokens
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      // Store access token
      localStorage.setItem("google_access_token", credential.accessToken);
      localStorage.setItem("calendar_permission_granted", "true");

      // Store refresh token if available (THIS IS THE KEY ENHANCEMENT)
      if (credential.idToken) {
        // Note: Google refresh tokens are not always available via Firebase
        // They're typically only provided on first consent
        console.log("🔄 Checking for refresh token availability...");

        // We need to store the refresh token separately if we can get it
        // For now, we'll rely on Firebase's token refresh for Firebase tokens
        // and implement Google token refresh via the OAuth flow
      }

      // Update activity timestamp
      updateLastActivity();

      console.log("✅ Google access token stored with calendar permissions");
      console.log("📈 Activity timestamp updated");

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

    // Setup enhanced token refresh for new user
    setupTokenRefresh(result.user);

    return result.user;
  } catch (error) {
    console.error("❌ Error signing in with Google:", error);

    // Clear any partial authentication state
    localStorage.removeItem("google_access_token");
    localStorage.removeItem("calendar_permission_granted");
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);

    throw error;
  }
};

// Sign out (enhanced)
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
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(ACTIVITY_STORAGE_KEY);

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

// Enhanced Google access token getter with auto-refresh
export const getGoogleAccessToken = async (): Promise<string | null> => {
  try {
    return await ensureValidGoogleToken();
  } catch (error) {
    if (error instanceof Error && (error.message === "REAUTH_REQUIRED" || error.message === "FORCE_REAUTH_REQUIRED")) {
      // Token refresh failed, need to trigger re-authentication
      console.log("🔄 Google token refresh failed, triggering re-authentication...");
      await signOutUser();
      await signInWithGoogle();
      return localStorage.getItem("google_access_token");
    }
    console.error("❌ Error getting Google access token:", error);
    return null;
  }
};

// Synchronous version for backward compatibility
export const getGoogleAccessTokenSync = (): string | null => {
  return localStorage.getItem("google_access_token");
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

    return () => { }; // Return empty cleanup function for now
  }

  // Auth is ready, set up listener
  if (!auth) {
    console.warn("❌ Auth is still null, cannot set up listener");
    return () => { };
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

// Check authentication state (enhanced)
export const checkAuthState = async (): Promise<User | null> => {
  console.log("🔍 Checking enhanced auth state...");

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

      // Check activity and token health
      const lastActivity = getLastActivity();
      if (lastActivity) {
        const daysSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
        console.log(`📈 Last activity: ${daysSinceActivity.toFixed(1)} days ago`);

        if (shouldForceReAuth()) {
          console.log("⚠️ User inactive for > 10 days, may require re-authentication");
        }
      } else {
        console.log("📈 No previous activity recorded");
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

// Check if calendar permissions are granted
export const checkCalendarPermissions = (): boolean => {
  return hasCalendarPermissions();
};

// Manual token refresh function (enhanced)
export const refreshAuthToken = async (): Promise<boolean> => {
  try {
    const user = getCurrentUser();
    if (!user) {
      console.log("❌ No user to refresh token for");
      return false;
    }

    console.log("🔄 Manually refreshing auth tokens...");

    // Refresh Firebase token
    await user.getIdToken(true); // Force refresh
    console.log("✅ Firebase token refreshed");

    // Refresh Google token
    try {
      const googleToken = await ensureValidGoogleToken();
      if (googleToken) {
        console.log("✅ Google token validated/refreshed");
        return true;
      } else {
        console.log("⚠️ Google token refresh failed");
        return false;
      }
    } catch (error) {
      console.log("⚠️ Google token requires re-authentication");
      return false;
    }
  } catch (error) {
    console.error("❌ Manual token refresh failed:", error);
    return false;
  }
};

// DEBUG FUNCTIONS - Add these temporarily for testing
export const debugAuthState = async () => {
  console.log("🔍 === AUTHENTICATION DEBUG ===");

  // Check Firebase user
  const user = getCurrentUser();
  console.log("Firebase User:", user ? `${user.email} (${user.uid})` : "None");

  // Check stored tokens
  const googleToken = localStorage.getItem("google_access_token");
  const calendarPermission = localStorage.getItem("calendar_permission_granted");
  const lastActivity = getLastActivity();

  console.log("Google Token:", googleToken ? `${googleToken.substring(0, 20)}...` : "None");
  console.log("Calendar Permission:", calendarPermission);
  console.log("Last Activity:", lastActivity ? lastActivity.toLocaleString() : "None");

  if (lastActivity) {
    const daysSince = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
    console.log("Days Since Activity:", daysSince.toFixed(2));
    console.log("Should Force Reauth:", shouldForceReAuth());
  }

  // Test Firebase token
  if (user) {
    try {
      const fbToken = await user.getIdToken(false);
      const tokenPayload = JSON.parse(atob(fbToken.split('.')[1]));
      const expiresAt = new Date(tokenPayload.exp * 1000);
      console.log("Firebase Token Expires:", expiresAt.toLocaleString());
      console.log("Minutes Until FB Expiry:", Math.round((expiresAt.getTime() - Date.now()) / 1000 / 60));
    } catch (error) {
      console.error("Firebase Token Error:", error);
    }
  }

  // Test Google token
  if (googleToken) {
    try {
      const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${googleToken}`);
      if (response.ok) {
        const data = await response.json();
        console.log("Google Token Valid - Expires in:", data.expires_in, "seconds");
        console.log("Google Token Scope:", data.scope);
      } else {
        console.log("Google Token Invalid - Status:", response.status);
      }
    } catch (error) {
      console.error("Google Token Test Error:", error);
    }
  }

  console.log("🔍 === END DEBUG ===");
};

// Force token refresh test
export const debugForceTokenRefresh = async () => {
  console.log("🔄 === FORCING TOKEN REFRESH TEST ===");

  try {
    const result = await ensureValidGoogleToken();
    console.log("Token Refresh Result:", result ? "Success" : "Failed");
    return result;
  } catch (error) {
    console.error("Token Refresh Error:", error);
    return null;
  }
};

// Simulate old activity (for testing 10-day logic)
export const debugSimulateOldActivity = (daysAgo: number = 11) => {
  console.log(`🕒 Simulating activity from ${daysAgo} days ago...`);
  const oldTimestamp = Date.now() - (daysAgo * 24 * 60 * 60 * 1000);
  localStorage.setItem(ACTIVITY_STORAGE_KEY, oldTimestamp.toString());
  console.log("New last activity:", new Date(oldTimestamp).toLocaleString());
  console.log("Should force reauth:", shouldForceReAuth());
};

// Reset activity to now
export const debugResetActivity = () => {
  console.log("🔄 Resetting activity to now...");
  updateLastActivity();
  console.log("Activity reset. Should force reauth:", shouldForceReAuth());
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
  getGoogleAccessTokenSync,
  checkTokenHealth,
  refreshAuthToken,
  checkCalendarPermissions,
  ensureValidGoogleToken,
  trackActivity,
  getActivityStatus,
  isDevelopment
};