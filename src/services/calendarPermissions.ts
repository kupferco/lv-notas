// src/services/calendarPermissions.ts
import { signInWithGoogle, getCurrentUser, checkCalendarPermissions, getGoogleAccessToken } from '../config/firebase';

export interface CalendarPermissionStatus {
  hasPermissions: boolean;
  needsReauth: boolean;
  accessToken: string | null;
  user: any;
}

/**
 * Check current calendar permission status
 */
export const checkCalendarPermissionStatus = async (): Promise<CalendarPermissionStatus> => {
  const user = getCurrentUser();
  const hasPermissions = checkCalendarPermissions();
  const accessToken = getGoogleAccessToken();
  
  console.log("📅 Calendar Permission Status Check:");
  console.log("  User:", user ? user.email : "None");
  console.log("  Has Permissions:", hasPermissions);
  console.log("  Access Token:", accessToken ? "Present" : "Missing");
  
  return {
    hasPermissions,
    needsReauth: !!(user && !hasPermissions), // Convert to boolean: User is signed in but missing calendar permissions
    accessToken,
    user
  };
};

/**
 * Ensure calendar permissions are granted - request if missing
 */
export const ensureCalendarPermissions = async (): Promise<boolean> => {
  try {
    console.log("🔐 Ensuring calendar permissions...");
    
    const status = await checkCalendarPermissionStatus();
    
    // If we have permissions, we're good
    if (status.hasPermissions && status.accessToken) {
      console.log("✅ Calendar permissions already granted");
      return true;
    }
    
    // If user is signed in but missing calendar permissions, or no user at all
    if (!status.user || status.needsReauth) {
      console.log("🔄 Re-authenticating to get calendar permissions...");
      
      // Force re-authentication with consent screen to get calendar permissions
      const user = await signInWithGoogle();
      
      if (user) {
        // Check if we now have permissions
        const newStatus = await checkCalendarPermissionStatus();
        
        if (newStatus.hasPermissions && newStatus.accessToken) {
          console.log("✅ Calendar permissions granted after re-authentication");
          return true;
        } else {
          console.error("❌ Calendar permissions still missing after re-authentication");
          return false;
        }
      } else {
        console.error("❌ Re-authentication failed");
        return false;
      }
    }
    
    return false;
  } catch (error) {
    console.error("❌ Error ensuring calendar permissions:", error);
    return false;
  }
};

/**
 * Show user-friendly message about calendar permissions
 */
export const getCalendarPermissionMessage = (status: CalendarPermissionStatus): string => {
  if (!status.user) {
    return "Por favor, faça login com sua conta Google para acessar o calendário.";
  }
  
  if (status.needsReauth) {
    return "Precisamos de permissão para acessar seu Google Calendar. Clique para autorizar.";
  }
  
  if (status.hasPermissions) {
    return "Calendário conectado com sucesso!";
  }
  
  return "Verificando permissões do calendário...";
};

/**
 * Test calendar access by making a simple API call
 */
export const testCalendarAccess = async (): Promise<boolean> => {
  try {
    const accessToken = getGoogleAccessToken();
    
    if (!accessToken) {
      console.log("❌ No access token for calendar test");
      return false;
    }
    
    // Test calendar access with a simple API call
    const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      console.log("✅ Calendar access test successful");
      return true;
    } else {
      console.log("❌ Calendar access test failed:", response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error("❌ Calendar access test error:", error);
    return false;
  }
};

export default {
  checkCalendarPermissionStatus,
  ensureCalendarPermissions,
  getCalendarPermissionMessage,
  testCalendarAccess
};