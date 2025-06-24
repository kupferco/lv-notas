import React, { useState, useEffect } from "react";
import { View, StyleSheet, ActivityIndicator, Text } from "react-native";
import { Router } from "./src/components/Router";
import { TherapistOnboarding } from "./src/components/TherapistOnboarding";
import { checkAuthState, onAuthStateChange, isDevelopment } from "./src/config/firebase";
import { apiService } from "./src/services/api";
import type { User } from "firebase/auth";

type AppState = "loading" | "onboarding" | "authenticated";

export default function App() {
  const [appState, setAppState] = useState<AppState>("loading");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [therapistEmail, setTherapistEmail] = useState<string>("");

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log("🚀 Initializing LV Notas App");

      if (isDevelopment) {
        // Development mode - check localStorage first
        const savedEmail = localStorage.getItem("therapist_email");
        const savedCalendarId = localStorage.getItem("therapist_calendar_id");
        
        console.log("📱 Development: savedEmail from localStorage:", savedEmail);
        console.log("📱 Development: savedCalendarId from localStorage:", savedCalendarId);
        
        if (savedEmail && savedCalendarId) {
          console.log("✅ Development: Found both email and calendar ID, going directly to authenticated");
          setTherapistEmail(savedEmail);
          setAppState("authenticated");
          return;
        }
        
        if (savedEmail) {
          console.log("🔍 Development: Found saved email but no calendar, checking database...");
          
          // Verify therapist exists and has calendar configured
          const therapist = await apiService.getTherapistByEmail(savedEmail);
          console.log("🔍 Development: Therapist from API:", therapist);
          
          if (therapist && therapist.googleCalendarId) {
            console.log("✅ Development: Therapist has calendar in database, saving to localStorage");
            localStorage.setItem("therapist_calendar_id", therapist.googleCalendarId);
            setTherapistEmail(savedEmail);
            setAppState("authenticated");
            return;
          } else if (therapist) {
            console.log("⚠️ Development: Therapist exists but no calendar, going to onboarding");
            setAppState("onboarding");
            return;
          } else {
            console.log("❌ Development: Therapist not found, going to onboarding");
            setAppState("onboarding");
            return;
          }
        } else {
          console.log("📱 Development: No saved therapist, showing onboarding");
          setAppState("onboarding");
          return;
        }
      } else {
        // Production mode - check Firebase auth
        const user = await checkAuthState();
        if (user && user.email) {
          console.log("Production: Found authenticated user:", user.email);
          setCurrentUser(user);
          
          // Verify therapist exists and has calendar configured
          const therapist = await apiService.getTherapistByEmail(user.email);
          if (therapist && therapist.googleCalendarId) {
            setTherapistEmail(user.email);
            setAppState("authenticated");
            
            // Listen for auth state changes
            onAuthStateChange((authUser) => {
              if (!authUser) {
                // User signed out
                handleLogout();
              }
            });
            return;
          } else {
            console.log("Production: User needs onboarding");
            setAppState("onboarding");
            return;
          }
        } else {
          console.log("Production: No authenticated user, showing onboarding");
          setAppState("onboarding");
          return;
        }
      }
    } catch (error) {
      console.error("❌ Error initializing app:", error);
      setAppState("onboarding");
    }
  };

  const handleOnboardingComplete = async (email: string) => {
    console.log("✅ Onboarding completed for:", email);
    
    if (isDevelopment) {
      // Store email in localStorage for development
      localStorage.setItem("therapist_email", email);
    }
    
    setTherapistEmail(email);
    setAppState("authenticated");
  };

  const handleLogout = () => {
    console.log("🚪 User logged out");
    
    if (isDevelopment) {
      localStorage.removeItem("therapist_email");
      localStorage.removeItem("therapist_calendar_id");
    }
    
    setCurrentUser(null);
    setTherapistEmail("");
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
    <TherapistOnboarding 
      onComplete={handleOnboardingComplete}
      mode="full"
    />
  );

  const renderAuthenticatedApp = () => (
    <Router 
      therapistEmail={therapistEmail}
      onLogout={handleLogout}
      onOnboardingComplete={handleOnboardingComplete}
    />
  );

  const renderCurrentScreen = () => {
    console.log("🎨 Rendering screen for appState:", appState);
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
