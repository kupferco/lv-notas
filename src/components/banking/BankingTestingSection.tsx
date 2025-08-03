// src/components/banking/BankingTestingSection.tsx
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput } from 'react-native';

declare global {
  interface Window {
    PluggyConnect: any;
  }
}

type TestMode = 'mock' | 'sandbox' | 'production';

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  step?: string;
}

export const BankingTestingSection: React.FC = () => {
  const [testMode, setTestMode] = useState<TestMode>('mock');
  const [therapistId, setTherapistId] = useState('1');
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  const [allTransactionsResult, setAllTransactionsResult] = useState<TestResult | null>(null);
  const [potentialMatchesResult, setPotentialMatchesResult] = useState<TestResult | null>(null);
  const [loadingAll, setLoadingAll] = useState(false);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Helper function to make API calls
  const makeAPICall = async (url: string, options: RequestInit = {}) => {
    const headers = {
      'X-API-Key': process.env.SAFE_PROXY_API_KEY || '',
      'Content-Type': 'application/json',
      'X-Test-Mode': testMode,
      ...options.headers,
    };

    return fetch(url, {
      ...options,
      headers,
    });
  };

  // Set quick date ranges
  const setThisMonth = () => {
    const now = new Date();
    setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
    setEndDate(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]);
  };

  const setLastMonth = () => {
    const now = new Date();
    setStartDate(new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]);
    setEndDate(new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]);
  };

  const setLast3Months = () => {
    const now = new Date();
    setStartDate(new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().split('T')[0]);
    setEndDate(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]);
  };

  const setJuly2025 = () => {
    setStartDate('2025-07-01');
    setEndDate('2025-07-31');
  };

  // Load all transactions in timeframe
  const loadAllTransactions = async () => {
    setLoadingAll(true);
    setAllTransactionsResult(null);

    try {
      // Step 1: Check API connectivity
      setAllTransactionsResult({ success: true, step: 'Testing API connection...' });

      const testResponse = await makeAPICall('http://localhost:3000/api/test');
      if (!testResponse.ok) {
        throw new Error(`API connection failed: ${testResponse.status} ${testResponse.statusText}`);
      }

      // Step 2: Get/create connect token if needed
      setAllTransactionsResult({ success: true, step: 'Getting connect token...' });

      const tokenResponse = await makeAPICall('http://localhost:3000/api/pluggy/connect-token', {
        method: 'POST',
        body: JSON.stringify({ therapistId }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(`Connect token failed: ${tokenResponse.status} - ${errorData.error}`);
      }

      // Step 3: Load all transactions (DEV MODE ONLY)
      setAllTransactionsResult({ success: true, step: 'Loading all raw transactions...' });

      const transactionsResponse = await makeAPICall(
        `http://localhost:3000/api/pluggy/all-transactions/${therapistId}?start=${startDate}&end=${endDate}`
      );

      if (!transactionsResponse.ok) {
        const errorData = await transactionsResponse.json();
        throw new Error(`Load transactions failed: ${transactionsResponse.status} - ${errorData.error}`);
      }

      const data = await transactionsResponse.json();
      setAllTransactionsResult({
        success: true,
        data: {
          ...data,
          mode: testMode
        }
      });

    } catch (error) {
      setAllTransactionsResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoadingAll(false);
    }
  };

  // Load potential matches in timeframe
  const loadPotentialMatches = async () => {
    setLoadingMatches(true);
    setPotentialMatchesResult(null);

    try {
      // Step 1: Check API connectivity
      setPotentialMatchesResult({ success: true, step: 'Testing API connection...' });

      const testResponse = await makeAPICall('http://localhost:3000/api/test');
      if (!testResponse.ok) {
        throw new Error(`API connection failed: ${testResponse.status} ${testResponse.statusText}`);
      }

      // Step 2: Get/create connect token if needed
      setPotentialMatchesResult({ success: true, step: 'Getting connect token...' });

      const tokenResponse = await makeAPICall('http://localhost:3000/api/pluggy/connect-token', {
        method: 'POST',
        body: JSON.stringify({ therapistId }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(`Connect token failed: ${tokenResponse.status} - ${errorData.error}`);
      }

      // Step 3: Load potential matches
      setPotentialMatchesResult({ success: true, step: 'Finding potential payment matches...' });

      const matchesResponse = await makeAPICall(
        `http://localhost:3000/api/pluggy/potential-matches/${therapistId}?start=${startDate}&end=${endDate}`
      );

      if (!matchesResponse.ok) {
        const errorData = await matchesResponse.json();
        throw new Error(`Load potential matches failed: ${matchesResponse.status} - ${errorData.error}`);
      }

      const data = await matchesResponse.json();
      setPotentialMatchesResult({
        success: true,
        data: {
          ...data,
          mode: testMode
        }
      });

    } catch (error) {
      setPotentialMatchesResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoadingMatches(false);
    }
  };

  const ResultDisplay: React.FC<{ result: TestResult | null; title: string }> = ({ result, title }) => {
    if (!result) return null;

    return (
      <View style={styles.resultContainer}>
        <Text style={styles.resultTitle}>{title}</Text>
        <View style={[styles.resultBox, result.success ? styles.successBox : styles.errorBox]}>
          <Text style={styles.resultText}>
            {result.step && result.success
              ? result.step
              : result.success
                ? JSON.stringify(result.data, null, 2)
                : `❌ ${result.error}`
            }
          </Text>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🏦 Banking Test</Text>
        <Text style={styles.subtitle}>Test payment matching and raw transaction access</Text>
      </View>

      {/* Configuration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configuration</Text>

        <View style={styles.row}>
          <View style={styles.field}>
            <Text style={styles.label}>Test Mode:</Text>
            <Pressable
              style={styles.dropdown}
              onPress={() => {
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
          </View>

          <View style={styles.field}>
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
      </View>

      {/* Time Frame */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Time Frame</Text>

        <View style={styles.row}>
          <View style={styles.field}>
            <Text style={styles.label}>Start Date:</Text>
            <TextInput
              style={styles.input}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>End Date:</Text>
            <TextInput
              style={styles.input}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
            />
          </View>
        </View>

        <View style={styles.quickButtons}>
          <Pressable style={styles.quickButton} onPress={setThisMonth}>
            <Text style={styles.quickButtonText}>This Month</Text>
          </Pressable>
          <Pressable style={styles.quickButton} onPress={setLastMonth}>
            <Text style={styles.quickButtonText}>Last Month</Text>
          </Pressable>
          <Pressable style={styles.quickButton} onPress={setLast3Months}>
            <Text style={styles.quickButtonText}>Last 3 Months</Text>
          </Pressable>
          <Pressable style={[styles.quickButton, styles.testButton]} onPress={setJuly2025}>
            <Text style={styles.quickButtonText}>🧪 July 2025 (Test)</Text>
          </Pressable>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Actions</Text>

        <View style={styles.actionButtons}>
          <Pressable
            style={[styles.primaryButton, loadingMatches && styles.buttonDisabled]}
            onPress={loadPotentialMatches}
            disabled={loadingMatches}
          >
            <Text style={styles.buttonText}>
              {loadingMatches ? 'Loading...' : '🔍 Find Potential Matches'}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.secondaryButton, loadingAll && styles.buttonDisabled]}
            onPress={loadAllTransactions}
            disabled={loadingAll}
          >
            <Text style={styles.buttonText}>
              {loadingAll ? 'Loading...' : '📊 Load Raw Data (Dev)'}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.helpText}>
          💡 Use "Find Potential Matches" to test the intelligent payment matching system.{'\n'}
          💡 Use "Load Raw Data" to see all transaction data (development mode only).
        </Text>
      </View>

      {/* Results */}
      <View style={styles.resultsContainer}>
        <ResultDisplay
          result={potentialMatchesResult}
          title="🔍 Potential Payment Matches"
        />

        <ResultDisplay
          result={allTransactionsResult}
          title="📊 Raw Transaction Data (Dev)"
        />
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
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    color: '#212529',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#495057',
    fontWeight: 'bold',
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
    gap: 20,
    flexWrap: 'wrap',
  },
  field: {
    flex: 1,
    minWidth: 200,
  },
  label: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 5,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#fff',
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
  quickButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
    flexWrap: 'wrap',
  },
  quickButton: {
    padding: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
  },
  testButton: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
  },
  quickButtonText: {
    fontSize: 14,
    color: '#495057',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 15,
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  primaryButton: {
    padding: 15,
    paddingHorizontal: 30,
    backgroundColor: '#28a745',
    borderRadius: 8,
    flex: 1,
    minWidth: 200,
    alignItems: 'center',
  },
  secondaryButton: {
    padding: 15,
    paddingHorizontal: 30,
    backgroundColor: '#007cba',
    borderRadius: 8,
    flex: 1,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#6c757d',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  helpText: {
    fontSize: 14,
    color: '#6c757d',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  resultsContainer: {
    padding: 15,
    gap: 20,
  },
  resultContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultTitle: {
    fontSize: 16,
    color: '#495057',
    fontWeight: 'bold',
    marginBottom: 15,
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
});