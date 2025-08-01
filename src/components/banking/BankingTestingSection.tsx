// src/components/banking/BankingTestingSection.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput } from 'react-native';
import { apiService } from '../../services/api';

// Declare Pluggy Connect for TypeScript
declare global {
  interface Window {
    PluggyConnect: any;
  }
}

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
}

type TestMode = 'mock' | 'sandbox' | 'production';

export const BankingTestingSection: React.FC = () => {
  const [therapistId, setTherapistId] = useState('1');
  const [testMode, setTestMode] = useState<TestMode>('mock');
  const [results, setResults] = useState<{ [key: string]: TestResult }>({});
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [pluggyLoaded, setPluggyLoaded] = useState(false);

  // Load Pluggy Connect script on demand
  const loadPluggyScript = async (): Promise<boolean> => {
    // If already loaded, return true
    if (pluggyLoaded && window.PluggyConnect) {
      return true;
    }

    // If script already exists in DOM, wait for it
    const existingScript = document.querySelector('script[src="https://cdn.pluggy.ai/pluggy-connect/v1/pluggy-connect.js"]');
    if (existingScript) {
      return new Promise((resolve) => {
        if (window.PluggyConnect) {
          setPluggyLoaded(true);
          resolve(true);
        } else {
          existingScript.addEventListener('load', () => {
            setPluggyLoaded(true);
            resolve(true);
          });
          existingScript.addEventListener('error', () => resolve(false));
        }
      });
    }

    // Load script for the first time
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.pluggy.ai/pluggy-connect/v1/pluggy-connect.js';
      script.async = true;
      script.onload = () => {
        console.log('Pluggy Connect script loaded');
        setPluggyLoaded(true);
        resolve(true);
      };
      script.onerror = () => {
        console.error('Failed to load Pluggy Connect script');
        resolve(false);
      };
      document.head.appendChild(script);
    });
  };

  // Helper function to make API calls with current mode
  const makeAPICall = async (url: string, options: RequestInit = {}) => {
    const headers = {
      'X-API-Key': process.env.SAFE_PROXY_API_KEY || '',
      'Content-Type': 'application/json',
      'X-Test-Mode': testMode, // Pass the mode to the API
      ...options.headers,
    };

    return fetch(url, {
      ...options,
      headers,
    });
  };

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
      const response = await makeAPICall('http://localhost:3000/api/test');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      updateResult(testName, { success: true, data: { ...data, mode: testMode } });
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
      const response = await makeAPICall(`http://localhost:3000/api/pluggy/summary/${therapistId}`);

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
      const response = await makeAPICall('http://localhost:3000/api/pluggy/connect-token', {
        method: 'POST',
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

  const connectBankAccount = async () => {
    const testName = 'bankConnection';
    setLoadingState(testName, true);

    // Handle mock mode
    if (testMode === 'mock') {
      updateResult(testName, { success: true, data: 'Simulating bank connection...' });
      
      setTimeout(() => {
        updateResult(testName, { 
          success: true, 
          data: {
            message: 'Mock bank account connected successfully!',
            itemId: 'mock_item_1',
            accounts: [{ id: 'mock_account_1', type: 'BANK', subtype: 'CHECKING' }],
            mode: 'mock'
          }
        });
      }, 2000);
      return;
    }

    // For sandbox/production modes, load Pluggy script on demand
    try {
      updateResult(testName, { success: true, data: 'Loading Pluggy Connect...' });
      
      const scriptLoaded = await loadPluggyScript();
      if (!scriptLoaded || !window.PluggyConnect) {
        throw new Error('Failed to load Pluggy Connect script');
      }

      // Step 1: Get connect token
      updateResult(testName, { success: true, data: 'Creating connect token...' });
      
      const tokenResponse = await makeAPICall('http://localhost:3000/api/pluggy/connect-token', {
        method: 'POST',
        body: JSON.stringify({ therapistId }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(`Failed to get connect token: ${tokenResponse.status} - ${errorData.error}`);
      }

      const tokenData = await tokenResponse.json();
      console.log('Connect token received:', tokenData);

      updateResult(testName, { success: true, data: `Opening Pluggy Connect (${testMode} mode)...` });

      // Step 2: Initialize Pluggy Connect
      const pluggyConnect = new window.PluggyConnect({
        connectToken: tokenData.connect_token,
        includeSandbox: testMode === 'sandbox', // Only include sandbox banks in sandbox mode
        onSuccess: async (data: any) => {
          console.log('Bank connection successful!', data);
          updateResult(testName, { success: true, data: 'Bank connected! Storing connection...' });
          
          try {
            // Step 3: Store each connected account
            for (const account of data.accounts) {
              const storeResponse = await makeAPICall('http://localhost:3000/api/pluggy/store-connection', {
                method: 'POST',
                body: JSON.stringify({
                  therapistId: therapistId,
                  itemId: data.itemId,
                  accountId: account.id
                })
              });

              if (!storeResponse.ok) {
                const errorData = await storeResponse.json();
                throw new Error(`Failed to store connection: ${storeResponse.status} - ${errorData.error}`);
              }

              console.log(`Stored connection for account ${account.id}`);
            }

            updateResult(testName, { 
              success: true, 
              data: {
                message: `Bank account connected successfully in ${testMode} mode!`,
                itemId: data.itemId,
                accounts: data.accounts.map((acc: any) => ({
                  id: acc.id,
                  type: acc.type,
                  subtype: acc.subtype
                })),
                mode: testMode
              }
            });

            // Step 4: Automatically process transactions after connection
            setTimeout(() => {
              processTransactions();
            }, 2000);

          } catch (error) {
            console.error('Error storing connection:', error);
            updateResult(testName, { 
              success: false, 
              error: `Error storing connection: ${error instanceof Error ? error.message : 'Unknown error'}` 
            });
          }
        },
        onError: (error: any) => {
          console.error('Bank connection failed:', error);
          updateResult(testName, { 
            success: false, 
            error: `Connection failed: ${error.message || 'Unknown error'}` 
          });
        },
        onExit: () => {
          console.log('User closed Pluggy Connect');
          updateResult(testName, { 
            success: false, 
            error: 'Connection cancelled by user' 
          });
        }
      });

      // Step 5: Open the connection flow
      pluggyConnect.open();

    } catch (error) {
      console.error('Error in bank connection flow:', error);
      updateResult(testName, { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  };

  const processTransactions = async () => {
    const testName = 'processTransactions';
    setLoadingState(testName, true);
    
    try {
      const response = await makeAPICall('http://localhost:3000/api/pluggy/process-transactions', {
        method: 'POST',
        body: JSON.stringify({ therapistId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      updateResult(testName, { success: true, data: { ...data, mode: testMode } });
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
      const response = await makeAPICall(`http://localhost:3000/api/pluggy/connections/${therapistId}`);

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
      const response = await makeAPICall(`http://localhost:3000/api/pluggy/transactions/${therapistId}`);

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
      const response = await makeAPICall(`http://localhost:3000/api/pluggy/unmatched-transactions/${therapistId}`);

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
          <Text style={styles.label}>Test Mode:</Text>
          <View style={styles.dropdownContainer}>
            <Pressable 
              style={styles.dropdown}
              onPress={() => {
                // Simple mode cycling for React Native Web
                const modes: TestMode[] = ['mock', 'sandbox', 'production'];
                const currentIndex = modes.indexOf(testMode);
                const nextIndex = (currentIndex + 1) % modes.length;
                setTestMode(modes[nextIndex]);
              }}
            >
              <Text style={styles.dropdownText}>
                {testMode === 'mock' && '🎭 Mock Mode'}
                {testMode === 'sandbox' && '🧪 Sandbox Mode'}  
                {testMode === 'production' && '🚀 Production Mode'}
              </Text>
              <Text style={styles.dropdownArrow}>⌄</Text>
            </Pressable>
            <Text style={styles.modeDescription}>
              {testMode === 'mock' && 'Uses fake data for testing UI components'}
              {testMode === 'sandbox' && 'Uses Pluggy sandbox banks with test data'}
              {testMode === 'production' && 'Uses real Pluggy API with live banks'}
            </Text>
          </View>
        </View>

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
        
        {testMode === 'mock' && (
          <Text style={styles.infoText}>ℹ️ Mock mode - no external connections needed</Text>
        )}
        {testMode !== 'mock' && (
          <Text style={styles.infoText}>ℹ️ Pluggy Connect will load when you click "Connect Bank Account"</Text>
        )}
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
        <Text style={styles.sectionTitle}>🆕 4. Connect Bank Account</Text>
        <Text style={styles.description}>
          {testMode === 'mock' && 'Mock mode - this will simulate a bank connection'}
          {testMode === 'sandbox' && 'Connect a sandbox bank account using Pluggy Connect'}
          {testMode === 'production' && 'Connect a real bank account using Pluggy Connect'}
        </Text>
        <Pressable 
          style={[
            styles.button, 
            styles.connectButton,
            loading.bankConnection && styles.buttonDisabled
          ]} 
          onPress={connectBankAccount}
          disabled={loading.bankConnection}
        >
          <Text style={styles.buttonText}>
            {loading.bankConnection ? 'Connecting...' : `🏦 Connect Bank Account (${testMode})`}
          </Text>
        </Pressable>
        <ResultDisplay testName="bankConnection" title="Bank Connection" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5. Process Transactions</Text>
        <Text style={styles.description}>Manually trigger transaction processing:</Text>
        <Pressable 
          style={[styles.button, loading.processTransactions && styles.buttonDisabled]} 
          onPress={processTransactions}
          disabled={loading.processTransactions}
        >
          <Text style={styles.buttonText}>
            {loading.processTransactions ? 'Processing...' : 'Process Transactions'}
          </Text>
        </Pressable>
        <ResultDisplay testName="processTransactions" title="Process Transactions" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>6. Bank Connections</Text>
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
        <Text style={styles.sectionTitle}>7. Transactions</Text>
        <Text style={styles.description}>View all matched transactions:</Text>
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
        <Text style={styles.sectionTitle}>8. Unmatched Transactions</Text>
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
  connectButton: {
    backgroundColor: '#28a745', // Green for bank connection
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
  warningText: {
    fontSize: 14,
    color: '#ffc107',
    marginTop: 10,
  },
  successText: {
    fontSize: 14,
    color: '#28a745',
    marginTop: 10,
  },
  dropdownContainer: {
    marginBottom: 10,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    padding: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: '#495057',
  },
  dropdownArrow: {
    fontSize: 16,
    color: '#6c757d',
  },
  modeDescription: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 5,
    fontStyle: 'italic',
  },
  infoText: {
    fontSize: 14,
    color: '#17a2b8',
    marginTop: 10,
  },
});