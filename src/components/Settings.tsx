import React from 'react';
import { View, Text, Pressable, StyleSheet, SafeAreaView } from 'react-native';

interface SettingsProps {
  therapistEmail: string;
  onLogout: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ therapistEmail, onLogout }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Configurações</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conta</Text>
          <View style={styles.infoItem}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{therapistEmail}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Google Calendar</Text>
          <View style={styles.infoItem}>
            <Text style={styles.label}>Status:</Text>
            <Text style={[styles.value, styles.connected]}>✅ Conectado</Text>
          </View>
          <Pressable style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Reconectar Calendar</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados</Text>
          <Pressable style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Exportar Dados</Text>
          </Pressable>
        </View>

        <View style={styles.dangerSection}>
          <Pressable style={styles.dangerButton} onPress={onLogout}>
            <Text style={styles.dangerButtonText}>Sair da Conta</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 20,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 30,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 15,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    color: '#6c757d',
  },
  value: {
    fontSize: 16,
    color: '#212529',
    fontWeight: '500',
  },
  connected: {
    color: '#198754',
  },
  secondaryButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#6200ee',
    marginTop: 10,
  },
  secondaryButtonText: {
    color: '#6200ee',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  dangerSection: {
    marginTop: 40,
  },
  dangerButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 6,
  },
  dangerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});