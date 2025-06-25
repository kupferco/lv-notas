// src/components/PatientManagement.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { Patient } from '../types';

interface PatientManagementProps {
  therapistEmail: string;
  onComplete: () => void;
}

type FormMode = 'add' | 'edit' | null;

export const PatientManagement: React.FC<PatientManagementProps> = ({
  therapistEmail,
  onComplete
}) => {
  console.log('PatientManagement received therapistEmail:', therapistEmail);
  
  const { isAuthenticated, hasValidTokens, isLoading: authLoading } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [patientData, setPatientData] = useState({
    nome: '',
    email: '',
    telefone: ''
  });

  // Load patients when component mounts and auth is ready
  useEffect(() => {
    if (!authLoading && isAuthenticated && hasValidTokens && therapistEmail) {
      loadPatients();
    }
  }, [authLoading, isAuthenticated, hasValidTokens, therapistEmail]);

  const loadPatients = async () => {
    setIsLoadingPatients(true);
    try {
      console.log('Loading patients for therapist:', therapistEmail);
      const data = await apiService.getPatients(therapistEmail);
      console.log('Patients loaded:', data);
      setPatients(data);
    } catch (error: any) {
      console.error('Error loading patients:', error);
      alert('Erro ao carregar pacientes. Tente novamente.');
    } finally {
      setIsLoadingPatients(false);
    }
  };

  const handleSavePatient = async () => {
    if (!patientData.nome.trim() || !patientData.email.trim()) {
      alert('Nome e email são obrigatórios');
      return;
    }

    setIsLoading(true);
    try {
      if (formMode === 'add') {
        console.log('Creating patient with data:', { ...patientData, therapistEmail });
        await apiService.createPatient({
          ...patientData,
          therapistEmail
        });
      } else if (formMode === 'edit' && editingPatientId) {
        console.log('Updating patient:', editingPatientId);
        console.log('Patient data being sent:', {
          nome: patientData.nome,
          email: patientData.email,
          telefone: patientData.telefone
        });
        
        await apiService.updatePatient(editingPatientId, {
          nome: patientData.nome,
          email: patientData.email,
          telefone: patientData.telefone
        });
      }

      // Reload patients list
      await loadPatients();
      resetForm();

    } catch (error: any) {
      console.error('Error saving patient:', error);
      
      let errorMessage = 'Erro ao salvar paciente. Tente novamente.';
      if (error.message && error.message.includes('404')) {
        errorMessage = 'Terapeuta não encontrado. Verifique se você está logado corretamente.';
      } else if (error.message && error.message.includes('400')) {
        errorMessage = 'Dados inválidos. Verifique se nome e email foram preenchidos.';
      }
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditPatient = (patient: Patient) => {
    console.log('Editing patient:', patient);
    setFormMode('edit');
    setEditingPatientId(patient.id);
    setPatientData({
      nome: patient.name,
      email: patient.email || '',
      telefone: patient.telefone || ''
    });
    console.log('Form data set to:', {
      nome: patient.name,
      email: patient.email || '',
      telefone: patient.telefone || ''
    });
  };

  const handleDeletePatient = async (patientId: string, patientName: string) => {
    const confirmed = window.confirm(`Tem certeza que deseja excluir o paciente "${patientName}"? Esta ação não pode ser desfeita.`);
    
    if (!confirmed) return;

    setIsLoading(true);
    try {
      console.log('Deleting patient:', patientId);
      await apiService.deletePatient(patientId);
      await loadPatients();
    } catch (error: any) {
      console.error('Error deleting patient:', error);
      let errorMessage = 'Erro ao excluir paciente. Tente novamente.';
      
      if (error.message && error.message.includes('Cannot delete patient with existing sessions')) {
        errorMessage = 'Este paciente possui sessões cadastradas e não pode ser excluído.';
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

  const resetForm = () => {
    setFormMode(null);
    setEditingPatientId(null);
    setPatientData({ nome: '', email: '', telefone: '' });
  };

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Verificando autenticação...</Text>
      </View>
    );
  }

  // Show auth error if not authenticated
  if (!isAuthenticated || !hasValidTokens) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>❌ Autenticação necessária</Text>
        <Text style={styles.helpText}>Por favor, faça login novamente</Text>
      </View>
    );
  }

  // Patient form (add/edit)
  if (formMode) {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}>
          {formMode === 'add' ? 'Adicionar Paciente' : 'Editar Paciente'}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Nome do paciente *"
          value={patientData.nome}
          onChangeText={(text) => setPatientData(prev => ({ ...prev, nome: text }))}
        />

        <TextInput
          style={styles.input}
          placeholder="Email *"
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

        <View style={styles.formButtons}>
          <Pressable
            style={[styles.primaryButton, (!patientData.nome.trim() || !patientData.email.trim()) && styles.buttonDisabled]}
            onPress={handleSavePatient}
            disabled={!patientData.nome.trim() || !patientData.email.trim() || isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Salvando...' : formMode === 'add' ? 'Adicionar' : 'Salvar'}
            </Text>
          </Pressable>

          <Pressable
            style={styles.cancelButton}
            onPress={resetForm}
            disabled={isLoading}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // Main patient list view
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Gerenciar Pacientes</Text>

      {/* Action buttons at the top */}
      <View style={styles.actionButtonsContainer}>
        <Pressable
          style={styles.smallButton}
          onPress={() => setFormMode('add')}
        >
          <Text style={styles.smallButtonText}>+ Adicionar Paciente</Text>
        </Pressable>

        <Pressable
          style={styles.smallButton}
          onPress={handleCalendarImport}
          disabled={isLoading}
        >
          <Text style={styles.smallButtonText}>📅 Importar do Calendário</Text>
        </Pressable>
      </View>

      {/* Patients list */}
      <View style={styles.patientsSection}>
        <Text style={styles.sectionTitle}>
          Seus Pacientes ({patients.length})
        </Text>

        {isLoadingPatients ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6200ee" />
            <Text style={styles.loadingText}>Carregando pacientes...</Text>
          </View>
        ) : patients.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>📋 Nenhum paciente cadastrado</Text>
            <Text style={styles.emptySubtext}>
              Adicione seu primeiro paciente usando os botões acima
            </Text>
          </View>
        ) : (
          <View style={styles.patientsList}>
            {patients.map((patient) => (
              <View key={patient.id} style={styles.patientCard}>
                <View style={styles.patientInfo}>
                  <Text style={styles.patientName}>{patient.name}</Text>
                  <Text style={styles.patientDetail}>📧 {patient.email || 'Email não informado'}</Text>
                  <Text style={styles.patientDetail}>📱 {patient.telefone || 'Telefone não informado'}</Text>
                </View>

                <View style={styles.patientActions}>
                  <Pressable
                    style={styles.editButton}
                    onPress={() => handleEditPatient(patient)}
                    disabled={isLoading}
                  >
                    <Text style={styles.editButtonText}>✏️ Editar</Text>
                  </Pressable>

                  <Pressable
                    style={styles.deleteButton}
                    onPress={() => handleDeletePatient(patient.id, patient.name)}
                    disabled={isLoading}
                  >
                    <Text style={styles.deleteButtonText}>🗑️ Excluir</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#6200ee" />
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 24,
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  
  // Action buttons at top
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 32,
    gap: 12,
  },
  smallButton: {
    backgroundColor: '#6200ee',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    maxWidth: 200,
  },
  smallButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Patients section
  patientsSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  
  // Patient list
  patientsList: {
    gap: 12,
  },
  patientCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  patientInfo: {
    flex: 1,
    marginRight: 12,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  patientDetail: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 2,
  },
  patientActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#28a745',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    minWidth: 70,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    minWidth: 70,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Empty state
  emptyContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 18,
    color: '#6c757d',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Form styles
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    marginHorizontal: 20,
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  primaryButton: {
    backgroundColor: '#6200ee',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    maxWidth: 150,
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
  cancelButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    maxWidth: 150,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Loading states
  loadingContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Error states
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