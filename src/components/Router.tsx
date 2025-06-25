// src/components/Router.tsx
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { NavigationBar } from "./NavigationBar";
import { CheckInForm } from "./CheckInForm";
import { PatientManagement } from "./PatientManagement";
import { TherapistOnboarding } from "./TherapistOnboarding";
import { Settings } from "./Settings";
import { apiService } from "../services/api";

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
        return <Dashboard therapistEmail={therapistEmail} navigateTo={navigateTo} />;
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

// Dashboard Component
interface DashboardProps {
  therapistEmail: string;
  navigateTo: (path: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ therapistEmail, navigateTo }) => {
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [showEvents, setShowEvents] = useState(false);

  const loadCalendarEvents = async () => {
    setIsLoadingEvents(true);
    setEventsError(null);
    try {
      console.log("Loading calendar events for therapist:", therapistEmail);

      // Use the proper API method that passes therapist email
      const events = await apiService.getCalendarEvents(therapistEmail);

      console.log("Calendar events loaded:", events);
      setCalendarEvents(events);
      setShowEvents(true);
    } catch (error: any) {
      console.error('Error loading calendar events:', error);
      setEventsError(error.message || 'Erro ao carregar eventos do calendário');
    } finally {
      setIsLoadingEvents(false);
    }
  };

  return (
    <View style={styles.dashboardContainer}>
      <Text style={styles.dashboardTitle}>Dashboard</Text>
      <Text style={styles.dashboardSubtitle}>
        Bem-vindo, {therapistEmail}! Aqui você pode gerenciar suas sessões e pacientes.
      </Text>

      {/* Calendar Events Section */}
      <View style={styles.calendarSection}>
        <Text style={styles.sectionTitle}>📅 Eventos do Calendário</Text>

        {!showEvents ? (
          <Pressable
            style={[styles.testButton, isLoadingEvents && styles.buttonDisabled]}
            onPress={loadCalendarEvents}
            disabled={isLoadingEvents}
          >
            <Text style={styles.testButtonText}>
              {isLoadingEvents ? 'Carregando...' : 'Ver Eventos do Google Calendar'}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.eventsContainer}>
            <View style={styles.eventsHeader}>
              <Text style={styles.eventsTitle}>Próximos Eventos</Text>
              <Pressable onPress={() => setShowEvents(false)} style={styles.hideButton}>
                <Text style={styles.hideButtonText}>Ocultar</Text>
              </Pressable>
            </View>

            {calendarEvents.length > 0 ? (
              <View style={styles.eventsList}>
                {calendarEvents.slice(0, 5).map((event, index) => (
                  <View key={index} style={styles.eventItem}>
                    <Text style={styles.eventTitle}>{event.summary || 'Sem título'}</Text>
                    <Text style={styles.eventTime}>
                      {event.start?.dateTime || event.start?.date || 'Sem data'}
                    </Text>
                    {event.attendees && event.attendees.length > 0 && (
                      <Text style={styles.eventAttendees}>
                        👥 {event.attendees.length} participante(s)
                      </Text>
                    )}
                    {event.status && (
                      <Text style={styles.eventStatus}>
                        Status: {event.status}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.noEventsText}>Nenhum evento encontrado</Text>
            )}

            <Pressable
              style={styles.refreshButton}
              onPress={loadCalendarEvents}
              disabled={isLoadingEvents}
            >
              <Text style={styles.refreshButtonText}>
                {isLoadingEvents ? 'Carregando...' : '🔄 Atualizar'}
              </Text>
            </Pressable>
          </View>
        )}

        {eventsError && (
          <Text style={styles.errorText}>❌ {eventsError}</Text>
        )}
      </View>

      {/* Quick Actions */}
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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    paddingHorizontal: 0, // Remove extra padding since App.tsx handles it
  },
  dashboardContainer: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f8f9fa",
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
  },
  dashboardTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#212529",
    marginBottom: 8,
    textAlign: "center",
  },
  dashboardSubtitle: {
    fontSize: 16,
    color: "#6c757d",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  calendarSection: {
    width: "100%",
    maxWidth: 700,
    marginBottom: 32,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
    alignSelf: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#212529",
    marginBottom: 16,
    textAlign: "center",
  },
  testButton: {
    backgroundColor: "#28a745",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  testButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  eventsContainer: {
    width: "100%",
  },
  eventsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  eventsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212529",
  },
  hideButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#6c757d",
    borderRadius: 6,
  },
  hideButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  eventsList: {
    width: "100%",
    marginBottom: 16,
  },
  eventItem: {
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#6200ee",
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212529",
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 4,
  },
  eventAttendees: {
    fontSize: 12,
    color: "#6200ee",
    marginBottom: 2,
  },
  eventStatus: {
    fontSize: 12,
    color: "#28a745",
    fontWeight: "500",
  },
  noEventsText: {
    textAlign: "center",
    color: "#6c757d",
    fontStyle: "italic",
    padding: 20,
  },
  refreshButton: {
    backgroundColor: "#6200ee",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
  },
  refreshButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  errorText: {
    color: "#dc3545",
    textAlign: "center",
    marginTop: 12,
    fontSize: 14,
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
  },
  quickActions: {
    width: "100%",
    maxWidth: 500,
    alignSelf: 'center',
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