// src/components/dashboard/NFSeTestingSection.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
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

interface TestInvoiceResult {
  invoiceId: string;
  status: string;
  pdfUrl?: string;
  xmlUrl?: string;
  error?: string;
}

interface ConnectionStatus {
  connected: boolean;
  provider: string;
  environment: string;
  error?: string;
}

export const NFSeTestingSection: React.FC = () => {
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [certificateStatus, setCertificateStatus] = useState<CertificateStatus | null>(null);
  const [nfseSettings, setNFSeSettings] = useState<NFSeSettings>({
    serviceCode: '14.01',
    taxRate: 5,
    defaultServiceDescription: 'Serviços de Psicologia',
    issWithholding: false
  });
  
  const [uploadingCertificate, setUploadingCertificate] = useState(false);
  const [testingInvoice, setTestingInvoice] = useState(false);
  const [registeringCompany, setRegisteringCompany] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<TestInvoiceResult | null>(null);

  // Mock therapist ID - in real app, get from auth context
  const therapistId = "1"; // Replace with real therapist ID from context

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadConnectionStatus(),
        loadCertificateStatus(),
        loadNFSeSettings()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadConnectionStatus = async () => {
    try {
      const response = await api.nfse.testNFSeConnection();
      setConnectionStatus(response);
    } catch (error) {
      console.error('Error loading connection status:', error);
      setConnectionStatus({
        connected: false,
        provider: 'PlugNotas',
        environment: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
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

  const handleCertificateUpload = async () => {
    try {
      setUploadingCertificate(true);

      // Pick certificate file
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/x-pkcs12', 'application/x-pkcs12', '*.p12', '*.pfx'],
        copyToCacheDirectory: true
      });

      if (result.canceled) {
        return;
      }

      // Get password from user
      const password = await new Promise<string>((resolve, reject) => {
        Alert.prompt(
          'Certificate Password',
          'Enter the password for your digital certificate:',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => reject(new Error('Cancelled')) },
            { 
              text: 'Upload', 
              onPress: (password) => {
                if (!password) {
                  reject(new Error('Password is required'));
                } else {
                  resolve(password);
                }
              }
            }
          ],
          'secure-text'
        );
      });

      // Upload certificate
      await api.nfse.uploadCertificate(therapistId, result.assets[0], password);
      
      Alert.alert('Success', 'Certificate uploaded and validated successfully!');
      await loadCertificateStatus();
      
    } catch (error) {
      console.error('Certificate upload error:', error);
      Alert.alert('Error', `Certificate upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploadingCertificate(false);
    }
  };

  const handleCompanyRegistration = async () => {
    try {
      setRegisteringCompany(true);

      // In a real app, you'd have a form to collect this data
      const companyData = {
        cnpj: '12345678000100', // Mock data - replace with form
        companyName: 'Clínica Exemplo Ltda',
        tradeName: 'Clínica Exemplo',
        email: 'contato@clinicaexemplo.com.br',
        phone: '(11) 99999-9999',
        municipalRegistration: '123456',
        address: {
          street: 'Rua das Flores',
          number: '123',
          neighborhood: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01234-567'
        }
      };

      await api.nfse.registerNFSeCompany(therapistId, companyData);
      
      Alert.alert('Success', 'Company registered successfully with NFS-e provider!');
      
    } catch (error) {
      console.error('Company registration error:', error);
      Alert.alert('Error', `Company registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setRegisteringCompany(false);
    }
  };

  const handleTestInvoice = async () => {
    try {
      setTestingInvoice(true);

      // Mock session and customer data for testing
      const testData = {
        sessionId: '1', // Mock session ID
        customerData: {
          name: 'João Silva (Teste)',
          email: 'joao.teste@email.com',
          document: '12345678901' // CPF
        },
        serviceData: {
          description: nfseSettings.defaultServiceDescription,
          value: 150.00,
          serviceCode: nfseSettings.serviceCode
        }
      };

      const result = await api.nfse.generateTestInvoice(therapistId, testData);
      setLastTestResult(result.invoice);
      
      Alert.alert(
        'Test Invoice Generated!', 
        `Invoice ID: ${result.invoice.invoiceId}\nStatus: ${result.invoice.status}`,
        [
          { text: 'OK' },
          ...(result.invoice.pdfUrl ? [{
            text: 'View PDF',
            onPress: () => {
              // In a real app, open the PDF URL
              console.log('Opening PDF:', result.invoice.pdfUrl);
            }
          }] : [])
        ]
      );
      
    } catch (error) {
      console.error('Test invoice error:', error);
      Alert.alert('Error', `Test invoice failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTestingInvoice(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await api.nfse.updateNFSeSettings(therapistId, nfseSettings);
      Alert.alert('Success', 'NFS-e settings saved successfully!');
    } catch (error) {
      console.error('Save settings error:', error);
      Alert.alert('Error', `Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#4CAF50';
      case 'expired': return '#F44336';
      case 'invalid': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'not_uploaded': return 'Not Uploaded';
      case 'active': return 'Active';
      case 'expired': return 'Expired';
      case 'invalid': return 'Invalid';
      default: return 'Unknown';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Loading NFS-e Configuration...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>🧾 NFS-e Integration Testing</Text>
      
      {/* Connection Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Provider Connection</Text>
        {connectionStatus && (
          <View style={styles.statusRow}>
            <View style={[
              styles.statusIndicator, 
              { backgroundColor: connectionStatus.connected ? '#4CAF50' : '#F44336' }
            ]} />
            <Text style={styles.statusText}>
              {connectionStatus.provider} ({connectionStatus.environment})
              {connectionStatus.connected ? ' - Connected' : ' - Disconnected'}
            </Text>
          </View>
        )}
        <Pressable 
          style={styles.button} 
          onPress={loadConnectionStatus}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Test Connection</Text>
        </Pressable>
      </View>

      {/* Certificate Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Digital Certificate</Text>
        {certificateStatus && (
          <View>
            <View style={styles.statusRow}>
              <View style={[
                styles.statusIndicator, 
                { backgroundColor: getStatusColor(certificateStatus.status) }
              ]} />
              <Text style={styles.statusText}>
                Status: {getStatusText(certificateStatus.status)}
              </Text>
            </View>
            
            {certificateStatus.certificateInfo && (
              <View style={styles.certificateInfo}>
                <Text style={styles.infoText}>
                  Common Name: {certificateStatus.certificateInfo.commonName}
                </Text>
                <Text style={styles.infoText}>
                  Issuer: {certificateStatus.certificateInfo.issuer}
                </Text>
                {certificateStatus.expiresAt && (
                  <Text style={[
                    styles.infoText,
                    certificateStatus.expiresIn30Days && styles.warningText
                  ]}>
                    Expires: {new Date(certificateStatus.expiresAt).toLocaleDateString()}
                    {certificateStatus.expiresIn30Days && ' ⚠️ Expires soon!'}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}
        
        <Pressable 
          style={[styles.button, uploadingCertificate && styles.buttonDisabled]} 
          onPress={handleCertificateUpload}
          disabled={uploadingCertificate}
        >
          <Text style={styles.buttonText}>
            {uploadingCertificate ? 'Uploading...' : 'Upload Certificate'}
          </Text>
        </Pressable>
      </View>

      {/* Company Registration */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Company Registration</Text>
        <Text style={styles.description}>
          Register your practice with the NFS-e provider for invoice generation.
        </Text>
        
        <Pressable 
          style={[styles.button, registeringCompany && styles.buttonDisabled]} 
          onPress={handleCompanyRegistration}
          disabled={registeringCompany || !certificateStatus?.hasValidCertificate}
        >
          <Text style={styles.buttonText}>
            {registeringCompany ? 'Registering...' : 'Register Company'}
          </Text>
        </Pressable>
        
        {!certificateStatus?.hasValidCertificate && (
          <Text style={styles.warningText}>
            ⚠️ Valid certificate required for company registration
          </Text>
        )}
      </View>

      {/* NFS-e Settings */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>NFS-e Settings</Text>
        
        <Text style={styles.label}>Service Code</Text>
        <Picker
          selectedValue={nfseSettings.serviceCode}
          onValueChange={(value) => setNFSeSettings({...nfseSettings, serviceCode: value})}
          style={styles.picker}
        >
          <Picker.Item label="14.01 - Psicologia e Psicanálise" value="14.01" />
          <Picker.Item label="14.13 - Terapias Diversas" value="14.13" />
        </Picker>

        <Text style={styles.label}>Tax Rate (%)</Text>
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

        <Text style={styles.label}>Default Service Description</Text>
        <Text style={styles.input}>
          {nfseSettings.defaultServiceDescription}
        </Text>

        <Pressable style={styles.button} onPress={handleSaveSettings}>
          <Text style={styles.buttonText}>Save Settings</Text>
        </Pressable>
      </View>

      {/* Test Invoice Generation */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Test Invoice Generation</Text>
        <Text style={styles.description}>
          Generate a test invoice in sandbox mode to verify your configuration.
        </Text>
        
        <Pressable 
          style={[styles.button, testingInvoice && styles.buttonDisabled]} 
          onPress={handleTestInvoice}
          disabled={testingInvoice || !certificateStatus?.hasValidCertificate}
        >
          <Text style={styles.buttonText}>
            {testingInvoice ? 'Generating...' : 'Generate Test Invoice'}
          </Text>
        </Pressable>

        {lastTestResult && (
          <View style={styles.testResult}>
            <Text style={styles.resultTitle}>Last Test Result:</Text>
            <Text style={styles.resultText}>Invoice ID: {lastTestResult.invoiceId}</Text>
            <Text style={styles.resultText}>Status: {lastTestResult.status}</Text>
            {lastTestResult.error && (
              <Text style={[styles.resultText, styles.errorText]}>
                Error: {lastTestResult.error}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Environment Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Environment Information</Text>
        <Text style={styles.infoText}>
          • Testing in {connectionStatus?.environment || 'unknown'} mode
        </Text>
        <Text style={styles.infoText}>
          • Provider: {connectionStatus?.provider || 'Unknown'}
        </Text>
        <Text style={styles.infoText}>
          • Service codes for São Paulo municipality
        </Text>
        <Text style={styles.infoText}>
          • All test invoices are sandbox-only
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
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
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#333',
  },
  certificateInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 4,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  warningText: {
    color: '#FF9800',
    fontSize: 12,
    marginTop: 8,
  },
  errorText: {
    color: '#F44336',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 12,
    color: '#333',
  },
  picker: {
    backgroundColor: '#f8f9fa',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 4,
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#6200ee',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  testResult: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 4,
    marginTop: 12,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  resultText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
});