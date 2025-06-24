import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { signOutUser, getCurrentUser, isDevelopment } from "../config/firebase";
import { apiService } from "../services/api";
import type { Therapist } from "../types";
import type { User } from "firebase/auth";

interface SettingsProps {
  therapistEmail: string;
  onLogout: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ therapistEmail, onLogout }) => {
  const [therapist, setTherapist] = useState<Therapist | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    loadTherapistData();
    loadCurrentUser();
  }, [therapistEmail]);

  const loadTherapistData = async () => {
    try {
      const therapistData = await apiService.getTherapistByEmail(therapistEmail);
      setTherapist(therapistData);
    } catch (error) {
      console.error("Error loading therapist data:", error);
    } finally {
      setIsLoading(false);
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
    const confirmed = window.confirm("Tem certeza que deseja sair? Você precisará fazer login novamente.");
    
    if (confirmed) {
      console.log("✅ User confirmed logout");
      performSignOut();
    } else {
      console.log("❌ User cancelled logout");
    }
  };

  const performSignOut = async () => {
    console.log("🔄 Performing sign out...");
    setIsSigningOut(true);
    
    try {
      if (isDevelopment) {
        // For development, just clear localStorage
        localStorage.removeItem("therapist_email");
        console.log("✅ Development sign out completed - localStorage cleared");
      } else {
        // For production, use real Firebase sign out
        await signOutUser();
        console.log("✅ Firebase sign out completed");
      }
      
      // Call the parent logout handler
      console.log("🔄 Calling onLogout...");
      console.log("onLogout function:", onLogout);
      onLogout();
      console.log("✅ onLogout called successfully");
    } catch (error) {
      console.error("❌ Error signing out:", error);
      window.alert("Erro ao sair. Tente novamente.");
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleReconnectCalendar = () => {
    window.alert("Esta funcionalidade será implementada em breve. Por enquanto, você pode sair e fazer login novamente para reconfigurar seu calendário.");
  };

  const handleExportData = () => {
    window.alert("Esta funcionalidade será implementada em breve. Você poderá exportar seus dados de pacientes e sessões.");
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Carregando configurações...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Configurações</Text>

      {/* Account Information Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informações da Conta</Text>
        
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

      {/* Calendar Integration Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Integração do Calendário</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Status:</Text>
          <Text style={[styles.value, styles.statusConnected]}>
            {therapist?.googleCalendarId ? "✅ Conectado" : "❌ Não conectado"}
          </Text>
        </View>
        
        {therapist?.googleCalendarId && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Calendário ID:</Text>
            <Text style={styles.value} numberOfLines={1}>
              {therapist.googleCalendarId}
            </Text>
          </View>
        )}

        <Pressable
          style={styles.secondaryButton}
          onPress={handleReconnectCalendar}
        >
          <Text style={styles.secondaryButtonText}>
            Reconectar Calendário
          </Text>
        </Pressable>
      </View>

      {/* Data Management Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gerenciamento de Dados</Text>
        
        <Pressable
          style={styles.secondaryButton}
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

      {/* Account Actions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ações da Conta</Text>
        
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
        <Text style={styles.footerText}>LV Notas v1.0.0</Text>
        <Text style={styles.footerText}>Sistema de Gestão para Terapeutas</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    padding: 20,
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
    backgroundColor: "#ccc",
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
});
