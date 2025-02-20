import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import type { Patient, Session } from '../types';
import { apiService } from '../services/api'
import { initializeFirebase } from '../config/firebase';
import { testConnection } from '../utils/test-connection';

export const CheckInForm = () => {
  // URL parsing function
  const getPatientIdFromUrl = (): string | null => {
    try {
      // For web environments
      if (typeof window !== 'undefined' && window.location) {
        const params = new URLSearchParams(window.location.search);
        return params.get('paciente');
      }
      // For React Native, it might need to use a different approach
      return null;
    } catch (error) {
      console.error('Error parsing URL:', error);
      return null;
    }
  };

  const [patients, setPatients] = useState<Patient[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [testResult, setTestResult] = useState<string>('');

  useEffect(() => {
    const init = async () => {
      try {
        await initializeFirebase();
        await loadPatients();

        // Check for patient ID in URL
        const patientId = getPatientIdFromUrl();
        console.log('Patient ID from URL:', patientId);
        
        if (patientId) {
          setSelectedPatient(patientId);
        }
      } catch (error) {
        console.error('Error initializing:', error);
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
      console.log('Starting to load patients...');
      const data = await apiService.getPatients();
      console.log('Patients loaded:', data);
      setPatients(data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading patients:', error);
      setIsLoading(false);
    }
  };

  const loadPatientSessions = async (patientId: string) => {
    try {
      const data = await apiService.getPatientSessions(patientId);
      setSessions(data);
    } catch (error) {
      console.error('Error loading sessions:', error);
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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.label}>Paciente</Text>
        <Picker
          selectedValue={selectedPatient}
          onValueChange={(value) => setSelectedPatient(value)}>
          <Picker.Item label="Selecione o paciente" value="" />
          {patients.map(patient => (
            <Picker.Item key={patient.id} label={patient.name} value={patient.id} />
          ))}
        </Picker>
        <br />
        <br />
        <Text style={styles.label}>Sessão</Text>
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
        <br />
        <br />
        <Pressable
          style={[styles.button, (!selectedPatient || !selectedSession) && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={!selectedPatient || !selectedSession || isSubmitting}>
          <Text style={styles.buttonText}>
            {isSubmitting ? 'Enviando...' : 'Confirmar Presença'}
          </Text>
        </Pressable>


        <Pressable
          style={[styles.button, styles.testButton]}
          onPress={async () => {
            try {
              const result = await testConnection();
              setTestResult(
                `Test ${result.success ? 'successful' : 'failed'}\n` +
                `Environment: ${result.environment}\n` +
                `${result.success ? `Patients found: ${result.patientsCount}` : `Error: ${result.error}`}`
              );
            } catch (error) {
              setTestResult(`Test failed: ${error.message}`);
            }
          }}>
          <Text style={styles.buttonText}>Test Connection</Text>
        </Pressable>
        {testResult ? (
          <Text style={styles.testResult}>{testResult}</Text>
        ) : null}


      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  formContainer: {
    padding: 20,
    width: '100%',
    maxWidth: 400,
    marginTop: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#6200ee',
    padding: 15,
    borderRadius: 5,
    marginTop: 20,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },


  testButton: {
    backgroundColor: '#2196F3',  // Different color to distinguish from main button
  },
  testResult: {
    marginTop: 10,
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#f0f0f0',
    color: '#333',
  }

});