import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import type { Patient, Session } from '../types';
import { apiService } from '../services/api';

interface CheckInFormProps {
  therapistEmail: string | null;
}

export const CheckInForm: React.FC<CheckInFormProps> = ({ therapistEmail }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (therapistEmail) {
      loadPatients();
    }
  }, [therapistEmail]);

  useEffect(() => {
    if (selectedPatient) {
      loadPatientSessions(selectedPatient);
    } else {
      setSessions([]);
    }
  }, [selectedPatient]);

  const loadPatients = async () => {
    try {
      console.log('Loading patients for therapist:', therapistEmail);
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

  if (!therapistEmail) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text>Loading therapist information...</Text>
      </SafeAreaView>
    );
  }

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
        <Text style={styles.therapistInfo}>Therapist: {therapistEmail}</Text>
        
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
  therapistInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
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
});