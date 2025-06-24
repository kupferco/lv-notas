import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { NavigationBar } from "./NavigationBar";
import { CheckInForm } from "./CheckInForm";
import { PatientManagement } from "./PatientManagement";
import { TherapistOnboarding } from "./TherapistOnboarding";
import { Settings } from "./Settings";

interface RouterProps {
  therapistEmail: string | null;
  onOnboardingComplete: (email: string) => void;
  onLogout: () => void;
}

export const Router: React.FC<RouterProps> = ({ therapistEmail, onOnboardingComplete, onLogout }) => {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  
  console.log("Router render - currentPath:", currentPath, "therapistEmail:", therapistEmail);
  
  // Listen for URL changes (back/forward buttons, direct navigation)
  useEffect(() => {
    const handlePopState = () => {
      console.log("URL changed to:", window.location.pathname);
      setCurrentPath(window.location.pathname);
    };

    // Set initial path
    setCurrentPath(window.location.pathname);
    
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // If no therapist is logged in, always show onboarding
  if (!therapistEmail) {
    console.log("No therapist, showing onboarding");
    return <TherapistOnboarding onComplete={onOnboardingComplete} />;
  }

  console.log("Routing to path:", currentPath);

  // Navigation helper function
  const navigateTo = (path: string) => {
    console.log("Navigating to:", path);
    window.history.pushState({}, "", path);
    window.dispatchEvent(new Event("popstate"));
  };

  // Render the appropriate component based on path
  const renderContent = () => {
    switch (currentPath) {
      case "/check-in":
        console.log("Rendering CheckInForm");
        return <CheckInForm therapistEmail={therapistEmail} />;

      case "/pacientes":
        console.log("Rendering PatientManagement for route /pacientes");
        return (
          <PatientManagement
            therapistEmail={therapistEmail}
            onComplete={() => {
              // After adding patients in regular app, stay on this page
              console.log("Patient added successfully - staying on /pacientes");
            }}
          />
        );

      case "/configuracoes":
        console.log("Rendering Settings");
        return <Settings therapistEmail={therapistEmail} onLogout={onLogout} />;
      
      case "/dashboard":
      case "/":
      default:
        console.log("Rendering Dashboard");
        return (
          <View style={styles.dashboardContainer}>
            <Text style={styles.dashboardTitle}>Dashboard</Text>
            <Text style={styles.dashboardSubtitle}>
              Aqui você terá uma visão geral das suas sessões, pacientes e estatísticas.
            </Text>
            <Text style={styles.comingSoon}>Em breve! 🚀</Text>
            
            {/* Quick action buttons */}
            <View style={styles.quickActions}>
              <Pressable
                style={styles.quickActionButton}
                onPress={() => navigateTo("/pacientes")}
              >
                <Text style={styles.quickActionText}>👥 Gerenciar Pacientes</Text>
              </Pressable>
              
              <Pressable
                style={styles.quickActionButton}
                onPress={() => navigateTo("/check-in")}
              >
                <Text style={styles.quickActionText}>✅ Check-in de Pacientes</Text>
              </Pressable>
            </View>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <NavigationBar />
      <View style={styles.content}>
        {renderContent()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
  },
  dashboardContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f8f9fa",
  },
  dashboardTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#212529",
    marginBottom: 16,
    textAlign: "center",
  },
  dashboardSubtitle: {
    fontSize: 16,
    color: "#6c757d",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  comingSoon: {
    fontSize: 18,
    color: "#6200ee",
    fontWeight: "600",
    marginBottom: 40,
  },
  quickActions: {
    width: "100%",
    maxWidth: 400,
  },
  quickActionButton: {
    backgroundColor: "#6200ee",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: "center",
  },
  quickActionText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

// Navigation helper functions
export const navigateTo = (path: string) => {
  console.log("Navigating to:", path);
  window.history.pushState({}, "", path);
  window.dispatchEvent(new Event("popstate"));
};

export const getCurrentPath = () => window.location.pathname;