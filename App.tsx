// App.tsx
import React, { useState, useEffect } from "react";
import { View, StyleSheet, ActivityIndicator, Text } from "react-native";
import { Router } from "./src/components/Router";
import { TherapistOnboarding } from "./src/components/TherapistOnboarding";
import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import { SettingsProvider } from './src/contexts/SettingsContext';
import { checkAuthState, onAuthStateChange, isDevelopment } from "./src/config/firebase";
import { apiService } from "./src/services/api";
import { ensureCalendarPermissions, checkCalendarPermissionStatus } from "./src/services/calendarPermissions";
// import type { User } from "firebase/auth";

type AppState = "loading" | "onboarding" | "authenticated" | "calendar_permissions";

// Main App component that uses AuthContext
const AppContent: React.FC = () => {
  console.log('Test Version 1.0.9');
  console.log('🔑 API Key Debug:', {
    safeProxyKey: process.env.SAFE_PROXY_API_KEY ? 'Present' : 'Missing',
    safeProxyKeyValue: process.env.SAFE_PROXY_API_KEY ? 'Hidden' : 'Not found',
    allProcessEnv: typeof process !== 'undefined' ? Object.keys(process.env || {}) : 'process not defined'
  });

  const [appState, setAppState] = useState<AppState>("loading");
  const [retryCount, setRetryCount] = useState(0);
  const [isInitializing, setIsInitializing] = useState(false);
  const [calendarPermissionMessage, setCalendarPermissionMessage] = useState("");
  const { user, isAuthenticated, isLoading: authLoading, hasValidTokens, signOut, forceRefresh } = useAuth();

  useEffect(() => {
    if (!authLoading) {
      initializeApp();
    }
  }, [authLoading, isAuthenticated, hasValidTokens]);

  const initializeApp = async () => {
    // Prevent duplicate initialization calls
    if (isInitializing) {
      console.log("⏸️ Already initializing, skipping duplicate call");
      return;
    }

    setIsInitializing(true);
    try {
      console.log("🚀 Initializing LV Notas App");
      console.log("Auth state:", { isAuthenticated, hasValidTokens, userEmail: user?.email });

      // Add this debug info:
      console.log("🔍 Debug localStorage:");
      console.log("- therapist_email:", localStorage.getItem("therapist_email"));
      console.log("- therapist_name:", localStorage.getItem("therapist_name"));
      console.log("- google_access_token:", !!localStorage.getItem("google_access_token"));
      console.log("- calendar_permission_granted:", localStorage.getItem("calendar_permission_granted"));

      if (!isAuthenticated) {
        console.log("No authenticated user, showing onboarding");
        setAppState("onboarding");
        setIsInitializing(false);
        return;
      }

      if (!hasValidTokens) {
        console.log("Invalid tokens, showing onboarding");
        setAppState("onboarding");
        setIsInitializing(false);
        return;
      }

      const email = user?.email;
      if (!isAuthenticated || !hasValidTokens || !email) {
        console.log("No email available, showing onboarding");
        setAppState("onboarding");
        setIsInitializing(false);
        return;
      }

      // STEP 1: Check calendar permissions first
      console.log("📅 Checking calendar permissions...");
      const calendarStatus = await checkCalendarPermissionStatus();

      if (!calendarStatus.hasPermissions) {
        console.log("⚠️ Calendar permissions missing, requesting permissions...");
        setCalendarPermissionMessage("Solicitando permissões do Google Calendar...");
        setAppState("calendar_permissions");

        try {
          const permissionsGranted = await ensureCalendarPermissions();

          if (!permissionsGranted) {
            console.error("❌ Failed to get calendar permissions");
            setCalendarPermissionMessage("Erro: Permissões do calendário são obrigatórias para continuar.");
            setIsInitializing(false);
            return;
          }

          console.log("✅ Calendar permissions granted successfully");
        } catch (error) {
          console.error("❌ Error getting calendar permissions:", error);
          setCalendarPermissionMessage("Erro ao solicitar permissões do calendário. Tente novamente.");
          setIsInitializing(false);
          return;
        }
      } else {
        console.log("✅ Calendar permissions already granted");
      }

      // STEP 2: Check if therapist exists and has calendar configured
      try {
        const therapist = await apiService.getTherapistByEmail(email);
        console.log("Therapist data:", therapist);

        if (therapist && therapist.googleCalendarId) {
          console.log("✅ Therapist fully configured, going to authenticated state");
          setAppState("authenticated");

          // Update localStorage for development
          if (isDevelopment) {
            localStorage.setItem("therapist_email", email);
            localStorage.setItem("therapist_calendar_id", therapist.googleCalendarId);
          }
        } else {
          console.log("⚠️ Therapist needs onboarding");
          setAppState("onboarding");
        }
      } catch (error) {
        console.error("Error checking therapist:", error);
        setAppState("onboarding");
      }
    } catch (error) {
      console.error("❌ Error initializing app:", error);
      setAppState("onboarding");
    } finally {
      setIsInitializing(false);
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

  const handleLogout = () => {
    console.log("🚪 User logged out");

    // Reset all state
    setRetryCount(0);
    setAppState("loading");

    if (isDevelopment) {
      localStorage.removeItem("therapist_email");
      localStorage.removeItem("therapist_calendar_id");
      localStorage.removeItem("google_access_token");
      localStorage.removeItem("calendar_permission_granted");
    }

    // Force re-initialization after clearing state
    setTimeout(() => {
      setAppState("onboarding");
    }, 500);
  };

  const emergencyReset = () => {
    console.log("🚨 Emergency reset triggered");
    localStorage.clear();
    setRetryCount(0);
    setAppState("onboarding");
  };

  const renderLoadingScreen = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#6200ee" />
      <Text style={styles.loadingText}>Carregando LV Notas...</Text>
      {isDevelopment && (
        <Text style={styles.devText}>Modo Desenvolvimento</Text>
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
    </View>
  );

  const renderCurrentScreen = () => {
    console.log("🎨 Rendering screen for appState:", appState);
    console.log("🔍 Current auth state:", { isAuthenticated, hasValidTokens, userEmail: user?.email });

    if (authLoading) {
      console.log("🔄 Auth still loading, showing loading screen");
      return renderLoadingScreen();
    }

    switch (appState) {
      case "loading":
        console.log("📱 Rendering loading screen");
        return renderLoadingScreen();
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
    paddingHorizontal: 20,
  },
  appContainer: {
    flex: 1,
    backgroundColor: "#fff",
    // paddingHorizontal: 20,
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