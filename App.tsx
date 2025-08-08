// App.tsx - Updated with comprehensive debug logging to identify flickering issue
import React, { useState, useEffect } from "react";
import { View, StyleSheet, ActivityIndicator, Text } from "react-native";
import { Router } from "./src/components/Router";
import { TherapistOnboarding } from "./src/components/TherapistOnboarding";
import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import { AuthNavigator } from "./src/components/auth/AuthNavigator";
import { SettingsProvider } from './src/contexts/SettingsContext';
import { SessionTimeoutModal } from "./src/components/common/SessionTimeoutModal";
import { isDevelopment } from "./src/config/firebase";
import { apiService } from "./src/services/api";
import { ensureCalendarPermissions, checkCalendarPermissionStatus } from "./src/services/calendarPermissions";

import { initializeGoogleOAuth } from './src/config/firebase';

import { useActivityMonitor } from './src/utils/activityMonitor';

type AppState = "loading" | "login" | "onboarding" | "authenticated" | "calendar_permissions";

// Main App component that uses AuthContext
const AppContent: React.FC = () => {
  console.log('LV Notas Version 2.0.7 - New Credential Authentication System');
  console.log('🔑 API Key Debug:', {
    safeProxyKey: process.env.SAFE_PROXY_API_KEY ? 'Present' : 'Missing',
    isDevelopment: isDevelopment
  });

  const [appState, setAppState] = useState<AppState>("loading");
  const [retryCount, setRetryCount] = useState(0);
  const [isInitializing, setIsInitializing] = useState(false);
  const [calendarPermissionMessage, setCalendarPermissionMessage] = useState("");

  const {
    user,
    isLoading: authLoading,
    isAuthenticated,
    hasValidTokens,
    showSessionWarning,
    extendSession,
    signOut,
    forceRefresh
  } = useAuth();

  // Add this at the very top of your AppContent component
  console.log('🎬 AppContent RENDER:', {
    appState,
    authLoading,
    isAuthenticated,
    hasValidTokens,
    userEmail: user?.email,
    isInitializing,
    retryCount
  });

  // Add this to your useEffect
  useEffect(() => {
    console.log('🔄 Main useEffect triggered:', {
      authLoading,
      isAuthenticated,
      hasValidTokens,
      appState,
      userEmail: user?.email
    });

    if (!authLoading) {
      if (isAuthenticated) {
        setRetryCount(0);
      }
      initializeApp();
    }
  }, [authLoading, isAuthenticated, hasValidTokens]);

  const initializeApp = async () => {
    console.log('🚀 initializeApp CALLED:', {
      isInitializing,
      appState,
      isAuthenticated,
      hasValidTokens,
      userEmail: user?.email
    });

    // Prevent duplicate initialization calls
    if (isInitializing) {
      console.log("⏸️ Already initializing, skipping duplicate call");
      return;
    }

    setIsInitializing(true);
    console.log("🔥 setIsInitializing(true) - Starting initialization");

    try {
      console.log("🚀 Initializing LV Notas App with new auth system");
      console.log("Auth state:", { isAuthenticated, hasValidTokens, userEmail: user?.email });

      // Debug localStorage
      console.log("🔍 Debug localStorage:");
      console.log("- session_token:", !!localStorage.getItem("session_token"));
      console.log("- user_data:", !!localStorage.getItem("user_data"));
      console.log("- google_access_token:", !!localStorage.getItem("google_access_token"));
      console.log("- calendar_permission_granted:", localStorage.getItem("calendar_permission_granted"));

      // Initialize Google OAuth service
      initializeGoogleOAuth();

      // If not authenticated, show login
      if (!isAuthenticated) {
        console.log("❌ No authenticated user, showing login screen");
        setAppState("login");
        console.log("🔥 setAppState('login') called");
        setIsInitializing(false);
        console.log("🔥 setIsInitializing(false) - Not authenticated");
        return;
      }

      const email = user?.email;
      if (!email) {
        console.log("❌ No email available, showing login screen");
        setAppState("login");
        console.log("🔥 setAppState('login') called - no email");
        setIsInitializing(false);
        console.log("🔥 setIsInitializing(false) - No email");
        return;
      }

      // STEP 1: Check calendar permissions (for Google Calendar integration)
      console.log("📅 Checking calendar permissions...");
      const calendarStatus = await checkCalendarPermissionStatus();

      if (!calendarStatus.hasPermissions) {
        console.log("⚠️ Calendar permissions missing, requesting permissions...");
        setCalendarPermissionMessage("Solicitando permissões do Google Calendar...");
        setAppState("calendar_permissions");
        console.log("🔥 setAppState('calendar_permissions') called");

        try {
          const permissionsGranted = await ensureCalendarPermissions();

          if (!permissionsGranted) {
            console.error("❌ Failed to get calendar permissions");
            setCalendarPermissionMessage("Erro: Permissões do calendário são obrigatórias para continuar.");
            setIsInitializing(false);
            console.log("🔥 setIsInitializing(false) - Calendar permissions failed");
            return;
          }

          console.log("✅ Calendar permissions granted successfully");

          await forceRefresh();
          console.log("🔄 Forced auth refresh after Google re-authentication");
        } catch (error) {
          console.error("❌ Error getting calendar permissions:", error);
          setCalendarPermissionMessage("Erro ao solicitar permissões do calendário. Tente novamente.");
          setIsInitializing(false);
          console.log("🔥 setIsInitializing(false) - Calendar permissions error");
          return;
        }
      } else {
        console.log("✅ Calendar permissions already granted");
      }

      // STEP 2: Check if therapist exists and has calendar configured
      try {
        console.log("👨‍⚕️ Checking therapist data for:", email);
        const therapist = await apiService.getTherapistByEmail(email);
        console.log("👨‍⚕️ Therapist data:", therapist);

        if (therapist && therapist.googleCalendarId) {
          console.log("✅ Therapist fully configured, going to authenticated state");
          setAppState("authenticated");
          console.log("🔥 setAppState('authenticated') called");

          // Update localStorage for development
          if (isDevelopment) {
            localStorage.setItem("therapist_email", email);
            localStorage.setItem("therapist_calendar_id", therapist.googleCalendarId);
            console.log("💾 Updated localStorage with therapist data");
          }
        } else {
          console.log("⚠️ Therapist needs onboarding");
          setAppState("onboarding");
          console.log("🔥 setAppState('onboarding') called");
        }
      } catch (error) {
        console.error("❌ Error checking therapist:", error);
        setAppState("onboarding");
        console.log("🔥 setAppState('onboarding') called - error");
      }
    } catch (error) {
      console.error("❌ Error initializing app:", error);
      setAppState("login");
      console.log("🔥 setAppState('login') called - global error");
    } finally {
      setIsInitializing(false);
      console.log("🔥 setIsInitializing(false) - Finally block");
    }
  };

  const handleOnboardingComplete = async (email: string) => {
    console.log("✅ Onboarding completed for:", email);
    console.log("🔄 Starting post-onboarding initialization...");

    // Prevent infinite retries
    if (retryCount > 3) {
      console.error("❌ Too many retry attempts, forcing authenticated state");
      setAppState("authenticated");
      return;
    }

    try {
      // Force refresh the auth context to pick up latest user state
      console.log("⚡ Force refreshing auth context...");
      await forceRefresh();

      // Small delay to ensure auth state is updated
      await new Promise(resolve => setTimeout(resolve, 500));

      // Try to get therapist data with retry logic
      let therapist = null;
      let attempts = 0;
      const maxAttempts = 3;

      while (!therapist && attempts < maxAttempts) {
        attempts++;
        console.log(`📋 Attempting to fetch therapist data (attempt ${attempts}/${maxAttempts})`);

        try {
          therapist = await apiService.getTherapistByEmail(email);
          if (therapist) {
            console.log("✅ Successfully fetched therapist data:", therapist);
            break;
          }
        } catch (error: any) {
          console.warn(`⚠️ Attempt ${attempts} failed:`, error.message);
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
          }
        }
      }

      if (therapist && therapist.googleCalendarId) {
        // Update localStorage immediately
        if (isDevelopment) {
          localStorage.setItem("therapist_email", email);
          localStorage.setItem("therapist_calendar_id", therapist.googleCalendarId);
          console.log("💾 Updated localStorage with therapist data");
        }

        console.log("🎯 Successfully completing onboarding, setting authenticated state");
        setAppState("authenticated");
        setRetryCount(0); // Reset retry count on success

      } else {
        console.error("❌ Therapist data still incomplete after onboarding");
        console.error("Therapist object:", therapist);

        // Increment retry count and try again
        setRetryCount(prev => prev + 1);

        if (retryCount < 3) {
          console.log(`🔄 Retrying initialization (${retryCount + 1}/3)...`);
          setTimeout(() => initializeApp(), 2000);
        } else {
          console.error("❌ Max retries reached, forcing authenticated state anyway");
          setAppState("authenticated");
        }
      }
    } catch (error) {
      console.error("❌ Error in onboarding completion:", error);

      // Increment retry count
      setRetryCount(prev => prev + 1);

      if (retryCount < 3) {
        console.log(`🔄 Retrying after error (${retryCount + 1}/3)...`);
        setTimeout(() => initializeApp(), 2000);
      } else {
        console.error("❌ Max retries reached, forcing authenticated state");
        setAppState("authenticated");
      }
    }
  };

  const handleCalendarPermissionRetry = async () => {
    console.log("🔄 Retrying calendar permissions...");
    setCalendarPermissionMessage("Tentando novamente...");
    await initializeApp();
  };

  const handleLogout = async () => {
    console.log("🚪 User logged out");

    // Reset all state
    setRetryCount(0);
    setAppState("loading");

    // Clear any cached data - BUT DON'T CLEAR GOOGLE TOKENS
    if (isDevelopment) {
      localStorage.removeItem("therapist_email");
      localStorage.removeItem("therapist_calendar_id");
      // DON'T CLEAR THESE:
      // localStorage.removeItem("google_access_token");
      // localStorage.removeItem("calendar_permission_granted");
    }

    // Force re-initialization after clearing state
    setTimeout(() => {
      setAppState("login");
    }, 500);
  };

  const handleSessionTimeout = async () => {
    console.log("🕐 Session timeout - logging out");
    await signOut();
    setAppState("login");
  };

  const emergencyReset = () => {
    console.log("🚨 Emergency reset triggered");
    localStorage.clear();
    setRetryCount(0);
    setAppState("login");
  };

  const renderLoadingScreen = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#6200ee" />
      <Text style={styles.loadingText}>Carregando LV Notas...</Text>
      {isDevelopment && (
        <Text style={styles.devText}>Modo Desenvolvimento - Novo Sistema de Autenticação</Text>
      )}
      <Text style={styles.debugText}>Estado atual: {appState}</Text>
      {retryCount > 0 && (
        <Text style={styles.retryText}>Tentativas: {retryCount}/3</Text>
      )}
      {retryCount > 2 && (
        <Text style={styles.emergencyText} onPress={emergencyReset}>
          🚨 Clique aqui para reset de emergência
        </Text>
      )}
    </View>
  );

  const renderLoginScreen = () => (
    <View style={styles.centeredContainer}>
      <AuthNavigator
        initialScreen="login"
      />
    </View>
  );

  const renderCalendarPermissionScreen = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#6200ee" />
      <Text style={styles.loadingText}>🗓️ Google Calendar</Text>
      <Text style={styles.permissionText}>{calendarPermissionMessage}</Text>
      <Text style={styles.infoText}>
        Precisamos acessar seu Google Calendar para sincronizar suas sessões automaticamente.
      </Text>
      {calendarPermissionMessage.includes("Erro") && (
        <Text style={styles.retryButton} onPress={handleCalendarPermissionRetry}>
          🔄 Tentar Novamente
        </Text>
      )}
      {isDevelopment && (
        <Text style={styles.devText}>Modo Desenvolvimento - Calendar Permissions</Text>
      )}
    </View>
  );

  const renderOnboardingScreen = () => (
    <View style={styles.centeredContainer}>
      <TherapistOnboarding
        onComplete={handleOnboardingComplete}
        mode="full"
      />
    </View>
  );

  const renderAuthenticatedApp = () => (
    <View style={styles.appContainer}>
      <Router />

      {/* Session Timeout Warning Modal */}
      <SessionTimeoutModal
        visible={showSessionWarning}
        onExtend={extendSession}
        onLogout={handleSessionTimeout}
      />
    </View>
  );

  const renderCurrentScreen = () => {
    console.log("🎨 Rendering screen for appState:", appState);
    console.log("🔍 Current auth state:", { isAuthenticated, hasValidTokens, userEmail: user?.email });

    // CRITICAL FIX: Never show login screen if user is authenticated
    if (authLoading) {
      console.log("🔄 Auth still loading, showing loading screen");
      return renderLoadingScreen();
    }

    // If user is authenticated but appState hasn't caught up yet, show loading
    if (isAuthenticated && (appState === "loading" || appState === "login")) {
      console.log("🔄 User authenticated but app state not ready, showing loading screen");
      return renderLoadingScreen();
    }

    switch (appState) {
      case "loading":
        console.log("📱 Rendering loading screen");
        return renderLoadingScreen();
      case "login":
        // Double-check: only show login if NOT authenticated
        if (isAuthenticated) {
          console.log("🚨 User authenticated but appState is login - showing loading instead");
          return renderLoadingScreen();
        }
        console.log("🔐 Rendering login screen");
        return renderLoginScreen();
      case "calendar_permissions":
        console.log("📅 Rendering calendar permissions screen");
        return renderCalendarPermissionScreen();
      case "onboarding":
        console.log("🎯 Rendering onboarding screen");
        return renderOnboardingScreen();
      case "authenticated":
        console.log("✅ Rendering authenticated app (Router)");
        return renderAuthenticatedApp();
      default:
        console.log("❓ Unknown state, rendering loading screen");
        return renderLoadingScreen();
    }
  };

  return (
    <View style={styles.container}>
      {renderCurrentScreen()}
    </View>
  );
};

