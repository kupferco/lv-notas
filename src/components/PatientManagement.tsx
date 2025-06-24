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
  console.log('PatientManagement received therapistEmail:', therapistEmail);
  
  const [isLoading, setIsLoading] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [addedPatients, setAddedPatients] = useState<string[]>([]);
  const [patientData, setPatientData] = useState({
    nome: '',
    email: '',
    telefone: ''
  });

  const handleManualAdd = async () => {
    if (!patientData.nome.trim()) return;

    setIsLoading(true);
    try {
      console.log('Creating patient with data:', { ...patientData, therapistEmail });
      await apiService.createPatient({
        ...patientData,
        therapistEmail
      });

      // Add to list of added patients
      setAddedPatients(prev => [...prev, patientData.nome]);

      // Reset form
      setPatientData({ nome: '', email: '', telefone: '' });
      setShowManualForm(false);

    } catch (error: any) {
      console.error('Error creating patient:', error);
      console.error('Full error object:', JSON.stringify(error, null, 2));

      // Try to get more specific error message from the response
      let errorMessage = 'Erro ao adicionar paciente. Tente novamente.';

      if (error.message && error.message.includes('404')) {
        errorMessage = 'Terapeuta não encontrado. Verifique se você está logado corretamente.';
      } else if (error.message && error.message.includes('400')) {
        errorMessage = 'Dados inválidos. Verifique se o nome foi preenchido.';
      }

      alert(errorMessage);
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

      {addedPatients.length > 0 && (
        <View style={styles.successContainer}>
          <Text style={styles.successTitle}>✅ Pacientes Adicionados:</Text>
          {addedPatients.map((name, index) => (
            <Text key={index} style={styles.patientName}>• {name}</Text>
          ))}
        </View>
      )}

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

      <View style={styles.actionButtons}>
        {addedPatients.length > 0 && (
          <Text style={styles.navigationHint}>
            {addedPatients.length} paciente(s) adicionado(s)!
          </Text>
        )}
      </View>

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
  successContainer: {
    backgroundColor: '#d1ecf1',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0c5460',
    marginBottom: 8,
  },
  patientName: {
    fontSize: 14,
    color: '#0c5460',
    marginBottom: 4,
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
  actionButtons: {
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#6200ee',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 16,
    minWidth: 200,
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
  loader: {
    marginTop: 20,
  },
  navigationHint: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  },
});