// src/components/TherapistOnboarding.tsx
import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, SafeAreaView } from "react-native";
import { signInWithGoogle, checkAuthState, signOutUser, isDevelopment, auth } from "../config/firebase";
import { apiService } from "../services/api";
import { PatientManagement } from "./PatientManagement";
import { CalendarSelection } from "./CalendarSelection";
import type { Therapist, OnboardingState } from "../types/index";
import { CalendarImportWizard } from "./onboarding/CalendarImportWizard";
import type { User } from "firebase/auth";

interface TherapistOnboardingProps {
  onComplete?: (therapistEmail: string) => void;
  mode?: "full" | "addPatient";
  existingTherapist?: string | null;
}

export const TherapistOnboarding: React.FC<TherapistOnboardingProps> = ({
  onComplete,
  mode = "full",
  existingTherapist
}) => {
  const [state, setState] = useState<OnboardingState>({
    step: mode === "addPatient" ? "addPatients" : "welcome"
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Set up existing therapist for addPatient mode
  useEffect(() => {
    if (mode === "addPatient" && existingTherapist) {
      setState({
        step: "addPatients",
        therapist: {
          email: existingTherapist,
          name: existingTherapist.split("@")[0],
          id: "existing"
        }
      });
    }
  }, [mode, existingTherapist]);

  // Check for existing authentication on component mount
  useEffect(() => {
    if (mode === "full") {
      checkExistingAuth();
    }
  }, [mode]);

  const checkExistingAuth = async () => {
    try {
      // Always use real Google authentication - no mock users
      // Check if user is already signed in with real account
      if (auth?.currentUser) {
        const user = auth.currentUser;
        setCurrentUser(user);
        const savedCalendarId = localStorage.getItem("therapist_calendar_id");

        // Check if this user already has calendar setup in database
        try {
          const existingTherapist = await apiService.getTherapistByEmail(user.email!);
          if (existingTherapist && existingTherapist.googleCalendarId) {
            localStorage.setItem("therapist_calendar_id", existingTherapist.googleCalendarId);
            setState({ step: "success", therapist: existingTherapist });
          } else if (existingTherapist) {
            setState({ step: "calendar-selection", therapist: existingTherapist });
          } else {
            setState({ step: "calendar-selection" });
          }
        } catch (error) {
          console.log("No existing therapist found, proceeding to calendar selection");
          setState({ step: "calendar-selection" });
        }
        return;
      } else {
        // In production, check real Firebase auth
        const user = await checkAuthState();
        if (user) {
          setCurrentUser(user);
          const existingTherapist = await apiService.getTherapistByEmail(user.email || "");
          if (existingTherapist && existingTherapist.googleCalendarId) {
            setState({ step: "success", therapist: existingTherapist });
          } else if (existingTherapist) {
            setState({ step: "calendar-selection", therapist: existingTherapist });
          }
          return;
        }
      }
    } catch (error) {
      console.error("Error checking auth state:", error);
    }
  };


  const handleGetStarted = async () => {
    setIsLoading(true);
    setState({
      step: "auth"
    });

    try {
      let user: User | null = null;

      // Use real Google authentication for both development and production
      user = await signInWithGoogle();

      if (user) {
        setCurrentUser(user);
        await handleAuthSuccess(user);
      }
    } catch (error) {
      console.error("Authentication error:", error);
      setState({
        step: "welcome",
        error: "Falha na autenticação. Tente novamente."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthSuccess = async (user: User) => {
    setIsLoading(true);
    setState({ step: "calendar-selection" });

    console.log("=== AUTH SUCCESS ===");
    console.log("User email:", user.email);

    try {
      // Check if therapist already exists
      const existingTherapist = await apiService.getTherapistByEmail(user.email || "");

      if (existingTherapist) {
        console.log("Existing therapist found:", existingTherapist);
        if (existingTherapist.googleCalendarId) {
          // Save calendar selection to localStorage
          localStorage.setItem("therapist_calendar_id", existingTherapist.googleCalendarId);
          // Therapist already configured - go to success
          setState({
            step: "success",
            therapist: existingTherapist
          });
        } else {
          // Therapist exists but needs calendar setup
          setState({
            step: "calendar-selection",
            therapist: existingTherapist
          });
        }
      } else {
        // NEW therapist - create account but wait for calendar selection
        console.log("Creating new therapist");
        const newTherapist = await apiService.createTherapist({
          name: user.displayName || user.email || "Terapeuta",
          email: user.email || "",
          googleCalendarId: ""
        });

        setState({
          step: "calendar-selection",
          therapist: newTherapist
        });
      }
    } catch (error) {
      console.error("Therapist setup error:", error);
      setState({
        step: "welcome",
        error: "Falha ao configurar sua conta. Tente novamente."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalendarSelected = async (calendarId: string, calendarName?: string) => {
    console.log("Calendar selected:", calendarId, calendarName);

    // Prevent double-selection by checking if already processing
    if (isLoading) {
      console.log("Already processing calendar selection, ignoring...");
      return;
    }

    setSelectedCalendarId(calendarId);
    setIsLoading(true);
    setState(prev => ({ ...prev, step: "calendar" }));

    try {
      if (state.therapist && state.therapist.email) {
        console.log("Updating therapist calendar for:", state.therapist.email);

        // Always make the real API call
        await apiService.updateTherapistCalendar(state.therapist.email, calendarId);

        console.log("Calendar update successful");
      }

      // Save both calendar ID and name to localStorage
      localStorage.setItem("therapist_calendar_id", calendarId);
      if (calendarName) {
        localStorage.setItem("therapist_calendar_name", calendarName);
      }
      console.log("✅ Saved calendar ID and name to localStorage:", calendarId, calendarName);

      // Always proceed to success step
      setState(prev => ({
        ...prev,
        step: "success",
        therapist: prev.therapist ? { ...prev.therapist, googleCalendarId: calendarId } : undefined
      }));
      console.log("Set step to success");
    } catch (error) {
      console.error("Error saving calendar:", error);
      setState(prev => ({
        ...prev,
        step: "calendar-selection",
        error: "Erro ao salvar calendário. Tente novamente."
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();

      // Clear ALL localStorage data for clean testing
      localStorage.removeItem("therapist_email");
      localStorage.removeItem("therapist_calendar_id");
      localStorage.removeItem("currentTherapist");
      localStorage.removeItem("google_access_token");

      // Clear any other cached data
      localStorage.clear(); // This clears everything - use with caution

      setCurrentUser(null);
      setSelectedCalendarId(""); // Also clear the state
      setState({ step: "welcome" });

      console.log("🚪 All cache cleared, starting fresh");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const handleFinalize = () => {
    console.log("🔥 FINALIZAR BUTTON CLICKED");
    console.log("onComplete function exists:", !!onComplete);
    console.log("Current therapist:", state.therapist);
    console.log("Therapist email:", state.therapist?.email);

    const email = state.therapist?.email;
    if (onComplete && email) {
      console.log("✅ Calling onComplete with email:", email);
      onComplete(email);

      // Remove the forced navigation - let App.tsx handle the state transition
      // setTimeout(() => {
      //   window.history.pushState({}, "", "/dashboard");
      //   window.dispatchEvent(new Event("popstate"));
      // }, 100);
    } else {
      console.error("❌ Cannot complete - missing onComplete or email");
      console.error("onComplete:", onComplete);
      console.error("email:", email);
    }
  };

  const renderImportWizardStep = () => {
    // Get calendar ID from state or localStorage
    const calendarId = selectedCalendarId ||
      localStorage.getItem("therapist_calendar_id") ||
      state.therapist?.googleCalendarId ||
      "";

    console.log("🗓️ Import wizard calendar ID:", calendarId);

    // Return wizard WITHOUT the stepContainer wrapper
    return (
      <CalendarImportWizard
        therapistEmail={state.therapist?.email || ""}
        calendarId={calendarId}
        onComplete={() => setState(prev => ({ ...prev, step: "success" }))}
        onCancel={() => setState(prev => ({ ...prev, step: "success" }))}
        mode="onboarding"
      />
    );
  };

  const renderWelcomeStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Bem-vindo ao LV Notas</Text>
      <Text style={styles.subtitle}>
        Conecte seu Google Calendar para começar a gerenciar agendamento de sessões de terapia
      </Text>

      <View style={styles.featureList}>
        <Text style={styles.feature}>📅 Acompanhamento automático de comparecimento nas sessões</Text>
        <Text style={styles.feature}>👥 Sistema de check-in de pacientes</Text>
        <Text style={styles.feature}>🔄 Sincronização em tempo real</Text>
      </View>

      {state.error && (
        <Text style={styles.errorText}>{state.error}</Text>
      )}

      <Pressable
        style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
        onPress={handleGetStarted}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? "Autenticando..." : "🔐 Entrar com Google"}
        </Text>
      </Pressable>

      <Text style={styles.disclaimer}>
        Ao continuar, você concorda em conectar seu Google Calendar com LV Notas
      </Text>
    </View>
  );

  const renderAuthStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Conectando ao Google</Text>
      <ActivityIndicator size="large" color="#6200ee" style={styles.loader} />
      <Text style={styles.subtitle}>
        Complete o processo de login do Google na janela popup
      </Text>
    </View>
  );

  const renderCalendarSelectionStep = () => (
    <CalendarSelection
      onCalendarSelected={handleCalendarSelected}
      onBack={() => setState({ step: "welcome" })}
    />
  );

  const renderCalendarStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Salvando calendário...</Text>
      <ActivityIndicator size="large" color="#6200ee" style={styles.loader} />
      <Text style={styles.subtitle}>
        Estamos configurando a integração do seu calendário
      </Text>
    </View>
  );

  const renderSuccessStep = () => {
    // Get calendar name from localStorage or show ID as fallback
    const calendarName = localStorage.getItem("therapist_calendar_name") ||
      state.therapist?.googleCalendarId ||
      "Calendário selecionado";

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.title}>🎉 Tudo pronto!</Text>
        <Text style={styles.subtitle}>
          Bem-vindo {state.therapist?.name}! Seu Google Calendar está conectado.
        </Text>

        {currentUser && (
          <View style={styles.userInfo}>
            <Text style={styles.userEmail}>📧 {currentUser.email}</Text>
            {/* ADD CALENDAR INFO */}
            <Text style={styles.calendarInfo}>📅 {calendarName}</Text>

            <Pressable style={styles.signOutButton} onPress={handleSignOut}>
              <Text style={styles.signOutText}>Trocar conta</Text>
            </Pressable>
            {/* Debug button for testing */}
            <Pressable
              style={styles.signOutButton}
              onPress={() => {
                setSelectedCalendarId("");
                setState(prev => ({ ...prev, step: "calendar-selection" }));
              }}
            >
              <Text style={styles.signOutText}>🔧 Reconfigurar Calendário</Text>
            </Pressable>
          </View>
        )}

        {/* <View style={styles.successInfo}>
          <Text style={styles.infoTitle}>Próximo passo:</Text>
          <Text style={styles.infoItem}>• Importe seus pacientes do calendário automaticamente</Text>
          <Text style={styles.infoItem}>• Ou adicione pacientes manualmente mais tarde</Text>
        </View> */}

        <View style={styles.buttonContainer}>
          {/* <Pressable
            style={styles.secondaryButton}
            onPress={() => setState(prev => ({ ...prev, step: "import-wizard" }))}
          >
            <Text style={styles.secondaryButtonText}>📅 Importar do Calendário</Text>
          </Pressable> */}

          <Pressable
            style={styles.primaryButton}
            onPress={handleFinalize}
          >
            <Text style={styles.buttonText}>➡️ Ir para App</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderAddPatientsStep = () => (
    <PatientManagement
      therapistEmail={state.therapist?.email || existingTherapist || ""}
      onComplete={() => {
        if (onComplete) {
          onComplete(state.therapist?.email || existingTherapist || "");
        }
      }}
    />
  );

  const renderCurrentStep = () => {
    switch (state.step) {
      case "welcome":
        return renderWelcomeStep();
      case "auth":
        return renderAuthStep();
      case "calendar-selection":
        return renderCalendarSelectionStep();
      case "calendar":
        return renderCalendarStep();
      case "success":
        return renderSuccessStep();
      case "import-wizard":
        return renderImportWizardStep(); // ADD THIS CASE
      case "addPatients":
        return renderAddPatientsStep();
      default:
        return renderWelcomeStep();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderCurrentStep()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    maxWidth: 400,
  },
  progressContainer: {
    padding: 20,
    backgroundColor: "#fff",
  },
  progressBar: {
    height: 4,
    backgroundColor: "#e9ecef",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#6200ee",
    borderRadius: 2,
  },
  stepContainer: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#212529",
    marginBottom: 16,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#6c757d",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  featureList: {
    marginBottom: 32,
  },
  feature: {
    fontSize: 16,
    color: "#495057",
    marginBottom: 12,
    textAlign: "center",
  },
  primaryButton: {
    backgroundColor: "#6200ee",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 16,
    minWidth: 200,
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  devNote: {
    fontSize: 12,
    color: "#888",
    fontStyle: "italic",
    textAlign: "center",
    marginBottom: 16,
  },
  disclaimer: {
    fontSize: 12,
    color: "#6c757d",
    textAlign: "center",
    marginTop: 16,
  },
  loader: {
    marginVertical: 24,
  },
  errorText: {
    color: "#dc3545",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#f8d7da",
    borderRadius: 4,
  },
  userInfo: {
    alignItems: "center",
    marginBottom: 24,
  },
  userEmail: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 8,
  },
  signOutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  signOutText: {
    color: "#6200ee",
    fontSize: 12,
    textDecorationLine: "underline",
  },
  successInfo: {
    backgroundColor: "#d1ecf1",
    padding: 20,
    borderRadius: 8,
    marginBottom: 24,
    width: "100%",
    maxWidth: 400,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0c5460",
    marginBottom: 12,
  },
  infoItem: {
    fontSize: 14,
    color: "#0c5460",
    marginBottom: 8,
  },
  secondaryButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#6200ee",
    backgroundColor: "transparent",
  },
  secondaryButtonText: {
    color: "#6200ee",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  calendarInfo: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
    fontStyle: 'italic',
  },
});