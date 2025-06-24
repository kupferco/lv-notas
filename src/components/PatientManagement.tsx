import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { apiService } from '../services/api';

interface PatientManagementProps {
  therapistEmail: string;
  onComplete: () => void;
}

export const PatientManagement: React.FC<PatientManagementProps> = ({ 
  therapistEmail, 
  onComplete 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [patientData, setPatientData] = useState({
    nome: '',
    email: '',
    telefone: ''
  });

  const handleManualAdd = async () => {
    if (!patientData.nome.trim()) return;
    
    setIsLoading(true);
    try {
      await apiService.createPatient({
        ...patientData,
        therapistEmail
      });
      
      // Reset form
      setPatientData({ nome: '', email: '', telefone: '' });
      setShowManualForm(false);
      alert('Paciente adicionado com sucesso!');
    } catch (error) {
      console.error('Error creating patient:', error);
      alert('Erro ao adicionar paciente. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalendarImport = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement calendar import logic
      alert('Funcionalidade em desenvolvimento');
    } catch (error) {
      console.error('Error importing from calendar:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (showManualForm) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Adicionar Paciente</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Nome do paciente *"
          value={patientData.nome}
          onChangeText={(text) => setPatientData(prev => ({ ...prev, nome: text }))}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Email (opcional)"
          value={patientData.email}
          onChangeText={(text) => setPatientData(prev => ({ ...prev, email: text }))}
          keyboardType="email-address"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Telefone (opcional)"
          value={patientData.telefone}
          onChangeText={(text) => setPatientData(prev => ({ ...prev, telefone: text }))}
          keyboardType="phone-pad"
        />
        
        <Pressable 
          style={[styles.primaryButton, !patientData.nome.trim() && styles.buttonDisabled]}
          onPress={handleManualAdd}
          disabled={!patientData.nome.trim() || isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Adicionando...' : 'Adicionar Paciente'}
          </Text>
        </Pressable>
        
        <Pressable 
          style={styles.secondaryButton}
          onPress={() => setShowManualForm(false)}
        >
          <Text style={styles.secondaryButtonText}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gerenciar Pacientes</Text>
      <Text style={styles.subtitle}>
        Como você gostaria de adicionar seus pacientes?
      </Text>
      
      <View style={styles.optionsContainer}>
        <Pressable 
          style={styles.optionButton}
          onPress={handleCalendarImport}
          disabled={isLoading}
        >
          <Text style={styles.optionTitle}>📅 Importar do Calendário</Text>
          <Text style={styles.optionDescription}>
            Recomendado: Analisamos seus eventos recorrentes e sugerimos pacientes
          </Text>
        </Pressable>
        
        <Pressable 
          style={styles.optionButton}
          onPress={() => setShowManualForm(true)}
        >
          <Text style={styles.optionTitle}>✏️ Adicionar Manualmente</Text>
          <Text style={styles.optionDescription}>
            Digite os dados do paciente manualmente
          </Text>
        </Pressable>
      </View>
      
      <Pressable 
        style={styles.skipButton}
        onPress={onComplete}
      >
        <Text style={styles.skipButtonText}>Pular por agora</Text>
      </Pressable>
      
      {isLoading && (
        <ActivityIndicator size="large" color="#6200ee" style={styles.loader} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  optionsContainer: {
    marginBottom: 32,
  },
  optionButton: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  primaryButton: {
    backgroundColor: '#6200ee',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButton: {
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: '#6200ee',
    fontSize: 16,
    textAlign: 'center',
  },
  skipButton: {
    paddingVertical: 12,
  },
  skipButtonText: {
    color: '#6c757d',
    fontSize: 14,
    textAlign: 'center',
  },
  loader: {
    marginTop: 20,
  },
});
