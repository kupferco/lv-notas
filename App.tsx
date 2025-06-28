// App.tsx
import React, { useState, useEffect } from "react";
import { View, StyleSheet, ActivityIndicator, Text } from "react-native";
import { Router } from "./src/components/Router";
import { TherapistOnboarding } from "./src/components/TherapistOnboarding";
import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import { checkAuthState, onAuthStateChange, isDevelopment } from "./src/config/firebase";
import { apiService } from "./src/services/api";
import type { User } from "firebase/auth";

type AppState = "loading" | "onboarding" | "authenticated";

// Main App component that uses AuthContext
const AppContent: React.FC = () => {
  const [appState, setAppState] = useState<AppState>("loading");
  const { user, isAuthenticated, isLoading: authLoading, hasValidTokens, signOut } = useAuth();

  useEffect(() => {
    if (!authLoading) {
      initializeApp();
    }
  }, [authLoading, isAuthenticated, hasValidTokens]);

  const initializeApp = async () => {
    try {
      console.log("🚀 Initializing LV Notas App");
      console.log("Auth state:", { isAuthenticated, hasValidTokens, userEmail: user?.email });

      // Add this debug info:
      console.log("🔍 Debug localStorage:");
      console.log("- therapist_email:", localStorage.getItem("therapist_email"));
      console.log("- therapist_name:", localStorage.getItem("therapist_name"));
      console.log("- google_access_token:", !!localStorage.getItem("google_access_token"));

      if (!isAuthenticated) {
        console.log("No authenticated user, showing onboarding");
        setAppState("onboarding");
        return;
      }

      if (!hasValidTokens) {
        console.log("Invalid tokens, showing onboarding");
        setAppState("onboarding");
        return;
      }

      const email = user?.email;
      if (!email) {
        console.log("No email available, showing onboarding");
        setAppState("onboarding");
        return;
      }

      // Check if therapist exists and has calendar configured
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
    }
  };

  const handleOnboardingComplete = async (email: string) => {
    console.log("✅ Onboarding completed for:", email);
    setAppState("authenticated");
  };

  const handleLogout = () => {
    console.log("🚪 User logged out");

    if (isDevelopment) {
      localStorage.removeItem("therapist_email");
      localStorage.removeItem("therapist_calendar_id");
      localStorage.removeItem("google_access_token");
    }

    setAppState("onboarding");
  };

  const renderLoadingScreen = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#6200ee" />
      <Text style={styles.loadingText}>Carregando LV Notas...</Text>
      {isDevelopment && (
        <Text style={styles.devText}>Modo Desenvolvimento</Text>
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

    if (authLoading) {
      return renderLoadingScreen();
    }

    switch (appState) {
      case "loading":
        return renderLoadingScreen();
      case "onboarding":
        return renderOnboardingScreen();
      case "authenticated":
        return renderAuthenticatedApp();
      default:
        return renderLoadingScreen();
    }
  };

  return (
    <View style={styles.container}>
      {renderCurrentScreen()}
    </View>
  );
};

// Root App component with AuthProvider
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
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
    paddingHorizontal: 20,
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
  devText: {
    marginTop: 8,
    fontSize: 12,
    color: "#888",
    fontStyle: "italic",
  },
});