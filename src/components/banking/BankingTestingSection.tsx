// src/components/banking/BankingTestingSection.tsx
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput } from 'react-native';
import { apiService } from '../../services/api';

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
}

export const BankingTestingSection: React.FC = () => {
  const [therapistId, setTherapistId] = useState('1');
  const [results, setResults] = useState<{ [key: string]: TestResult }>({});
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});

  const updateResult = (testName: string, result: TestResult) => {
    setResults(prev => ({ ...prev, [testName]: result }));
    setLoading(prev => ({ ...prev, [testName]: false }));
  };

  const setLoadingState = (testName: string, isLoading: boolean) => {
    setLoading(prev => ({ ...prev, [testName]: isLoading }));
  };

  const testAPI = async () => {
    const testName = 'api';
    setLoadingState(testName, true);
    
    try {
      const response = await fetch('http://localhost:3000/api/test', {
        headers: {
          'X-API-Key': process.env.SAFE_PROXY_API_KEY || '',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      updateResult(testName, { success: true, data });
    } catch (error) {
      updateResult(testName, { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  };

  const getBankingSummary = async () => {
    const testName = 'summary';
    setLoadingState(testName, true);
    
    try {
      const response = await fetch(`http://localhost:3000/api/pluggy/summary/${therapistId}`, {
        headers: {
          'X-API-Key': process.env.SAFE_PROXY_API_KEY || '',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      updateResult(testName, { success: true, data });
    } catch (error) {
      updateResult(testName, { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  };

  const createConnectToken = async () => {
    const testName = 'connectToken';
    setLoadingState(testName, true);
    
    try {
      const response = await fetch('http://localhost:3000/api/pluggy/connect-token', {
        method: 'POST',
        headers: {
          'X-API-Key': process.env.SAFE_PROXY_API_KEY || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ therapistId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      updateResult(testName, { success: true, data });
    } catch (error) {
      updateResult(testName, { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  };

  const getBankConnections = async () => {
    const testName = 'connections';
    setLoadingState(testName, true);
    
    try {
      const response = await fetch(`http://localhost:3000/api/pluggy/connections/${therapistId}`, {
        headers: {
          'X-API-Key': process.env.SAFE_PROXY_API_KEY || '',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      updateResult(testName, { success: true, data });
    } catch (error) {
      updateResult(testName, { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  };

  const getTransactions = async () => {
    const testName = 'transactions';
    setLoadingState(testName, true);
    
    try {
      const response = await fetch(`http://localhost:3000/api/pluggy/transactions/${therapistId}`, {
        headers: {
          'X-API-Key': process.env.SAFE_PROXY_API_KEY || '',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      updateResult(testName, { success: true, data });
    } catch (error) {
      updateResult(testName, { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  };

  const getUnmatchedTransactions = async () => {
    const testName = 'unmatched';
    setLoadingState(testName, true);
    
    try {
      const response = await fetch(`http://localhost:3000/api/pluggy/unmatched-transactions/${therapistId}`, {
        headers: {
          'X-API-Key': process.env.SAFE_PROXY_API_KEY || '',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      updateResult(testName, { success: true, data });
    } catch (error) {
      updateResult(testName, { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  };

  const ResultDisplay: React.FC<{ testName: string; title: string }> = ({ testName, title }) => {
    const result = results[testName];
    const isLoading = loading[testName];

    if (!result && !isLoading) return null;

    return (
      <View style={styles.resultContainer}>
        <Text style={styles.resultTitle}>{title} Result:</Text>
        {isLoading ? (
          <Text style={styles.loadingText}>Carregando...</Text>
        ) : result ? (
          <View style={[styles.resultBox, result.success ? styles.successBox : styles.errorBox]}>
            <Text style={styles.resultText}>
              {result.success 
                ? JSON.stringify(result.data, null, 2)
                : `Erro: ${result.error}`
              }
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🏦 Banking Integration Test</Text>
        <Text style={styles.subtitle}>Test Pluggy banking integration endpoints</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configuration</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Therapist ID:</Text>
          <TextInput
            style={styles.input}
            value={therapistId}
            onChangeText={setTherapistId}
            placeholder="Enter therapist ID"
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Test API Connection</Text>
        <Text style={styles.description}>Verify basic API connectivity:</Text>
        <Pressable 
          style={[styles.button, loading.api && styles.buttonDisabled]} 
          onPress={testAPI}
          disabled={loading.api}
        >
          <Text style={styles.buttonText}>
            {loading.api ? 'Testing...' : 'Test API Connection'}
          </Text>
        </Pressable>
        <ResultDisplay testName="api" title="API Connection" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Banking Summary</Text>
        <Text style={styles.description}>Get overall banking status for therapist:</Text>
        <Pressable 
          style={[styles.button, loading.summary && styles.buttonDisabled]} 
          onPress={getBankingSummary}
          disabled={loading.summary}
        >
          <Text style={styles.buttonText}>
            {loading.summary ? 'Loading...' : 'Get Banking Summary'}
          </Text>
        </Pressable>
        <ResultDisplay testName="summary" title="Banking Summary" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. Create Connect Token</Text>
        <Text style={styles.description}>Generate Pluggy connect token for bank connection:</Text>
        <Pressable 
          style={[styles.button, loading.connectToken && styles.buttonDisabled]} 
          onPress={createConnectToken}
          disabled={loading.connectToken}
        >
          <Text style={styles.buttonText}>
            {loading.connectToken ? 'Creating...' : 'Create Connect Token'}
          </Text>
        </Pressable>
        <ResultDisplay testName="connectToken" title="Connect Token" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. Bank Connections</Text>
        <Text style={styles.description}>View connected bank accounts:</Text>
        <Pressable 
          style={[styles.button, loading.connections && styles.buttonDisabled]} 
          onPress={getBankConnections}
          disabled={loading.connections}
        >
          <Text style={styles.buttonText}>
            {loading.connections ? 'Loading...' : 'Get Bank Connections'}
          </Text>
        </Pressable>
        <ResultDisplay testName="connections" title="Bank Connections" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5. Transactions</Text>
        <Text style={styles.description}>View all transactions:</Text>
        <Pressable 
          style={[styles.button, loading.transactions && styles.buttonDisabled]} 
          onPress={getTransactions}
          disabled={loading.transactions}
        >
          <Text style={styles.buttonText}>
            {loading.transactions ? 'Loading...' : 'Get Transactions'}
          </Text>
        </Pressable>
        <ResultDisplay testName="transactions" title="Transactions" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>6. Unmatched Transactions</Text>
        <Text style={styles.description}>View transactions with patient suggestions:</Text>
        <Pressable 
          style={[styles.button, loading.unmatched && styles.buttonDisabled]} 
          onPress={getUnmatchedTransactions}
          disabled={loading.unmatched}
        >
          <Text style={styles.buttonText}>
            {loading.unmatched ? 'Loading...' : 'Get Unmatched Transactions'}
          </Text>
        </Pressable>
        <ResultDisplay testName="unmatched" title="Unmatched Transactions" />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 5,
  },
  section: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 15,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#495057',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#007cba',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonDisabled: {
    backgroundColor: '#6c757d',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    marginTop: 10,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  resultBox: {
    padding: 15,
    borderRadius: 6,
    borderWidth: 1,
  },
  successBox: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
  },
  errorBox: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
  },
  resultText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#212529',
  },
  loadingText: {
    fontSize: 14,
    color: '#6c757d',
    fontStyle: 'italic',
  },
});