// Root App component with AuthProvider AND SettingsProvider
export default function App() {

  const { startMonitoring, stopMonitoring } = useActivityMonitor();

  useEffect(() => {
    startMonitoring();
    return stopMonitoring;
  }, []);

  return (
    <AuthProvider>
      <SettingsProvider>
        <AppContent />
      </SettingsProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 20,
  },
  centeredContainer: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  appContainer: {
    flex: 1,
    backgroundColor: "#fff",
    maxWidth: 730,
    alignSelf: 'center',
    width: '100%',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6c757d",
    textAlign: "center",
  },
  permissionText: {
    marginTop: 12,
    fontSize: 14,
    color: "#495057",
    textAlign: "center",
    fontWeight: "500",
  },
  infoText: {
    marginTop: 16,
    fontSize: 13,
    color: "#6c757d",
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  retryButton: {
    marginTop: 20,
    fontSize: 16,
    color: "#6200ee",
    fontWeight: "bold",
    textDecorationLine: "underline",
    cursor: "pointer",
  },
  devText: {
    marginTop: 8,
    fontSize: 12,
    color: "#888",
    fontStyle: "italic",
  },
  debugText: {
    marginTop: 8,
    fontSize: 12,
    color: "#dc3545",
    fontStyle: "italic",
  },
  retryText: {
    marginTop: 4,
    fontSize: 12,
    color: "#fd7e14",
    fontStyle: "italic",
  },
  emergencyText: {
    marginTop: 8,
    fontSize: 14,
    color: "#dc3545",
    fontWeight: "bold",
    textDecorationLine: "underline",
    cursor: "pointer",
  },
});