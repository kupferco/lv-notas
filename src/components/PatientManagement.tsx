// src/components/PatientManagement.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { Patient } from '../types/index';

interface PatientManagementProps {
  therapistEmail: string;
  onComplete: () => void;
}

type FormMode = 'add' | 'edit' | null;

// Helper function to convert database date format (YYYY-MM-DD) to form format (DD/MM/YYYY)
const formatDateForForm = (dateInput: string | Date | null | undefined): string => {
  if (!dateInput) return '';

  try {
    let dateString: string;

    // If it's an ISO string (contains 'T'), parse it as a Date and extract components
    if (typeof dateInput === 'string' && dateInput.includes('T')) {
      const date = new Date(dateInput);
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${day}/${month}/${year}`;
    }

    // If it's a Date object, extract the date parts directly
    if (dateInput instanceof Date) {
      const year = dateInput.getFullYear();
      const month = (dateInput.getMonth() + 1).toString().padStart(2, '0');
      const day = dateInput.getDate().toString().padStart(2, '0');
      return `${day}/${month}/${year}`;
    } else {
      dateString = dateInput;
    }

    // If it's already in DD/MM/YYYY format, return as is
    if (dateString.includes('/')) return dateString;

    // Convert from YYYY-MM-DD to DD/MM/YYYY
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', dateInput, error);
    return '';
  }
};

// Helper function to convert form date format (DD/MM/YYYY) to database format (YYYY-MM-DD)
const formatDateForDB = (dateString: string): string => {
  if (!dateString) return '';

  try {
    // If it's already in YYYY-MM-DD format, return as is
    if (dateString.includes('-')) return dateString;

    // Convert from DD/MM/YYYY to YYYY-MM-DD
    const [day, month, year] = dateString.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  } catch (error) {
    console.error('Error formatting date for DB:', dateString, error);
    return '';
  }
};

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
  const [patientData, setPatientData] = useState<Patient>({
    nome: '',
    email: '',
    telefone: '',
    cpf: '',
    sessionPrice: 30000, // R$ 300,00 in cents
    therapyStartDate: '',
    lvNotasBillingStartDate: '',
    observacoes: '',
    // Address fields
    enderecoRua: '',
    enderecoNumero: '',
    enderecoBairro: '',
    enderecoCodigoMunicipio: '3550308', // São Paulo default
    enderecoUf: 'SP', // São Paulo default
    enderecoCep: '',
    // Personal info fields
    dataNascimento: '',
    genero: '',
    contatoEmergenciaNome: '',
    contatoEmergenciaTelefone: ''
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

  // Formatting functions
  const formatCurrency = (value: string): string => {
    // Remove everything except digits and comma
    const cleaned = value.replace(/[^\d,]/g, '');

    // Split by comma
    const parts = cleaned.split(',');

    // If no comma, just return the digits
    if (parts.length === 1) {
      return parts[0];
    }

    // If there's a comma, ensure only 2 decimal places
    if (parts.length === 2) {
      return parts[0] + ',' + parts[1].slice(0, 2);
    }

    // If multiple commas, keep only the first one
    return parts[0] + ',' + parts.slice(1).join('').slice(0, 2);
  };

  const formatPhone = (value: string): string => {
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, '');

    // Apply Brazilian phone formatting
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  // CPF formatting function
  const formatCpf = (value: string): string => {
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, '');

    // Apply Brazilian CPF formatting: XXX.XXX.XXX-XX
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  };

  // CEP formatting function
  const formatCep = (value: string): string => {
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, '');

    // Apply Brazilian CEP formatting: XXXXX-XXX
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  // CPF validation function
  const validateCpf = (cpf: string): boolean => {
    if (!cpf) return true; // CPF is optional

    const cleanCpf = cpf.replace(/\D/g, '');
    
    // Must have exactly 11 digits
    if (cleanCpf.length !== 11) return false;
    
    // Check for common invalid CPFs (all same digits)
    if (/^(\d)\1{10}$/.test(cleanCpf)) return false;
    
    // Basic CPF algorithm validation
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCpf.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCpf.charAt(9))) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCpf.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCpf.charAt(10))) return false;

    return true;
  };

  // CEP validation function
  const validateCep = (cep: string): boolean => {
    if (!cep) return true; // CEP is optional
    const cleanCep = cep.replace(/\D/g, '');
    return cleanCep.length === 8;
  };

  const formatDate = (value: string): string => {
    // Remove non-numeric characters
    const numbers = value.replace(/\D/g, '');

    // Format as DD/MM/YYYY
    if (numbers.length <= 8) {
      return numbers.replace(/(\d{2})(\d{2})(\d{4})/, '$1/$2/$3');
    }

    return numbers.slice(0, 8).replace(/(\d{2})(\d{2})(\d{4})/, '$1/$2/$3');
  };

  const handleFieldChange = (field: keyof Patient, value: string | number) => {
    if (field === 'telefone' || field === 'contatoEmergenciaTelefone') {
      const formattedValue = formatPhone(value as string);
      setPatientData(prev => ({ ...prev, [field]: formattedValue }));
    } else if (field === 'cpf') {
      const formattedValue = formatCpf(value as string);
      setPatientData(prev => ({ ...prev, [field]: formattedValue }));
    } else if (field === 'enderecoCep') {
      const formattedValue = formatCep(value as string);
      setPatientData(prev => ({ ...prev, [field]: formattedValue }));
    } else if (field === 'dataNascimento') {
      const formattedValue = formatDate(value as string);
      setPatientData(prev => ({ ...prev, [field]: formattedValue }));
    } else if (field === 'sessionPrice') {
      // Handle sessionPrice as number in cents
      setPatientData(prev => ({ ...prev, [field]: value as number }));
    } else {
      setPatientData(prev => ({ ...prev, [field]: value as string }));
    }
  };

  const handleSavePatient = async () => {
    if (!patientData.nome?.trim() || !patientData.email?.trim()) {
      alert('Nome e email são obrigatórios');
      return;
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patientData.email)) {
      alert('Por favor, insira um email válido');
      return;
    }

    // Validate CPF if provided
    if (patientData.cpf?.trim() && !validateCpf(patientData.cpf)) {
      alert('CPF inválido. Verifique o número digitado.');
      return;
    }

    // Validate CEP if provided
    if (patientData.enderecoCep?.trim() && !validateCep(patientData.enderecoCep)) {
      alert('CEP inválido. Deve ter 8 dígitos.');
      return;
    }

    // Validate session price
    if ((patientData.sessionPrice || 0) < 1000) { // R$ 10,00 minimum
      alert('Valor mínimo da sessão é R$ 10,00');
      return;
    }

    // Validate LV Notas billing start date
    if (!patientData.lvNotasBillingStartDate?.trim()) {
      alert('Data de início da cobrança LV Notas é obrigatória');
      return;
    }

    setIsLoading(true);
    try {
      const patientPayload: Patient = {
        nome: patientData.nome.trim(),
        email: patientData.email.trim().toLowerCase(),
        telefone: patientData.telefone?.replace(/\D/g, '') || '', // Store only numbers
        cpf: patientData.cpf?.trim() || '', // Send formatted CPF
        sessionPrice: patientData.sessionPrice || 30000, // Already in cents
        therapyStartDate: patientData.therapyStartDate?.trim() || '',
        lvNotasBillingStartDate: patientData.lvNotasBillingStartDate?.trim() || '',
        observacoes: patientData.observacoes?.trim() || '',
        therapistEmail,
        // Address fields
        enderecoRua: patientData.enderecoRua?.trim() || '',
        enderecoNumero: patientData.enderecoNumero?.trim() || '',
        enderecoBairro: patientData.enderecoBairro?.trim() || '',
        enderecoCodigoMunicipio: patientData.enderecoCodigoMunicipio?.trim() || '3550308',
        enderecoUf: patientData.enderecoUf?.trim() || 'SP',
        enderecoCep: patientData.enderecoCep?.trim() || '',
        // Personal info fields
        dataNascimento: patientData.dataNascimento?.trim() || '',
        genero: patientData.genero?.trim() || '',
        contatoEmergenciaNome: patientData.contatoEmergenciaNome?.trim() || '',
        contatoEmergenciaTelefone: patientData.contatoEmergenciaTelefone?.replace(/\D/g, '') || ''
      };

      if (formMode === 'add') {
        console.log('Creating patient with data:', patientPayload);
        await apiService.createPatient(patientPayload);
      } else if (formMode === 'edit' && editingPatientId) {
        console.log('Updating patient:', editingPatientId);
        await apiService.updatePatient(editingPatientId, patientPayload);
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
        errorMessage = 'Dados inválidos. Verifique se todos os campos obrigatórios foram preenchidos.';
      } else if (error.message && error.message.includes('email already exists')) {
        errorMessage = 'Este email já está cadastrado para outro paciente.';
      } else if (error.message && error.message.includes('CPF já cadastrado')) {
        errorMessage = 'Este CPF já está cadastrado para outro paciente.';
      } else if (error.message && error.message.includes('CPF inválido')) {
        errorMessage = 'CPF inválido. Verifique o número digitado.';
      } else if (error.message && error.message.includes('CEP deve ter 8 dígitos')) {
        errorMessage = 'CEP inválido. Deve ter 8 dígitos.';
      }
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditPatient = (patient: Patient) => {
    console.log('Editing patient:', patient);

    setFormMode('edit');
    setEditingPatientId(patient.id || null);
    setPatientData({
      nome: patient.name || patient.nome || '',
      email: patient.email || '',
      telefone: patient.telefone || '',
      cpf: patient.cpf || '',
      sessionPrice: patient.sessionPrice || 30000, // Default R$ 300,00
      therapyStartDate: formatDateForForm(patient.therapyStartDate),
      lvNotasBillingStartDate: formatDateForForm(patient.lvNotasBillingStartDate),
      observacoes: patient.observacoes || '',
      // Address fields
      enderecoRua: patient.enderecoRua || '',
      enderecoNumero: patient.enderecoNumero || '',
      enderecoBairro: patient.enderecoBairro || '',
      enderecoCodigoMunicipio: patient.enderecoCodigoMunicipio || '3550308',
      enderecoUf: patient.enderecoUf || 'SP',
      enderecoCep: patient.enderecoCep || '',
      // Personal info fields
      dataNascimento: formatDateForForm(patient.dataNascimento) || '',
      genero: patient.genero || '',
      contatoEmergenciaNome: patient.contatoEmergenciaNome || '',
      contatoEmergenciaTelefone: patient.contatoEmergenciaTelefone || ''
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

  const resetForm = () => {
    setFormMode(null);
    setEditingPatientId(null);
    setPatientData({
      nome: '',
      email: '',
      telefone: '',
      cpf: '',
      sessionPrice: 30000,
      therapyStartDate: '',
      lvNotasBillingStartDate: '',
      observacoes: '',
      // Address fields
      enderecoRua: '',
      enderecoNumero: '',
      enderecoBairro: '',
      enderecoCodigoMunicipio: '3550308',
      enderecoUf: 'SP',
      enderecoCep: '',
      // Personal info fields
      dataNascimento: '',
      genero: '',
      contatoEmergenciaNome: '',
      contatoEmergenciaTelefone: ''
    });
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
        <Text style={styles.errorText}>Autenticação necessária</Text>
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

        {/* Personal Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados Pessoais</Text>

          <Text style={styles.fieldLabel}>Nome Completo *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: João da Silva"
            value={patientData.nome}
            onChangeText={(text) => handleFieldChange('nome', text)}
          />

          <Text style={styles.fieldLabel}>Email *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: joao@exemplo.com"
            value={patientData.email}
            onChangeText={(text) => handleFieldChange('email', text)}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.fieldLabel}>Telefone *</Text>
          <TextInput
            style={styles.input}
            placeholder="(11) 99999-9999"
            value={patientData.telefone}
            onChangeText={(text) => handleFieldChange('telefone', text)}
            keyboardType="phone-pad"
          />

          <Text style={styles.fieldLabel}>CPF (opcional)</Text>
          <TextInput
            style={[styles.input, !validateCpf(patientData.cpf || '') && (patientData.cpf?.length || 0) > 0 && styles.inputError]}
            placeholder="000.000.000-00"
            value={patientData.cpf}
            onChangeText={(text) => handleFieldChange('cpf', text)}
            keyboardType="numeric"
            maxLength={14} // XXX.XXX.XXX-XX
          />
          {(patientData.cpf?.length || 0) > 0 && !validateCpf(patientData.cpf || '') && (
            <Text style={styles.errorText}>CPF inválido</Text>
          )}

          <Text style={styles.fieldLabel}>Data de Nascimento</Text>
          <TextInput
            style={styles.input}
            placeholder="DD/MM/AAAA"
            value={patientData.dataNascimento}
            onChangeText={(text) => handleFieldChange('dataNascimento', text)}
            keyboardType="numeric"
          />

          <Text style={styles.fieldLabel}>Gênero</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Masculino, Feminino, Não-binário"
            value={patientData.genero}
            onChangeText={(text) => handleFieldChange('genero', text)}
          />
        </View>

        {/* Address Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Endereço</Text>

          <Text style={styles.fieldLabel}>Rua</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Rua das Flores"
            value={patientData.enderecoRua}
            onChangeText={(text) => handleFieldChange('enderecoRua', text)}
          />

          <Text style={styles.fieldLabel}>Número</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 123"
            value={patientData.enderecoNumero}
            onChangeText={(text) => handleFieldChange('enderecoNumero', text)}
          />

          <Text style={styles.fieldLabel}>Bairro</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Centro"
            value={patientData.enderecoBairro}
            onChangeText={(text) => handleFieldChange('enderecoBairro', text)}
          />

          <Text style={styles.fieldLabel}>CEP</Text>
          <TextInput
            style={[styles.input, !validateCep(patientData.enderecoCep || '') && (patientData.enderecoCep?.length || 0) > 0 && styles.inputError]}
            placeholder="00000-000"
            value={patientData.enderecoCep}
            onChangeText={(text) => handleFieldChange('enderecoCep', text)}
            keyboardType="numeric"
            maxLength={9} // XXXXX-XXX
          />
          {(patientData.enderecoCep?.length || 0) > 0 && !validateCep(patientData.enderecoCep || '') && (
            <Text style={styles.errorText}>CEP deve ter 8 dígitos</Text>
          )}

          <Text style={styles.fieldLabel}>Estado</Text>
          <TextInput
            style={styles.input}
            placeholder="SP"
            value={patientData.enderecoUf}
            onChangeText={(text) => handleFieldChange('enderecoUf', text)}
            maxLength={2}
          />
        </View>

        {/* Emergency Contact Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contato de Emergência</Text>

          <Text style={styles.fieldLabel}>Nome do Contato</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Maria da Silva (mãe)"
            value={patientData.contatoEmergenciaNome}
            onChangeText={(text) => handleFieldChange('contatoEmergenciaNome', text)}
          />

          <Text style={styles.fieldLabel}>Telefone de Emergência</Text>
          <TextInput
            style={styles.input}
            placeholder="(11) 99999-9999"
            value={patientData.contatoEmergenciaTelefone}
            onChangeText={(text) => handleFieldChange('contatoEmergenciaTelefone', text)}
            keyboardType="phone-pad"
          />
        </View>

        {/* Session Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalhes das Sessões</Text>

          <Text style={styles.fieldLabel}>Valor da Sessão *</Text>
          <View style={styles.priceInputContainer}>
            <Text style={styles.currencyPrefix}>R$</Text>
            <TextInput
              style={styles.priceInput}
              placeholder="300,00"
              value={patientData.sessionPrice ? (patientData.sessionPrice / 100).toFixed(2).replace('.', ',') : ''}
              onChangeText={(value) => {
                // Remove everything except digits and comma
                let cleaned = value.replace(/[^\d,]/g, '');

                // Split by comma to handle integer and decimal parts
                let parts = cleaned.split(',');

                // Limit integer part to 3 digits
                if (parts[0].length > 3) {
                  parts[0] = parts[0].slice(0, 3);
                }

                // If there's a decimal part, limit to 2 digits
                if (parts.length > 1) {
                  parts[1] = parts[1].slice(0, 2);
                  // Remove extra commas (keep only first one)
                  parts = [parts[0], parts[1]];
                }

                // Reconstruct the formatted value
                const formatted = parts.length > 1 ? parts[0] + ',' + parts[1] : parts[0];

                // Update sessionPrice in cents
                const priceInCents = formatted ? Math.round(parseFloat(formatted.replace(',', '.') || '0') * 100) : 0;
                handleFieldChange('sessionPrice', priceInCents);
              }}
              keyboardType="numeric"
            />
          </View>

          <Text style={styles.fieldLabel}>Início da Terapia (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="DD/MM/AAAA"
            value={patientData.therapyStartDate}
            onChangeText={(text) => handleFieldChange('therapyStartDate', text)}
            keyboardType="numeric"
          />
          <Text style={styles.helpText}>Quando o paciente começou a terapia com você</Text>

          <Text style={styles.fieldLabel}>Começar Cobrança LV Notas a Partir de *</Text>
          <TextInput
            style={styles.input}
            placeholder="DD/MM/AAAA"
            value={patientData.lvNotasBillingStartDate}
            onChangeText={(text) => handleFieldChange('lvNotasBillingStartDate', text)}
            keyboardType="numeric"
          />
          <Text style={styles.helpText}>O LV Notas começará a rastrear pagamentos a partir desta data</Text>
        </View>

        {/* Notes Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Observações</Text>

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Observações, notas especiais, objetivos terapêuticos..."
            value={patientData.observacoes}
            onChangeText={(text) => handleFieldChange('observacoes', text)}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.formButtons}>
          <Pressable
            style={[styles.primaryButton, (!patientData.nome?.trim() || !patientData.email?.trim() || !patientData.telefone?.trim() || (patientData.sessionPrice || 0) < 1000 || !patientData.lvNotasBillingStartDate?.trim() || ((patientData.cpf?.length || 0) > 0 && !validateCpf(patientData.cpf || '')) || ((patientData.enderecoCep?.length || 0) > 0 && !validateCep(patientData.enderecoCep || ''))) && styles.buttonDisabled]}
            onPress={handleSavePatient}
            disabled={!patientData.nome?.trim() || !patientData.email?.trim() || !patientData.telefone?.trim() || (patientData.sessionPrice || 0) < 1000 || !patientData.lvNotasBillingStartDate?.trim() || ((patientData.cpf?.length || 0) > 0 && !validateCpf(patientData.cpf || '')) || ((patientData.enderecoCep?.length || 0) > 0 && !validateCep(patientData.enderecoCep || '')) || isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Salvando...' : formMode === 'add' ? 'Adicionar Paciente' : 'Salvar Alterações'}
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

        <View style={styles.bottomSpacer} />
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
            <Text style={styles.emptyText}>Nenhum paciente cadastrado</Text>
            <Text style={styles.emptySubtext}>
              Adicione seu primeiro paciente usando o botão acima
            </Text>
          </View>
        ) : (
          <View style={styles.patientsList}>
            {patients.map((patient) => (
              <View key={patient.id} style={styles.patientCard}>
                <View style={styles.patientInfo}>
                  <Text style={styles.patientName}>{patient.name || patient.nome}</Text>
                  <Text style={styles.patientDetail}>Email: {patient.email || 'Não informado'}</Text>
                  <Text style={styles.patientDetail}>Telefone: {patient.telefone || 'Não informado'}</Text>
                  {patient.cpf && (
                    <Text style={styles.patientDetail}>CPF: {patient.cpf}</Text>
                  )}
                  {patient.enderecoRua && (
                    <Text style={styles.patientDetail}>Endereço: {patient.enderecoRua} {patient.enderecoNumero}, {patient.enderecoBairro}</Text>
                  )}
                  <Text style={styles.patientDetail}>
                    Cobrança LV Notas: {patient.lvNotasBillingStartDate
                      ? formatDateForForm(patient.lvNotasBillingStartDate)
                      : 'Não informado'}
                  </Text>
                  {patient.sessionPrice && (
                    <Text style={styles.patientDetail}>Sessão: R$ {(patient.sessionPrice / 100).toFixed(2).replace('.', ',')}</Text>
                  )}
                </View>

                <View style={styles.patientActions}>
                  <Pressable
                    style={styles.editButton}
                    onPress={() => handleEditPatient(patient)}
                    disabled={isLoading}
                  >
                    <Text style={styles.editButtonText}>Editar</Text>
                  </Pressable>

                  <Pressable
                    style={styles.deleteButton}
                    onPress={() => handleDeletePatient(patient.id || '', patient.name || patient.nome || '')}
                    disabled={isLoading}
                  >
                    <Text style={styles.deleteButtonText}>Excluir</Text>
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

      <View style={styles.bottomSpacer} />
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

  // Section styles
  section: {
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#6200ee',
  },

  // Form field styles
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 8,
    backgroundColor: '#fff',
    color: '#212529',
  },
  inputError: {
    borderColor: '#dc3545',
    borderWidth: 2,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    paddingLeft: 16,
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    fontSize: 16,
    color: '#212529',
    paddingVertical: 16,
    paddingRight: 16,
  },
  helpText: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 12,
    color: '#dc3545',
    marginBottom: 8,
    fontWeight: '600',
  },

  // Action buttons at top
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  smallButton: {
    backgroundColor: '#6200ee',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    maxWidth: 250,
  },
  smallButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Patients section
  patientsSection: {
    paddingHorizontal: 20,
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

  // Form buttons
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  primaryButton: {
    backgroundColor: '#6200ee',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    maxWidth: 180,
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
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    maxWidth: 120,
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

  // Bottom spacing
  bottomSpacer: {
    height: 40,
  },
});