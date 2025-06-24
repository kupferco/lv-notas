import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import type { Patient, Session } from '../types';

import { apiService } from '../services/api'
import { initializeFirebase } from '../config/firebase';

interface CheckInFormProps {
  therapistEmail: string | null;
}

export const CheckInForm: React.FC<CheckInFormProps> = ({ therapistEmail }) => {
  console.log('=== CheckInForm Debug ===');
  console.log('therapistEmail prop received:', therapistEmail);
  console.log('therapistEmail type:', typeof therapistEmail);
  console.log('therapistEmail length:', therapistEmail?.length);


  const [patients, setPatients] = useState<Patient[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await initializeFirebase();
        await loadPatients();
      } catch (error) {
        console.error('Error initializing:', error);
        setError('Erro ao carregar dados');
        setIsLoading(false);
      }
    };

    init();
  }, []);

  useEffect(() => {
    if (selectedPatient) {
      loadPatientSessions(selectedPatient);
    } else {
      setSessions([]);
    }
  }, [selectedPatient]);

  const loadPatients = async () => {
    try {
      if (!therapistEmail) {
        console.error('No therapist email available for loading patients');
        setIsLoading(false);
        return;
      }

      console.log('Loading patients for therapist:', therapistEmail);
      const data = await apiService.getPatients(therapistEmail); // Now TypeScript knows it's not null
      console.log('Patients loaded:', data);
      setPatients(data);
    } catch (error) {
      console.error('Error loading patients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPatientSessions = async (patientId: string) => {
    try {
      const data = await apiService.getPatientSessions(patientId);
      setSessions(data);
    } catch (error) {
      console.error('Error loading sessions:', error);
      setSessions([]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPatient || !selectedSession) return;

    setIsSubmitting(true);
    try {
      await apiService.submitCheckIn(selectedPatient, selectedSession);
      setSelectedPatient('');
      setSelectedSession('');
      alert('Presença confirmada com sucesso!');
    } catch (error) {
      console.error('Error submitting check-in:', error);
      alert('Erro ao confirmar presença. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddPatient = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/pacientes';
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Carregando informações...</Text>
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
  },
});