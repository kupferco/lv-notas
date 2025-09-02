// src/components/Settings.tsx
import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Modal, ScrollView } from "react-native";
import { signOutUser, getCurrentUser, isDevelopment, onAuthStateChange } from "../config/firebase";
import { apiService, api } from "../services/api";
import { CalendarSelection } from "./CalendarSelection";
import type { Therapist } from "../types/index";
import type { User } from "firebase/auth";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { ToggleSwitch } from "./common/ToggleSwitch";
import { CalendarImportWizard } from "./onboarding/CalendarImportWizard";

interface SettingsProps {
  therapistEmail: string;
  onLogout: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ therapistEmail, onLogout }) => {
  const [therapist, setTherapist] = useState<Therapist | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showCalendarSelection, setShowCalendarSelection] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [calendars, setCalendars] = useState<any[]>([]);
  const [currentCalendarName, setCurrentCalendarName] = useState<string>("");
  const { signOut } = useAuth();
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [nfseConfigured, setNfseConfigured] = useState(false);

  // Get settings from context
  const {
    paymentMode,
    setPaymentMode,
    viewMode,
    setViewMode,
    autoCheckInMode,
    setAutoCheckInMode,
    getCurrentModeLabel,
    getCurrentViewLabel,
    loadSettingsFromAPI,
    saveSettingsToAPI
  } = useSettings();

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initialiseSettings = async () => {
      if (isDevelopment) {
        // Development mode - load immediately
        await loadCurrentUser();
        await loadTherapistData();
        // await checkNFSeStatus();
        await loadSettingsFromDatabase();
      } else {
        // Production mode - wait for authentication
        const currentUser = getCurrentUser();
        if (currentUser) {
          console.log("User already authenticated, loading data");
          await loadCurrentUser();
          await loadTherapistData();
          // await checkNFSeStatus();
          await loadSettingsFromDatabase();
        } else {
          console.log("Waiting for authentication...");
          // Listen for auth state changes
          unsubscribe = onAuthStateChange(async (user) => {
            if (user) {
              console.log("User authenticated, loading data");
              await loadCurrentUser();
              await loadTherapistData();
              await loadSettingsFromDatabase();
            } else {
              console.log("No authenticated user");
              setIsLoading(false);
            }
          });
        }
      }
    };

    initialiseSettings();

    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [therapistEmail]);

  useEffect(() => {
    if (therapist?.id) {
      checkNFSeStatus();
    }
  }, [therapist]);

  const checkNFSeStatus = async () => {
    try {
      if (!therapist?.id) {
        console.error("Cannot check NFS-e status: therapist ID is missing");
        setNfseConfigured(false);
        return;
      }

      const therapistId = therapist.id.toString();
      console.log("Checking NFS-e status for therapist ID:", therapistId);

      const response = await api.nfse.getCertificateStatus(therapistId);
      const isConfigured = !!(response?.hasValidCertificate &&
        response?.certificateInfo?.cnpj &&
        response?.status === 'active');
      setNfseConfigured(isConfigured);
    } catch (error) {
      console.error("Error checking NFS-e status:", error);
      setNfseConfigured(false);
    }
  };

  const loadTherapistData = async () => {
    console.log("🔄 loadTherapistData called");
    try {
      console.log("Loading therapist data for:", therapistEmail);
      console.log("Google access token available:", !!localStorage.getItem('google_access_token'));

      const therapistData = await apiService.getTherapistByEmail(therapistEmail);
      console.log("Therapist data loaded:", therapistData);
      console.log("Calendar ID:", therapistData?.googleCalendarId);
      console.log("Calendar ID type:", typeof therapistData?.googleCalendarId);
      console.log("Calendar ID empty check:", therapistData?.googleCalendarId === "");
      setTherapist(therapistData);

      // If therapist has a calendar, try to get its name
      if (therapistData?.googleCalendarId) {
        console.log("Loading calendar name for:", therapistData.googleCalendarId);
        await loadCalendarName(therapistData.googleCalendarId);
      }
    } catch (error: any) {
      console.error("Error loading therapist data:", error);
      console.error("Error message:", error.message);
      console.error("Error details:", error);

      // Check if it's an authentication error
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        console.log("Authentication error - token may have expired");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadCalendarName = async (calendarId: string) => {
    try {
      console.log("Loading calendar name for ID:", calendarId);
      // Load all calendars to find the name of the current one
      const allCalendars = await apiService.getCalendars();
      console.log("All calendars loaded:", allCalendars);

      const currentCalendar = allCalendars.find(cal => cal.id === calendarId);
      if (currentCalendar) {
        console.log("Found current calendar:", currentCalendar);
        setCurrentCalendarName(currentCalendar.summary || currentCalendar.id);
      } else {
        console.log("Calendar not found in list, using ID as name");
        setCurrentCalendarName(calendarId);
      }
      setCalendars(allCalendars);
    } catch (error: any) {
      console.error("Error loading calendar name:", error);
      console.error("Error message:", error.message);
      setCurrentCalendarName(calendarId);
    }
  };

  const loadCurrentUser = () => {
    if (isDevelopment) {
      // For development, create a mock user from localStorage
      const email = localStorage.getItem("therapist_email");
      if (email) {
        setCurrentUser({
          email,
          displayName: "Terapeuta Teste",
          uid: email
        } as User);
      }
    } else {
      // For production, get the real Firebase user
      const user = getCurrentUser();
      setCurrentUser(user);
    }
  };

  const handleSignOut = () => {
    console.log("🚪 Sign out button clicked");

    // Use browser confirm dialog instead of Alert.alert
    // const confirmed = window.confirm("Tem certeza que deseja sair? Você precisará fazer login novamente.");
    const confirmed = true;

    if (confirmed) {
      console.log("✅ User confirmed logout");
      performSignOut();
    } else {
      console.log("❌ User cancelled logout");
    }
  };

  const performSignOut = async () => {
    console.log("🔄 Performing sign out...");

    // DEBUG: Log what's in localStorage BEFORE sign out
    console.log("=== BEFORE SIGN OUT ===");
    console.log("google_access_token:", localStorage.getItem("google_access_token"));
    console.log("calendar_permission_granted:", localStorage.getItem("calendar_permission_granted"));
    console.log("All localStorage keys:", Object.keys(localStorage));

    setIsSigningOut(true);

    try {
      await signOut(); // This comes from useAuth()

      // DEBUG: Log what's in localStorage AFTER sign out
      console.log("=== AFTER SIGN OUT ===");
      console.log("google_access_token:", localStorage.getItem("google_access_token"));
      console.log("calendar_permission_granted:", localStorage.getItem("calendar_permission_granted"));
      console.log("All localStorage keys:", Object.keys(localStorage));

      console.log("✅ Sign out completed");

      // Navigate back to root domain
      console.log("🔄 Navigating to root domain...");
      window.location.href = '/';

      // Call onLogout as backup (in case navigation doesn't work)
      onLogout();
    } catch (error) {
      console.error("❌ Error signing out:", error);
      window.alert("Erro ao sair. Tente novamente.");
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleReconnectCalendar = () => {
    setShowWarningModal(true);
  };

  const confirmCalendarChange = () => {
    setShowWarningModal(false);
    setShowCalendarSelection(true);
  };

  const handleCalendarSelected = async (calendarId: string) => {
    try {
      console.log("Updating calendar to:", calendarId);
      console.log("Current therapist email:", therapistEmail);

      // Update the therapist's calendar in the database
      await apiService.updateTherapistCalendar(therapistEmail, calendarId);
      console.log("Calendar updated successfully in database");

      // Update local state
      if (therapist) {
        const updatedTherapist = { ...therapist, googleCalendarId: calendarId };
        setTherapist(updatedTherapist);
        console.log("Updated therapist state:", updatedTherapist);
      }

      // Update localStorage
      localStorage.setItem("therapist_calendar_id", calendarId);
      console.log("Updated localStorage with calendar ID");

      // Find and set the calendar name
      const selectedCalendar = calendars.find(cal => cal.id === calendarId);
      if (selectedCalendar) {
        setCurrentCalendarName(selectedCalendar.summary || selectedCalendar.id);
        console.log("Set calendar name to:", selectedCalendar.summary);
      }

      setShowCalendarSelection(false);

      window.alert("Calendário atualizado com sucesso!");
    } catch (error: any) {
      console.error("Error updating calendar:", error);
      console.error("Error message:", error.message);
      console.error("Error details:", error);
      window.alert("Erro ao atualizar calendário. Tente novamente.");
    }
  };

  const handleExportData = () => {
    window.alert("Esta funcionalidade será implementada em breve. Você poderá exportar seus dados de pacientes e sessões.");
  };

  const handleImportPatients = () => {
    window.alert("Esta funcionalidade ainda não foi implementada. Em breve você poderá importar pacientes e sessões automaticamente do seu Google Calendar.");
  };

  const handleImportComplete = () => {
    setShowImportWizard(false);
    window.alert("Importação de pacientes concluída com sucesso!");
  };

  const handleImportCancel = () => {
    setShowImportWizard(false);
  };

  // Add these new functions to your Settings.tsx component

  const loadSettingsFromDatabase = async () => {
    try {
      console.log("🔄 Loading settings from database...");
      await loadSettingsFromAPI(therapistEmail);
      console.log("✅ Settings loaded from database successfully");
    } catch (error: any) {
      console.error("❌ Error loading settings from database:", error);
      // Don't show error to user for settings - just use defaults
    }
  };


  const handlePaymentModeChange = async (newMode: 'simple' | 'advanced') => {
    console.log(`🔄 Changing payment mode: ${paymentMode} → ${newMode}`);
    setPaymentMode(newMode);

    try {
      await saveSettingsToAPI(therapistEmail, { payment_mode: newMode });
      // window.alert("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Error saving payment mode:", error);
      window.alert("Erro ao salvar configurações.");
    }
  };

  const handleViewModeChange = async (newMode: 'card' | 'list') => {
    console.log(`🔄 Changing view mode: ${viewMode} → ${newMode}`);
    setViewMode(newMode);

    try {
      await saveSettingsToAPI(therapistEmail, { view_mode: newMode });
      // window.alert("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Error saving view mode:", error);
      window.alert("Erro ao salvar configurações.");
    }
  };

  const handleAutoCheckInModeChange = async (newMode: boolean) => {
    console.log(`🔄 Changing auto check-in mode: ${autoCheckInMode} → ${newMode}`);
    setAutoCheckInMode(newMode);

    try {
      await saveSettingsToAPI(therapistEmail, { auto_check_in_mode: newMode.toString() });
      // window.alert("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Error saving auto check-in mode:", error);
      window.alert("Erro ao salvar configurações.");
    }
  };

  // Toggle options for the new settings
  const paymentModeOptions = [
    { label: 'Simples', value: 'simple' },
    { label: 'Avançado', value: 'advanced' }
  ];

  const viewModeOptions = [
    { label: 'Cartões', value: 'card', icon: '🃏' },
    { label: 'Lista', value: 'list', icon: '📋' }
  ];

  const checkInModeOptions = [
    { label: 'Manual', value: 'manual' },
    { label: 'Automático', value: 'automatic' }
  ];

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Carregando configurações...</Text>
      </View>
    );
  }

  if (showCalendarSelection) {
    return (
      <View style={styles.container}>
        <CalendarSelection
          onCalendarSelected={handleCalendarSelected}
          onBack={() => setShowCalendarSelection(false)}
        />
      </View>
    );
  }

  // Add this check after the existing calendar selection check
  if (showImportWizard) {
    return (
      <CalendarImportWizard
        therapistEmail={therapistEmail}
        calendarId={therapist?.googleCalendarId || ""}
        onComplete={handleImportComplete}
        onCancel={handleImportCancel}
        mode="settings"
      />
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>⚙️ Configurações</Text>

      {/* Account Information Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 Informações da Conta</Text>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Nome:</Text>
          <Text style={styles.value}>{therapist?.name || "Não informado"}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{currentUser?.email || therapistEmail}</Text>
        </View>

        {isDevelopment && (
          <View style={styles.devBadge}>
            <Text style={styles.devBadgeText}>Modo Desenvolvimento</Text>
          </View>
        )}
      </View>

      {/* LEGACY SETTINGS - COMMENTED OUT FOR FUTURE REFERENCE
      
      {/* NEW: App Preferences Section */}
      {/* <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎨 Preferências de Interface</Text>

        {/* Payment Mode Setting */}
      {/* <View style={styles.settingItem}>
          <View style={styles.settingHeader}>
            <Text style={styles.settingLabel}>Modo de Pagamento</Text>
            <Text style={styles.settingDescription}>
              Como você quer gerenciar os status de pagamento
            </Text>
          </View>
          <ToggleSwitch
            options={paymentModeOptions}
            selectedValue={paymentMode}
            onValueChange={(value: string) => handlePaymentModeChange(value as 'simple' | 'advanced')}
            style={styles.toggleSwitch}
          />
          <Text style={styles.settingExplanation}>
            {paymentMode === 'simple'
              ? '• Simples: Apenas "Pago" e "Pendente" (ideal para iniciantes)'
              : '• Avançado: 4 status granulares - "Não Cobrado", "Aguardando", "Pendente", "Pago"'
            }
          </Text>
        </View> */}

      {/* View Mode Setting */}
      {/* <View style={styles.settingItem}>
          <View style={styles.settingHeader}>
            <Text style={styles.settingLabel}>Tipo de Visualização</Text>
            <Text style={styles.settingDescription}>
              Como você prefere ver os dados
            </Text>
          </View>
          <ToggleSwitch
            options={viewModeOptions}
            selectedValue={viewMode}
            onValueChange={(value: string) => handleViewModeChange(value as 'card' | 'list')}
            style={styles.toggleSwitch}
          />
          <Text style={styles.settingExplanation}>
            {viewMode === 'card'
              ? '• Cartões: Visualização detalhada com botões de ação'
              : '• Lista: Visualização compacta para análise rápida'
            }
          </Text>
        </View>
      </View> */}

      {/* NEW: Workflow Automation Section */}
      {/* <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ Automação de Workflow</Text>

        {/* Auto Check-in Setting */}
      {/* <View style={styles.settingItem}>
          <View style={styles.settingHeader}>
            <Text style={styles.settingLabel}>Check-in de Sessões</Text>
            <Text style={styles.settingDescription}>
              Como confirmar a presença dos pacientes
            </Text>
          </View>
          <ToggleSwitch
            options={checkInModeOptions}
            selectedValue={autoCheckInMode ? 'automatic' : 'manual'}
            onValueChange={(value: string) => handleAutoCheckInModeChange(value === 'automatic')}
            style={styles.toggleSwitch}
          />
          <Text style={styles.settingExplanation}>
            {autoCheckInMode
              ? '• Automático: Sessões passadas são automaticamente consideradas como "compareceu" para cobrança. Exclua a sessão se o paciente faltou.'
              : '• Manual: Você precisa marcar manualmente quando o paciente comparecer à sessão.'
            }
          </Text>
        </View>
      </View> */}

      {/* ALSO COMMENT OUT THE CURRENT SETTINGS SUMMARY */}
      {/* <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Configuração Atual</Text>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>
            Modo de Pagamento: <Text style={styles.summaryValue}>{getCurrentModeLabel()}</Text>
          </Text>
          <Text style={styles.summaryText}>
            Visualização: <Text style={styles.summaryValue}>{getCurrentViewLabel()}</Text>
          </Text>
          <Text style={styles.summaryText}>
            Check-in: <Text style={styles.summaryValue}>{autoCheckInMode ? 'Automático' : 'Manual'}</Text>
          </Text>
        </View>
      </View> */}

      {/*END LEGACY SETTINGS */}

      {/* Calendar Integration Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📅 Integração do Calendário</Text>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Status:</Text>
          <Text style={[styles.value, (therapist?.googleCalendarId && therapist.googleCalendarId !== "") ? styles.statusConnected : styles.statusDisconnected]}>
            {(therapist?.googleCalendarId && therapist.googleCalendarId !== "") ? "✅ Conectado" : "❌ Não conectado"}
          </Text>
        </View>

        {(therapist?.googleCalendarId && therapist.googleCalendarId !== "") && (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Calendário:</Text>
              <Text style={styles.value} numberOfLines={2}>
                {currentCalendarName || "Carregando..."}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>ID:</Text>
              <Text style={[styles.value, styles.calendarId]} numberOfLines={1}>
                {therapist.googleCalendarId}
              </Text>
            </View>
          </>
        )}

        <Pressable
          style={styles.secondaryButton}
          onPress={handleReconnectCalendar}
        >
          <Text style={styles.secondaryButtonText}>
            📅 {(therapist?.googleCalendarId && therapist.googleCalendarId !== "") ? "Alterar Calendário" : "Conectar Calendário"}
          </Text>
        </Pressable>
      </View>

      {/* Data Management Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Gerenciamento de Dados</Text>

        {/* Import Patients Button */}
        <Pressable
          style={[
            styles.secondaryButton,
            (!therapist?.googleCalendarId || therapist.googleCalendarId === "") && styles.buttonDisabled
          ]}
          onPress={handleImportPatients}
          disabled={!therapist?.googleCalendarId || therapist.googleCalendarId === ""}
        >
          <Text style={styles.secondaryButtonText}>
            📅 Importar Pacientes do Calendário
          </Text>
        </Pressable>

        <Text style={styles.helpText}>
          Importe pacientes e sessões automaticamente do seu Google Calendar.
          {(!therapist?.googleCalendarId || therapist.googleCalendarId === "") &&
            " (Conecte um calendário primeiro)"
          }
        </Text>

        {/* Export Data Button */}
        <Pressable
          style={[styles.secondaryButton, { marginTop: 15 }]}
          onPress={handleExportData}
        >
          <Text style={styles.secondaryButtonText}>
            📄 Exportar Dados
          </Text>
        </Pressable>

        <Text style={styles.helpText}>
          Exporte seus dados de pacientes e sessões para backup ou análise.
        </Text>
      </View>

      {/* Banking Integration Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💳 Integração Bancária</Text>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Status:</Text>
          <Text style={[styles.value, styles.statusDisconnected]}>
            ❌ Não configurado
          </Text>
        </View>

        <Text style={styles.helpText}>
          Conecte suas contas bancárias para receber notificações automáticas de pagamentos PIX e TED.
          Identifique automaticamente pagamentos de pacientes e agilize seu controle financeiro.
        </Text>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => {
            window.location.href = '/banking';
          }}
        >
          <Text style={styles.secondaryButtonText}>
            💳 Configurar Integração Bancária
          </Text>
        </Pressable>

        {/* Development/Testing Button - Remove in production */}
        {isDevelopment && (
          <>
            <Pressable
              style={[styles.secondaryButton, { marginTop: 10, borderColor: '#17a2b8' }]}
              onPress={() => {
                window.location.href = '/banking-test';
              }}
            >
              <Text style={[styles.secondaryButtonText, { color: '#17a2b8' }]}>
                🔧 Tela de Testes Banking
              </Text>
            </Pressable>
            <Text style={[styles.helpText, { color: '#17a2b8', fontSize: 11 }]}>
              Apenas em desenvolvimento - Para testes da integração Pluggy
            </Text>
          </>
        )}
      </View>

      {/* NFS-e Integration Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧾 NFS-e (Nota Fiscal Eletrônica)</Text>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Status:</Text>
          <Text style={[styles.value, nfseConfigured ? styles.statusConnected : styles.statusDisconnected]}>
            {nfseConfigured ? "✅ Configurado" : "❌ Não configurado"}
          </Text>
        </View>

        <Text style={styles.helpText}>
          Configure a emissão automática de notas fiscais para suas sessões de terapia.
          Integração com Focus NFE para emissão simplificada de NFS-e (Nota Fiscal Paulista).
        </Text>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => {
            window.location.href = '/nfse';
          }}
        >
          <Text style={styles.secondaryButtonText}>
            🧾 Configurar NFS-e
          </Text>
        </Pressable>

        {/* Development/Testing Button - Remove in production */}
        {isDevelopment && (
          <>
            <Pressable
              style={[styles.secondaryButton, { marginTop: 10, borderColor: '#ff9800' }]}
              onPress={() => {
                window.location.href = '/nfse-test';
              }}
            >
              <Text style={[styles.secondaryButtonText, { color: '#ff9800' }]}>
                🔧 Tela de Testes NFS-e
              </Text>
            </Pressable>
            <Text style={[styles.helpText, { color: '#ff9800', fontSize: 11 }]}>
              Apenas em desenvolvimento - Para testes da integração
            </Text>
          </>
        )}
      </View>

      {/* NEW: Current Settings Summary */}
      {/* <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Configuração Atual</Text>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>
            Modo de Pagamento: <Text style={styles.summaryValue}>{getCurrentModeLabel()}</Text>
          </Text>
          <Text style={styles.summaryText}>
            Visualização: <Text style={styles.summaryValue}>{getCurrentViewLabel()}</Text>
          </Text>
          <Text style={styles.summaryText}>
            Check-in: <Text style={styles.summaryValue}>{autoCheckInMode ? 'Automático' : 'Manual'}</Text>
          </Text>
        </View>
      </View> */}


      {/* Account Actions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔐 Ações da Conta</Text>

        <Pressable
          style={[styles.dangerButton, isSigningOut && styles.buttonDisabled]}
          onPress={handleSignOut}
          disabled={isSigningOut}
        >
          <Text style={styles.dangerButtonText}>
            {isSigningOut ? "Saindo..." : "🚪 Sair da Conta"}
          </Text>
        </Pressable>

        <Text style={styles.helpText}>
          Ao sair, você precisará fazer login novamente para acessar seus dados.
        </Text>
      </View>

      {/* App Information */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>LV Notas v1.0.4</Text>
        <Text style={styles.footerText}>Sistema de Gestão para Terapeutas</Text>
      </View>

      {/* Warning Modal */}
      <Modal
        visible={showWarningModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowWarningModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⚠️ Atenção</Text>
            <Text style={styles.modalText}>
              Alterar o calendário irá desconectar o calendário atual e reconectar com o novo calendário selecionado.
              {"\n\n"}
              As sessões existentes serão religadas baseadas nos compromissos encontrados no novo calendário.
              {"\n\n"}
              Compromissos que não existem no novo calendário podem ser perdidos.
              {"\n\n"}
              Deseja continuar?
            </Text>

            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalButtonCancel}
                onPress={() => setShowWarningModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={styles.modalButtonConfirm}
                onPress={confirmCalendarChange}
              >
                <Text style={styles.modalButtonConfirmText}>Continuar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f8f9fa",
    padding: 20,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#212529",
    marginBottom: 30,
    textAlign: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#6c757d",
    textAlign: "center",
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#212529",
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    flexWrap: "wrap",
  },
  label: {
    fontSize: 14,
    color: "#6c757d",
    fontWeight: "500",
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: "#212529",
    flex: 2,
    textAlign: "right",
  },
  statusConnected: {
    color: "#28a745",
    fontWeight: "600",
  },
  statusDisconnected: {
    color: "#dc3545",
    fontWeight: "600",
  },
  calendarId: {
    fontSize: 12,
    color: "#6c757d",
    fontFamily: "monospace",
  },
  devBadge: {
    backgroundColor: "#fff3cd",
    padding: 8,
    borderRadius: 6,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#ffeaa7",
  },
  devBadgeText: {
    color: "#856404",
    fontSize: 12,
    textAlign: "center",
    fontWeight: "600",
  },
  // NEW STYLES for settings items
  settingItem: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingHeader: {
    marginBottom: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#6c757d',
    marginBottom: 8,
  },
  toggleSwitch: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  settingExplanation: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  summaryCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  summaryText: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 6,
  },
  summaryValue: {
    fontWeight: '600',
    color: '#212529',
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#6200ee",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  secondaryButtonText: {
    color: "#6200ee",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  dangerButton: {
    backgroundColor: "#dc3545",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: "#f8f9fa",
    borderColor: "#dee2e6",
  },
  dangerButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  helpText: {
    fontSize: 12,
    color: "#6c757d",
    marginTop: 8,
    lineHeight: 16,
  },
  footer: {
    alignItems: "center",
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
  },
  footerText: {
    fontSize: 12,
    color: "#6c757d",
    marginBottom: 4,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#212529",
    marginBottom: 16,
    textAlign: "center",
  },
  modalText: {
    fontSize: 16,
    color: "#495057",
    lineHeight: 24,
    marginBottom: 24,
    textAlign: "center",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    backgroundColor: "#6c757d",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalButtonCancelText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  modalButtonConfirm: {
    flex: 1,
    backgroundColor: "#dc3545",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalButtonConfirmText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});