// src/services/api/base-service.ts - Base API Service with Common Functionality

import { getCurrentUser, isDevelopment, getGoogleAccessToken } from "../../config/firebase";
import { authService } from '../authService';

const API_URL = isDevelopment ? "http://localhost:3000" : process.env.EXPO_PUBLIC_SAFE_PROXY_URL;
const API_KEY = process.env.SAFE_PROXY_API_KEY;

// Simplified getAuthHeaders
const getAuthHeaders = async (): Promise<Record<string, string>> => {
  console.log("📡 API call at", new Date().toISOString());

  let authHeader = "";

  // Try credential authentication first
  const sessionToken = authService.getSessionToken();
  if (sessionToken) {
    authHeader = `Bearer ${sessionToken}`;
    console.log("✅ Using credential session token");
  } else {
    // Fallback to Firebase during transition
    const user = getCurrentUser();
    if (user) {
      try {
        const firebaseToken = await user.getIdToken();
        authHeader = `Bearer ${firebaseToken}`;
        console.log("✅ Using Firebase token as fallback");
      } catch (error) {
        console.error("❌ Error getting Firebase token:", error);
      }
    }
  }

  // Get Google access token for calendar operations (with smart refresh)
  const googleAccessToken = await getGoogleAccessToken();

  // Build headers
  const headers: Record<string, string> = {
    "X-API-Key": API_KEY || "",
    "Content-Type": "application/json",
  };

  if (authHeader) {
    headers["Authorization"] = authHeader;
    console.log("✅ Authentication token included");
  } else {
    console.warn("⚠️ No authentication token available");
  }

  if (googleAccessToken) {
    headers["X-Calendar-Token"] = googleAccessToken;
    console.log("✅ Google access token included");
  } else {
    console.warn("⚠️ No valid Google access token available for calendar operations");
  }

  return headers;
};

// Simplified API call wrapper
const makeApiCall = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
};

// Simplified API call wrapper for blob responses (CSV exports, PDFs)
const makeApiBlobCall = async (url: string, options: RequestInit = {}): Promise<Blob> => {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.blob();
};

// Helper to check if we can make authenticated calls
const canMakeAuthenticatedCall = (): boolean => {
  // Check credential authentication first
  const hasCredentialAuth = authService.isLoggedIn();
  if (hasCredentialAuth) {
    console.log("✅ Can make authenticated call - credential auth available");
    return true;
  }

  // Fallback to Firebase check
  const user = getCurrentUser();
  const canCall = !!user;
  console.log("🔥 Firebase auth available:", canCall);
  return canCall;
};

// Get current therapist email
const getCurrentTherapistEmail = () => {
  // Try credential authentication first
  const credentialUser = authService.getStoredUser();
  if (credentialUser?.email) {
    console.log("✅ Therapist email from credential auth:", credentialUser.email);
    return credentialUser.email;
  }

  // Fallback methods
  if (isDevelopment) {
    const email = localStorage.getItem("therapist_email") || localStorage.getItem("currentTherapist") || null;
    console.log("🚧 Development mode - therapist email from localStorage:", email);
    return email;
  }

  // Production fallback
  const user = getCurrentUser();
  const email = user?.email || null;
  console.log("🔥 Production mode - therapist email from Firebase:", email);
  return email;
};

// Validation helpers
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateRequired = (value: any, fieldName: string): void => {
  if (!value) {
    throw new Error(`${fieldName} is required`);
  }
};

// Error handling helpers
const handleApiError = (error: Error, context: string): never => {
  console.error(`❌ ${context} error:`, error);

  let cleanErrorMessage = error.message;

  // Try to extract clean error message from API response
  if (error.message.includes('Bad Request -') || error.message.includes('{')) {
    try {
      // Find the JSON part in the error message
      const jsonStart = error.message.indexOf('{');
      if (jsonStart !== -1) {
        const jsonPart = error.message.substring(jsonStart);
        const errorData = JSON.parse(jsonPart);
        // Extract the actual error message
        cleanErrorMessage = errorData.error || errorData.message || error.message;
      }
    } catch (parseError) {
      // If JSON parsing fails, keep the original message
      cleanErrorMessage = error.message;
    }
  }

  if (cleanErrorMessage.includes('Authentication required')) {
    throw new Error('You must be logged in to perform this action');
  }

  if (cleanErrorMessage.includes('404')) {
    throw new Error('The requested resource was not found');
  }

  if (cleanErrorMessage.includes('403')) {
    throw new Error('You do not have permission to perform this action');
  }

  if (cleanErrorMessage.includes('500')) {
    throw new Error('Server error. Please try again later.');
  }

  throw new Error(cleanErrorMessage);
};

export const baseApiService = {
  // Core API methods
  getAuthHeaders,
  makeApiCall,
  makeApiBlobCall,

  // Authentication helpers
  canMakeAuthenticatedCall,
  getCurrentTherapistEmail,

  // Validation helpers
  validateEmail,
  validateRequired,

  // Error handling
  handleApiError,

  // Constants
  API_URL,
  API_KEY,

  // Test connection
  async testConnection(): Promise<{ message: string }> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for API calls");
    }

    console.log("📞 testConnection API call");
    const result = await makeApiCall<{ message: string }>(`/api/test`);
    console.log("✅ testConnection success:", result);
    return result;
  },
};