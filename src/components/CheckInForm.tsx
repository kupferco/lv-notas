// src/components/CheckInForm.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import type { Patient, Session } from '../types';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface CheckInFormProps {
  therapistEmail: string | null;
}

export const CheckInForm: React.FC<CheckInFormProps> = ({ therapistEmail }) => {
  console.log('=== CheckInForm Debug ===');
  console.log('therapistEmail prop received:', therapistEmail);
  console.log('therapistEmail type:', typeof therapistEmail);
  console.log('therapistEmail length:', therapistEmail?.length);

  const { isAuthenticated, hasValidTokens, isLoading: authLoading } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔍 CheckInForm useEffect - Auth state:', {
      isAuthenticated,
      hasValidTokens,
      authLoading,
      therapistEmail
    });

    // Wait for auth to be ready before loading patients
    if (!authLoading && isAuthenticated && hasValidTokens && therapistEmail) {
      console.log('✅ Auth ready, loading patients...');
      loadPatients();
    } else if (!authLoading && (!isAuthenticated || !hasValidTokens)) {
      console.log('❌ Auth not ready');
      setError('Autenticação necessária');
      setIsLoading(false);
    } else if (!authLoading && !therapistEmail) {
      console.log('❌ No therapist email');
      setError('Email do terapeuta não encontrado');
      setIsLoading(false);
    }
  }, [isAuthenticated, hasValidTokens, authLoading, therapistEmail]);

  useEffect(() => {
    if (selectedPatient) {
      loadPatientSessions(selectedPatient);
    } else {
      setSessions([]);
    }
  }, [selectedPatient]);

  const loadPatients = async () => {
    if (!therapistEmail) {
      console.error('No therapist email available for loading patients');
      setError('Email do terapeuta não disponível');
      setIsLoading(false);
      return;
    }

    try {
      console.log('📞 Loading patients for therapist:', therapistEmail);
      setError(null);
      
      const data = await apiService.getPatients(therapistEmail);
      console.log('✅ Patients loaded:', data);
      
      if (data.length === 0) {
        setError('Nenhum paciente encontrado');
      }
      
      setPatients(data);
    } catch (error: any) {
      console.error('❌ Error loading patients:', error);
      setError(`Erro ao carregar pacientes: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPatientSessions = async (patientId: string) => {
    try {
      console.log('📞 Loading sessions for patient:', patientId);
      const data = await apiService.getPatientSessions(patientId);
      console.log('✅ Sessions loaded:', data);
      setSessions(data);
    } catch (error: any) {
      console.error('❌ Error loading sessions:', error);
      setSessions([]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPatient || !selectedSession) return;

    setIsSubmitting(true);
    try {
      console.log('📞 Submitting check-in:', { selectedPatient, selectedSession });
      await apiService.submitCheckIn(selectedPatient, selectedSession);
      setSelectedPatient('');
      setSelectedSession('');
      alert('Presença confirmada com sucesso!');
    } catch (error: any) {
      console.error('❌ Error submitting check-in:', error);
      alert(`Erro ao confirmar presença: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddPatient = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/pacientes';
    }
  };

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Verificando autenticação...</Text>
      </SafeAreaView>
    );
  }

  // Show auth error if not authenticated
  if (!isAuthenticated || !hasValidTokens) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorText}>❌ Autenticação necessária</Text>
        <Text style={styles.helpText}>Por favor, faça login novamente</Text>
      </SafeAreaView>
    );
  }

  // Show loading while patients are being loaded
  if (isLoading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Carregando pacientes...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.therapistInfo}>
          Terapeuta: {therapistEmail?.split('@')[0] || 'Não identificado'}
        </Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.label}>Paciente</Text>

        {error && patients.length === 0 ? (
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>⚠️ {error}</Text>
            <Pressable style={styles.addPatientButton} onPress={handleAddPatient}>
              <Text style={styles.addPatientButtonText}>Adicionar Primeiro Paciente</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedPatient}
                onValueChange={(value) => setSelectedPatient(value)}>
                <Picker.Item label="Selecione o paciente" value="" />
                {patients.map(patient => (
                  <Picker.Item key={patient.id} label={patient.name} value={patient.id} />
                ))}
              </Picker>
            </View>

            <Pressable style={styles.linkButton} onPress={handleAddPatient}>
              <Text style={styles.linkButtonText}>+ Adicionar Novo Paciente</Text>
            </Pressable>
          </>
        )}

        <Text style={styles.label}>Sessão</Text>

        {selectedPatient && sessions.length === 0 ? (
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>ℹ️ Nenhuma sessão encontrada para este paciente</Text>
          </View>
        ) : (
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedSession}
              enabled={!!selectedPatient}
              onValueChange={(value) => setSelectedSession(value)}>
              <Picker.Item label="Selecione a sessão" value="" />
              {sessions.map(session => (
                <Picker.Item
                  key={session.id}
                  label={session.date}
                  value={session.id}
                />
              ))}
            </Picker>
          </View>
        )}

        <Pressable
          style={[styles.button, (!selectedPatient || !selectedSession) && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={!selectedPatient || !selectedSession || isSubmitting}>
          <Text style={styles.buttonText}>
            {isSubmitting ? 'Confirmando...' : 'Confirmar Presença'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  header: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  therapistInfo: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
  formContainer: {
    padding: 20,
    flex: 1,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    marginTop: 16,
    fontWeight: '600',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  warningContainer: {
    backgroundColor: '#fff3cd',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    marginBottom: 12,
  },
  addPatientButton: {
    backgroundColor: '#6200ee',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
  },
  addPatientButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  linkButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  linkButtonText: {
    color: '#6200ee',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  button: {
    backgroundColor: '#6200ee',
    padding: 15,
    borderRadius: 8,
    marginTop: 32,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
});