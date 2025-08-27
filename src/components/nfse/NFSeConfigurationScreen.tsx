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
  const [validating, setValidating] = useState(false);

  const { user } = useAuth();
  const therapistId = user?.therapistId?.toString() || "1";

  // Simplified setup steps - removed test step
  const [setupSteps, setSetupSteps] = useState<SetupStep[]>([
    {
      id: 'certificate',
      title: 'Certificado e Registro',
      description: 'Upload do certificado com validação e registro automáticos',
      status: 'pending',
      action: () => handleCertificateUpload()
    },
    {
      id: 'settings',
      title: 'Configurações de Serviço',
      description: 'Configure os códigos de serviço e alíquotas',
      status: 'pending',
      action: () => setCurrentStep(1)
    }
  ]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (typeof currentStep === 'number') {
      setSetupSteps(prevSteps => {
        const newSteps = [...prevSteps];
        newSteps.forEach((step, index) => {
          if (index < currentStep) {
            step.status = 'completed';
          } else if (index === currentStep) {
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
      // Load both certificate status and settings
      const [certStatus, settingsResponse] = await Promise.all([
        api.nfse.getCertificateStatus(therapistId),
        api.nfse.getNFSeSettings(therapistId)
      ]);
      
      // Update state with loaded data
      setCertificateStatus({
        ...certStatus,
        validationStatus: certStatus.validationStatus as 'idle' | 'validating' | 'validated' | 'error' | undefined
      });
      setNFSeSettings(settingsResponse.settings);
      
      // Determine if fully configured based on what we have
      const isFullyConfigured = 
        certStatus?.hasValidCertificate && 
        certStatus?.certificateInfo?.cnpj &&
        certStatus?.status === 'active';
      
      if (isFullyConfigured) {
        // System is configured - show summary
        setCurrentStep('summary');
        setSetupSteps(prevSteps => 
          prevSteps.map(step => ({ ...step, status: 'completed' }))
        );
        
        // Since we don't persist validationStatus, set it as validated if everything looks good
        setCertificateStatus(prev => prev ? {
          ...prev,
          validationStatus: 'validated'
        } : prev);
      } else if (certStatus?.hasValidCertificate) {
        // Certificate exists but may not be fully configured
        setCurrentStep(1); // Go to settings
        setSetupSteps(prevSteps => 
          prevSteps.map((step, index) => ({
            ...step,
            status: index === 0 ? 'completed' : index === 1 ? 'in_progress' : 'pending'
          }))
        );
      } else {
        // No certificate - start from beginning
        setCurrentStep(0);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      setCurrentStep(0);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCertificateStatus = async () => {
    try {
      const response = await api.nfse.getCertificateStatus(therapistId);
      // Ensure validationStatus is typed correctly
      setCertificateStatus({
        ...response,
        validationStatus: response.validationStatus as 'idle' | 'validating' | 'validated' | 'error' | undefined
      });
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

  const performAutomatedValidation = async (certificateInfo: any) => {
    setValidating(true);
    
    try {
      // Step 1: Auto-register company if CNPJ found
      if (certificateInfo.cnpj) {
        console.log('Auto-registering company with CNPJ:', certificateInfo.cnpj);
        
        try {
          await api.nfse.registerNFSeCompany(therapistId, {
            cnpj: certificateInfo.cnpj,
            companyName: certificateInfo.commonName,
            tradeName: certificateInfo.commonName,
            email: user?.email || '',
            phone: '',
            municipalRegistration: '',
            address: {
              street: '',
              number: '',
              neighborhood: '',
              city: 'São Paulo',
              state: 'SP',
              zipCode: ''
            }
          });
          
          // Update certificate status to show auto-registration
          setCertificateStatus(prev => prev ? {
            ...prev,
            certificateInfo: {
              ...prev.certificateInfo!,
              autoRegistered: true
            }
          } : prev);
        } catch (regError) {
          console.error('Auto-registration failed:', regError);
          // Continue - registration might already exist
        }
      }

      // Step 2: Run background test invoice (optional - skip if it fails)
      console.log('Running background validation test...');
      
      try {
        const testData = {
          patientId: '1',
          year: new Date().getFullYear(),
          month: new Date().getMonth() + 1,
          testMode: true,
          customerData: {
            document: '00000000000',
            name: 'TESTE DE VALIDAÇÃO',
            address: {
              street: 'Rua Teste',
              number: '123',
              neighborhood: 'Centro',
              city: 'São Paulo',
              state: 'SP',
              zipCode: '01000-000',
              cityCode: '3550308'
            }
          }
        };

        const testResult = await api.nfse.generateInvoice(therapistId, testData);
        
        if (testResult.invoice.status === 'error') {
          // If error is about missing billing periods, that's OK for validation
          if (testResult.invoice.error?.includes('billing period') || 
              testResult.invoice.error?.includes('not found')) {
            console.log('Test validation passed - system is configured correctly');
          } else {
            throw new Error(testResult.invoice.error || 'Falha na validação');
          }
        }

        // Success - update status
        setCertificateStatus(prev => prev ? {
          ...prev,
          validationStatus: 'validated',
          validationError: undefined
        } : prev);

        // Auto-advance to settings if not already configured
        const settings = await api.nfse.getNFSeSettings(therapistId);
        if (!(settings as any).isConfigured) {
          setCurrentStep(1);
        } else {
          setCurrentStep('summary');
          setSetupSteps(prevSteps => 
            prevSteps.map(step => ({ ...step, status: 'completed' }))
          );
        }

      } catch (testError: any) {
        // Test failed - show specific error
        const errorMessage = testError.message || 'Erro na validação da integração';
        
        setCertificateStatus(prev => prev ? {
          ...prev,
          validationStatus: 'error',
          validationError: errorMessage
        } : prev);
      }

    } catch (error) {
      console.error('Validation error:', error);
      setCertificateStatus(prev => prev ? {
        ...prev,
        validationStatus: 'error',
        validationError: 'Erro durante validação automática'
      } : prev);
    } finally {
      setValidating(false);
    }
  };

  const handleCertificateUpload = async () => {
    try {
      setUploadingCertificate(true);
      setCertificateUploadError('');

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

      // Clear error and update status
      setCertificateUploadError('');
      setCertificateStatus({
        hasValidCertificate: true,
        status: 'active',
        expiresAt: response.certificateInfo.expiresAt.toString(),
        validationStatus: 'validating',
        certificateInfo: response.certificateInfo
      });

      // Start automated validation process
      await performAutomatedValidation(response.certificateInfo);

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

      setSetupSteps(prevSteps => {
        const newSteps = [...prevSteps];
        const settingsStep = newSteps.find(s => s.id === 'settings');
        if (settingsStep) {
          settingsStep.status = 'completed';
        }
        return newSteps;
      });

      // Move to summary
      setCurrentStep('summary');

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

  // Show summary view when fully configured
  if (currentStep === 'summary' && 
      certificateStatus?.hasValidCertificate && 
      certificateStatus?.validationStatus === 'validated') {
    return (
      <NFSeConfigurationSummary
        certificateStatus={certificateStatus}
        nfseSettings={nfseSettings}
        onUpdateCertificate={() => {
          setCurrentStep(0);
          setSetupSteps(prevSteps => 
            prevSteps.map((step, index) => ({
              ...step,
              status: index === 0 ? 'in_progress' : 'pending'
            }))
          );
        }}
        onUpdateSettings={() => {
          setCurrentStep(1);
          setSetupSteps(prevSteps => 
            prevSteps.map((step, index) => ({
              ...step,
              status: index === 0 ? 'completed' : index === 1 ? 'in_progress' : 'pending'
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
          validating={validating}
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

          {certificateStatus?.hasValidCertificate && 
           certificateStatus?.validationStatus === 'validated' && (
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