// src/components/nfse/NFSeConfigurationScreen.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { api } from '../../services/api';
import { styles } from './styles';
import { CertificateStatus, NFSeSettings, SetupStep } from './types';
import { StepProgress } from './StepProgress';
import { CertificateUploadStep } from './CertificateUploadStep';
import { ServiceSettingsStep } from './ServiceSettingsStep';
import { NFSeConfigurationSummary } from './NFSeConfigurationSummary';
import { TestInvoiceStep } from './TestInvoiceStep';
import { useAuth } from '../../contexts/AuthContext';

export const NFSeConfigurationScreen: React.FC = () => {
  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<number | 'summary'>(0);
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
  const { user } = useAuth();
  const therapistId = user?.therapistId?.toString() || "1"; // Fallback for testing

  // Define setup steps
  const [setupSteps, setSetupSteps] = useState<SetupStep[]>([
    {
      id: 'certificate',
      title: 'Certificado Digital e Registro',
      description: 'Faça upload do certificado - o registro da empresa é automático',
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
      id: 'test',
      title: 'Teste de Emissão',
      description: 'Gere uma nota fiscal de teste para validar a configuração',
      status: 'pending'
    }
  ]);

  useEffect(() => {
    loadInitialData();
  }, []);

  // When currentStep changes, update the step statuses
  useEffect(() => {
    if (typeof currentStep === 'number') {
      setSetupSteps(prevSteps => {
        const newSteps = [...prevSteps];
        newSteps.forEach((step, index) => {
          if (index < currentStep && step.status === 'pending') {
            step.status = 'completed';
          } else if (index === currentStep && step.status === 'pending') {
            step.status = 'in_progress';
          }
        });
        return newSteps;
      });
    }
  }, [currentStep]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadCertificateStatus(),
        loadNFSeSettings()
      ]);
      updateStepStatuses();
      
      // Check if fully configured and set to summary view
      const status = await api.nfse.getCertificateStatus(therapistId);
      if (status?.hasValidCertificate && status?.certificateInfo?.cnpj) {
        setCurrentStep('summary');
        
        // Mark all steps as completed
        setSetupSteps(prevSteps => 
          prevSteps.map(step => ({ ...step, status: 'completed' }))
        );
      }
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
      const response = await api.nfse.uploadCertificate(therapistId, file, password);

      // Success - reload status and update steps
      setCertificateUploadError('');
      await loadCertificateStatus();
      updateStepStatuses();

      // Check if auto-registration happened
      if (response.certificateInfo?.cnpj) {
        // If we now have everything configured, go to summary
        setCurrentStep('summary');
        
        // Mark all steps as completed
        setSetupSteps(prevSteps => 
          prevSteps.map(step => ({ ...step, status: 'completed' }))
        );
      } else {
        // Move to settings step
        setCurrentStep(1);
      }

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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Carregando configuração NFS-e...</Text>
      </View>
    );
  }

  // Check for expired certificate
  if (certificateStatus?.status === 'expired') {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>⚠️ Certificado Expirado</Text>
          <Text style={styles.subtitle}>
            Seu certificado digital expirou e precisa ser atualizado
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              Seu certificado expirou em {certificateStatus.expiresAt ? new Date(certificateStatus.expiresAt).toLocaleDateString() : 'Data não disponível'}
            </Text>
            <Text style={styles.errorText}>
              Para continuar emitindo notas fiscais, faça upload de um novo certificado.
            </Text>
          </View>

          <Pressable
            style={styles.primaryButton}
            onPress={handleCertificateUpload}
          >
            <Text style={styles.primaryButtonText}>
              🔒 Fazer Upload de Novo Certificado
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // Show summary view when currentStep is 'summary'
  if (currentStep === 'summary' && certificateStatus?.hasValidCertificate && certificateStatus?.certificateInfo?.cnpj) {
    return (
      <NFSeConfigurationSummary
        certificateStatus={certificateStatus}
        nfseSettings={nfseSettings}
        onUpdateCertificate={() => {
          setCurrentStep(0);
          // Reset steps after certificate to pending
          setSetupSteps(prevSteps => 
            prevSteps.map((step, index) => ({
              ...step,
              status: index === 0 ? 'in_progress' : index > 0 ? 'pending' : step.status
            }))
          );
        }}
        onUpdateSettings={() => {
          setCurrentStep(1);
          // Keep certificate as completed, set settings to in_progress, rest to pending
          setSetupSteps(prevSteps => 
            prevSteps.map((step, index) => ({
              ...step,
              status: index === 0 ? 'completed' : index === 1 ? 'in_progress' : 'pending'
            }))
          );
        }}
        onTestInvoice={() => {
          setCurrentStep(2);
          // Keep first two as completed, set test to in_progress
          setSetupSteps(prevSteps => 
            prevSteps.map((step, index) => ({
              ...step,
              status: index < 2 ? 'completed' : 'in_progress'
            }))
          );
        }}
      />
    );
  }

  // Show step-based configuration
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🧾 Configuração NFS-e</Text>
        <Text style={styles.subtitle}>
          Configure a emissão automática de notas fiscais para suas sessões
        </Text>
      </View>

      {/* Progress Steps */}
      <StepProgress steps={setupSteps} currentStep={typeof currentStep === 'number' ? currentStep : 0} />

      {/* Step Components */}
      {currentStep === 0 && (
        <CertificateUploadStep
          certificateStatus={certificateStatus}
          uploadingCertificate={uploadingCertificate}
          certificateUploadError={certificateUploadError}
          onUpload={handleCertificateUpload}
        />
      )}

      {currentStep === 1 && (
        <ServiceSettingsStep
          settings={nfseSettings}
          savingSettings={savingSettings}
          onUpdateSettings={setNFSeSettings}
          onSave={handleSaveSettings}
        />
      )}

      {currentStep === 2 && (
        <TestInvoiceStep
          onNavigateToTest={() => window.location.href = '/nfse-test'}
        />
      )}

      {/* Navigation */}
      {typeof currentStep === 'number' && (
        <View style={styles.navigation}>
          {currentStep > 0 && (
            <Pressable
              style={styles.navButton}
              onPress={() => setCurrentStep(currentStep - 1)}
            >
              <Text style={styles.navButtonText}>← Anterior</Text>
            </Pressable>
          )}

          {certificateStatus?.hasValidCertificate && certificateStatus?.certificateInfo?.cnpj && (
            <Pressable
              style={styles.successButton}
              onPress={() => setCurrentStep('summary')}
            >
              <Text style={styles.successButtonText}>✅ Ver Resumo</Text>
            </Pressable>
          )}

          <Pressable
            style={styles.backButton}
            onPress={() => window.location.href = '/configuracoes'}
          >
            <Text style={styles.backButtonText}>🏠 Voltar às Configurações</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
};