// src/components/nfse/NFSeConfigurationScreen.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import { api } from '../../services/api';

interface CertificateStatus {
  hasValidCertificate: boolean;
  status: 'not_uploaded' | 'active' | 'expired' | 'invalid';
  expiresAt?: string;
  expiresIn30Days?: boolean;
  certificateInfo?: {
    commonName: string;
    issuer: string;
  };
}

interface NFSeSettings {
  serviceCode: string;
  taxRate: number;
  defaultServiceDescription: string;
  issWithholding: boolean;
  additionalInfo?: string;
}

interface SetupStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  action?: () => void;
}

export const NFSeConfigurationScreen: React.FC = () => {
  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [certificateStatus, setCertificateStatus] = useState<CertificateStatus | null>(null);
  const [nfseSettings, setNFSeSettings] = useState<NFSeSettings>({
    serviceCode: '14.01',
    taxRate: 5,
    defaultServiceDescription: 'Serviços de Psicologia',
    issWithholding: false
  });
  
  const [uploadingCertificate, setUploadingCertificate] = useState(false);
  const [certificateUploadError, setCertificateUploadError] = useState<string>('');
  const [savingSettings, setSavingSettings] = useState(false);

  // Mock therapist ID - in real app, get from auth context
  const therapistId = "1";

  // Define setup steps
  const [setupSteps, setSetupSteps] = useState<SetupStep[]>([
    {
      id: 'certificate',
      title: 'Certificado Digital',
      description: 'Faça upload do seu certificado digital A1 (.p12 ou .pfx)',
      status: 'pending',
      action: () => handleCertificateUpload()
    },
    {
      id: 'settings',
      title: 'Configurações de Serviço',
      description: 'Configure os códigos de serviço e alíquotas',
      status: 'pending',
      action: () => setCurrentStep(1)
    },
    {
      id: 'company',
      title: 'Registro da Empresa',
      description: 'Registre sua empresa no provedor de NFS-e',
      status: 'pending'
    },
    {
      id: 'test',
      title: 'Teste de Emissão',
      description: 'Gere uma nota fiscal de teste para validar a configuração',
      status: 'pending'
    }
  ]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadCertificateStatus(),
        loadNFSeSettings()
      ]);
      updateStepStatuses();
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCertificateStatus = async () => {
    try {
      const response = await api.nfse.getCertificateStatus(therapistId);
      setCertificateStatus(response);
    } catch (error) {
      console.error('Error loading certificate status:', error);
    }
  };

  const loadNFSeSettings = async () => {
    try {
      const response = await api.nfse.getNFSeSettings(therapistId);
      setNFSeSettings(response.settings);
    } catch (error) {
      console.error('Error loading NFS-e settings:', error);
    }
  };

  const updateStepStatuses = () => {
    setSetupSteps(prevSteps => {
      const newSteps = [...prevSteps];
      
      // Update certificate step
      const certStep = newSteps.find(s => s.id === 'certificate');
      if (certStep) {
        if (certificateStatus?.hasValidCertificate) {
          certStep.status = 'completed';
        } else if (certificateStatus?.status === 'expired') {
          certStep.status = 'error';
        } else {
          certStep.status = 'pending';
        }
      }

      // Update settings step based on certificate
      const settingsStep = newSteps.find(s => s.id === 'settings');
      if (settingsStep) {
        settingsStep.status = certificateStatus?.hasValidCertificate ? 'pending' : 'pending';
      }

      return newSteps;
    });
  };

  const handleCertificateUpload = async () => {
    try {
      setUploadingCertificate(true);
      setCertificateUploadError('');

      // Pick certificate file
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/x-pkcs12', 'application/pkcs12', '*.p12', '*.pfx'],
        copyToCacheDirectory: true
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      
      if (!file) {
        setCertificateUploadError('Nenhum arquivo selecionado.');
        return;
      }

      // Get password from user
      const password = await new Promise<string>((resolve, reject) => {
        const userPassword = prompt('Digite a senha do seu certificado digital:');
        if (userPassword === null) {
          reject(new Error('Cancelled'));
        } else if (!userPassword.trim()) {
          reject(new Error('Senha é obrigatória'));
        } else {
          resolve(userPassword.trim());
        }
      });

      // Upload certificate
      await api.nfse.uploadCertificate(therapistId, file, password);
      
      // Success - reload status and update steps
      setCertificateUploadError('');
      await loadCertificateStatus();
      updateStepStatuses();
      
      // Move to next step
      setCurrentStep(1);
      
    } catch (error) {
      if (error instanceof Error && error.message === 'Cancelled') {
        return;
      }
      
      console.error('Certificate upload error:', error);
      
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        
        if (errorMsg.includes('invalid certificate password') || 
            errorMsg.includes('invalid password') ||
            errorMsg.includes('mac could not be verified')) {
          setCertificateUploadError('Senha do certificado incorreta. Verifique a senha e tente novamente.');
        } else if (errorMsg.includes('expired')) {
          setCertificateUploadError('Este certificado expirou. Use um certificado válido.');
        } else if (errorMsg.includes('invalid') || errorMsg.includes('unsupported')) {
          setCertificateUploadError('Formato de certificado inválido. Use um arquivo .p12 ou .pfx válido.');
        } else {
          setCertificateUploadError(`Falha no upload: ${error.message}`);
        }
      } else {
        setCertificateUploadError('Ocorreu um erro inesperado durante o upload.');
      }
    } finally {
      setUploadingCertificate(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      await api.nfse.updateNFSeSettings(therapistId, nfseSettings);
      
      // Update step status
      setSetupSteps(prevSteps => {
        const newSteps = [...prevSteps];
        const settingsStep = newSteps.find(s => s.id === 'settings');
        if (settingsStep) {
          settingsStep.status = 'completed';
        }
        return newSteps;
      });
      
      // Move to next step
      setCurrentStep(2);
      
    } catch (error) {
      console.error('Save settings error:', error);
    } finally {
      setSavingSettings(false);
    }
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'in_progress': return '🔄';
      case 'error': return '❌';
      default: return '⏳';
    }
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'in_progress': return '#2196F3';
      case 'error': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Carregando configuração NFS-e...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🧾 Configuração NFS-e</Text>
        <Text style={styles.subtitle}>
          Configure a emissão automática de notas fiscais para suas sessões
        </Text>
      </View>

      {/* Progress Steps */}
      <View style={styles.stepsContainer}>
        <Text style={styles.stepsTitle}>Progresso da Configuração</Text>
        {setupSteps.map((step, index) => (
          <View key={step.id} style={styles.stepItem}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepIcon}>{getStepIcon(step.status)}</Text>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: getStepColor(step.status) }]}>
                  {index + 1}. {step.title}
                </Text>
                <Text style={styles.stepDescription}>{step.description}</Text>
              </View>
            </View>
            
            {step.action && step.status === 'pending' && currentStep === index && (
              <Pressable style={styles.stepAction} onPress={step.action}>
                <Text style={styles.stepActionText}>Configurar</Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>

      {/* Step 1: Certificate Upload */}
      {currentStep === 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>1. Certificado Digital</Text>
          <Text style={styles.cardDescription}>
            Faça upload do seu certificado digital A1 no formato .p12 ou .pfx.
            Este certificado é necessário para assinar digitalmente as notas fiscais.
          </Text>

          {certificateStatus && certificateStatus.hasValidCertificate ? (
            <View style={styles.successContainer}>
              <Text style={styles.successTitle}>✅ Certificado Válido</Text>
              <Text style={styles.successText}>
                Empresa: {certificateStatus.certificateInfo?.commonName}
              </Text>
              <Text style={styles.successText}>
                Emissor: {certificateStatus.certificateInfo?.issuer}
              </Text>
              {certificateStatus.expiresAt && (
                <Text style={styles.successText}>
                  Expira em: {new Date(certificateStatus.expiresAt).toLocaleDateString()}
                </Text>
              )}
            </View>
          ) : (
            <>
              {certificateUploadError && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>⚠️ {certificateUploadError}</Text>
                </View>
              )}
              
              <Pressable 
                style={[styles.primaryButton, uploadingCertificate && styles.buttonDisabled]} 
                onPress={handleCertificateUpload}
                disabled={uploadingCertificate}
              >
                <Text style={styles.primaryButtonText}>
                  {uploadingCertificate ? 'Enviando...' : '📁 Fazer Upload do Certificado'}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      )}

      {/* Step 2: Service Settings */}
      {currentStep === 1 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>2. Configurações de Serviço</Text>
          <Text style={styles.cardDescription}>
            Configure os códigos de serviço e alíquotas para sua atividade de psicologia.
          </Text>

          <Text style={styles.label}>Código de Serviço</Text>
          <Picker
            selectedValue={nfseSettings.serviceCode}
            onValueChange={(value) => setNFSeSettings({...nfseSettings, serviceCode: value})}
            style={styles.picker}
          >
            <Picker.Item label="14.01 - Psicologia e Psicanálise" value="14.01" />
            <Picker.Item label="14.13 - Terapias Diversas" value="14.13" />
          </Picker>

          <Text style={styles.label}>Alíquota do ISS (%)</Text>
          <Picker
            selectedValue={nfseSettings.taxRate.toString()}
            onValueChange={(value) => setNFSeSettings({...nfseSettings, taxRate: parseFloat(value)})}
            style={styles.picker}
          >
            <Picker.Item label="2%" value="2" />
            <Picker.Item label="3%" value="3" />
            <Picker.Item label="4%" value="4" />
            <Picker.Item label="5%" value="5" />
          </Picker>

          <Text style={styles.label}>Descrição Padrão do Serviço</Text>
          <View style={styles.input}>
            <Text style={styles.inputText}>{nfseSettings.defaultServiceDescription}</Text>
          </View>

          <Pressable 
            style={[styles.primaryButton, savingSettings && styles.buttonDisabled]}
            onPress={handleSaveSettings}
            disabled={savingSettings}
          >
            <Text style={styles.primaryButtonText}>
              {savingSettings ? 'Salvando...' : '💾 Salvar Configurações'}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Step 3: Company Registration */}
      {currentStep === 2 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>3. Registro da Empresa</Text>
          <Text style={styles.cardDescription}>
            Registre sua empresa no provedor de NFS-e (PlugNotas) para começar a emitir notas fiscais.
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              ℹ️ Esta funcionalidade será implementada em breve. 
              Por enquanto, você pode testar a emissão de notas usando o modo sandbox.
            </Text>
          </View>

          <Pressable 
            style={styles.secondaryButton}
            onPress={() => setCurrentStep(3)}
          >
            <Text style={styles.secondaryButtonText}>
              ⏭️ Pular para Teste
            </Text>
          </Pressable>
        </View>
      )}

      {/* Step 4: Test Invoice */}
      {currentStep === 3 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>4. Teste de Emissão</Text>
          <Text style={styles.cardDescription}>
            Gere uma nota fiscal de teste para validar se sua configuração está funcionando corretamente.
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              ℹ️ Esta funcionalidade será implementada em breve.
              Por enquanto, acesse a tela de testes para validar sua configuração.
            </Text>
          </View>

          <Pressable 
            style={styles.secondaryButton}
            onPress={() => window.location.href = '/nfse-test'}
          >
            <Text style={styles.secondaryButtonText}>
              🔧 Ir para Tela de Testes
            </Text>
          </Pressable>
        </View>
      )}

      {/* Navigation */}
      <View style={styles.navigation}>
        {currentStep > 0 && (
          <Pressable 
            style={styles.navButton}
            onPress={() => setCurrentStep(currentStep - 1)}
          >
            <Text style={styles.navButtonText}>← Anterior</Text>
          </Pressable>
        )}
        
        <Pressable 
          style={styles.backButton}
          onPress={() => window.location.href = '/settings'}
        >
          <Text style={styles.backButtonText}>🏠 Voltar às Configurações</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: 'white',
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  stepsContainer: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stepsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  stepItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepIcon: {
    fontSize: 24,
    marginRight: 12,
    marginTop: 2,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  stepAction: {
    backgroundColor: '#6200ee',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
    marginLeft: 36,
  },
  stepActionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  card: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 20,
  },
  successContainer: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4CAF50',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: '#2e7d32',
    marginBottom: 4,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderColor: '#f44336',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    lineHeight: 20,
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  infoText: {
    color: '#1565c0',
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 16,
    color: '#333',
  },
  picker: {
    backgroundColor: '#f8f9fa',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  inputText: {
    fontSize: 14,
    color: '#333',
  },
  primaryButton: {
    backgroundColor: '#6200ee',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#6200ee',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    borderColor: '#ccc',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  secondaryButtonText: {
    color: '#6200ee',
    fontSize: 16,
    fontWeight: '500',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  navButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  navButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  backButton: {
    backgroundColor: '#28a745',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  backButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});