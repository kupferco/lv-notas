// src/components/banking/BankingManagement.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

interface BankConnection {
  id: number;
  bank_name: string;
  account_type: string;
  account_holder_name: string;
  status: string;
  last_sync_at: string;
  created_at: string;
  error_count: number;
  last_error?: string;
}

interface BankingSummary {
  therapist_id: number;
  therapist_name: string;
  connected_accounts: number;
  total_transactions: number;
  unmatched_transactions: number;
  total_matches: number;
  confirmed_matches: number;
  confirmed_revenue: number;
  unmatched_revenue: number;
  last_transaction_date: string | null;
}

interface UnmatchedTransaction {
  transaction_id: number;
  amount: number;
  description: string;
  transaction_date: string;
  pix_sender_name: string;
  pix_sender_cpf: string;
  bank_name: string;
  suggested_patient_id: number | null;
  suggested_patient_name: string | null;
  expected_session_price: number | null;
  match_confidence: number;
}

export const BankingManagement: React.FC = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<BankingSummary | null>(null);
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [unmatchedTransactions, setUnmatchedTransactions] = useState<UnmatchedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Mock therapist ID - in real app, get from user context
  const therapistId = 1;

  const apiCall = async (endpoint: string, method = 'GET', body?: any) => {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.SAFE_PROXY_API_KEY || '',
      },
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`http://localhost:3000/api${endpoint}`, options);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
    return response.json();
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load banking summary
      const summaryData = await apiCall(`/pluggy/summary/${therapistId}`);
      setSummary(summaryData);
      
      // Load bank connections
      const connectionsData = await apiCall(`/pluggy/connections/${therapistId}`);
      setConnections(connectionsData);
      
      // Load unmatched transactions
      const unmatchedData = await apiCall(`/pluggy/unmatched-transactions/${therapistId}`);
      setUnmatchedTransactions(unmatchedData);
      
    } catch (error) {
      console.error('Error loading banking data:', error);
      Alert.alert('Erro', 'Falha ao carregar dados bancários');
    } finally {
      setLoading(false);
    }
  };

  const connectBank = async () => {
    try {
      setRefreshing(true);
      const tokenResponse = await apiCall('/pluggy/connect-token', 'POST', {
        therapistId: therapistId.toString()
      });
      
      Alert.alert(
        'Conectar Banco',
        `Token de conexão gerado:\n\n${tokenResponse.connect_token}\n\nEm um app real, isso abriria o fluxo de conexão do Pluggy.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // In a real app, this would open Pluggy's connect flow
              // For now, simulate a successful connection
              setTimeout(() => {
                loadData(); // Reload data
              }, 1000);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error creating connect token:', error);
      Alert.alert('Erro', 'Falha ao criar token de conexão');
    } finally {
      setRefreshing(false);
    }
  };

  const syncTransactions = async () => {
    try {
      setRefreshing(true);
      await apiCall('/pluggy/sync-transactions', 'POST', {
        therapistId: therapistId.toString()
      });
      
      Alert.alert('Sucesso', 'Transações sincronizadas com sucesso!');
      loadData(); // Reload data
    } catch (error) {
      console.error('Error syncing transactions:', error);
      Alert.alert('Erro', 'Falha ao sincronizar transações');
    } finally {
      setRefreshing(false);
    }
  };

  const handleMatchTransaction = (transaction: UnmatchedTransaction) => {
    if (transaction.suggested_patient_id) {
      Alert.alert(
        'Confirmar Pagamento',
        `Confirmar pagamento de R$ ${transaction.amount.toFixed(2)} de ${transaction.pix_sender_name} para ${transaction.suggested_patient_name}?\n\nConfiança: ${Math.round(transaction.match_confidence * 100)}%`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Confirmar',
            onPress: () => {
              // TODO: Implement match creation
              Alert.alert('Sucesso', 'Pagamento confirmado! (Mock)');
              loadData();
            }
          }
        ]
      );
    } else {
      Alert.alert(
        'Sem Sugestão',
        'Nenhuma correspondência automática encontrada. Você pode criar uma correspondência manual na tela de transações.',
        [{ text: 'OK' }]
      );
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Carregando dados bancários...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>💳 Gestão Bancária</Text>
        <Text style={styles.subtitle}>Conecte suas contas e acompanhe pagamentos automaticamente</Text>
      </View>

      {/* Summary Cards */}
      {summary && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.connected_accounts}</Text>
            <Text style={styles.summaryLabel}>Contas Conectadas</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>R$ {Number(summary.confirmed_revenue || 0).toFixed(2)}</Text>
            <Text style={styles.summaryLabel}>Receita Confirmada</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.unmatched_transactions}</Text>
            <Text style={styles.summaryLabel}>Pagamentos Pendentes</Text>
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ações Rápidas</Text>
        <View style={styles.buttonRow}>
          <Pressable 
            style={[styles.actionButton, styles.primaryButton]} 
            onPress={connectBank}
            disabled={refreshing}
          >
            <Text style={styles.actionButtonText}>
              {refreshing ? 'Conectando...' : '+ Conectar Banco'}
            </Text>
          </Pressable>
          <Pressable 
            style={[styles.actionButton, styles.secondaryButton]} 
            onPress={syncTransactions}
            disabled={refreshing}
          >
            <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
              {refreshing ? 'Sincronizando...' : '🔄 Sincronizar'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Bank Connections */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contas Conectadas</Text>
        {connections.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Nenhuma conta conectada</Text>
            <Text style={styles.emptyStateSubtext}>Conecte uma conta bancária para começar a receber notificações automáticas de pagamento</Text>
          </View>
        ) : (
          connections.map((connection) => (
            <View key={connection.id} style={styles.connectionCard}>
              <View style={styles.connectionHeader}>
                <Text style={styles.connectionBankName}>{connection.bank_name}</Text>
                <View style={[
                  styles.statusBadge, 
                  connection.status === 'active' ? styles.statusActive : styles.statusError
                ]}>
                  <Text style={styles.statusText}>
                    {connection.status === 'active' ? 'Ativa' : 'Erro'}
                  </Text>
                </View>
              </View>
              <Text style={styles.connectionDetails}>
                {connection.account_type} • {connection.account_holder_name}
              </Text>
              <Text style={styles.connectionDate}>
                Última sincronização: {new Date(connection.last_sync_at).toLocaleDateString('pt-BR')}
              </Text>
              {connection.last_error && (
                <Text style={styles.errorText}>Erro: {connection.last_error}</Text>
              )}
            </View>
          ))
        )}
      </View>

      {/* Unmatched Transactions */}
      {unmatchedTransactions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pagamentos Pendentes</Text>
          <Text style={styles.sectionSubtitle}>
            Transações que precisam ser confirmadas ou associadas a pacientes
          </Text>
          {unmatchedTransactions.map((transaction) => (
            <View key={transaction.transaction_id} style={styles.transactionCard}>
              <View style={styles.transactionHeader}>
                <Text style={styles.transactionAmount}>R$ {Number(transaction.amount || 0).toFixed(2)}</Text>
                <Text style={styles.transactionDate}>
                  {new Date(transaction.transaction_date).toLocaleDateString('pt-BR')}
                </Text>
              </View>
              <Text style={styles.transactionDescription}>{transaction.description}</Text>
              <Text style={styles.transactionSender}>
                De: {transaction.pix_sender_name} ({transaction.pix_sender_cpf})
              </Text>
              
              {transaction.suggested_patient_name && (
                <View style={styles.suggestionContainer}>
                  <Text style={styles.suggestionLabel}>Sugestão:</Text>
                  <Text style={styles.suggestionText}>
                    {transaction.suggested_patient_name} (
                    {Math.round((transaction.match_confidence || 0) * 100)}% confiança)
                  </Text>
                </View>
              )}
              
              <Pressable 
                style={styles.matchButton}
                onPress={() => handleMatchTransaction(transaction)}
              >
                <Text style={styles.matchButtonText}>
                  {transaction.suggested_patient_name ? 'Confirmar Pagamento' : 'Associar Manualmente'}
                </Text>
              </Pressable>
            </View>
          ))}
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
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6c757d',
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
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007cba',
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    margin: 15,
    marginTop: 0,
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
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007cba',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007cba',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButtonText: {
    color: '#007cba',
  },
  emptyState: {
    alignItems: 'center',
    padding: 30,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#495057',
    fontWeight: '500',
    marginBottom: 5,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 20,
  },
  connectionCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  connectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  connectionBankName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: '#d4edda',
  },
  statusError: {
    backgroundColor: '#f8d7da',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#495057',
  },
  connectionDetails: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
  connectionDate: {
    fontSize: 12,
    color: '#6c757d',
  },
  errorText: {
    fontSize: 12,
    color: '#dc3545',
    marginTop: 4,
  },
  transactionCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745',
  },
  transactionDate: {
    fontSize: 14,
    color: '#6c757d',
  },
  transactionDescription: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 4,
  },
  transactionSender: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 10,
  },
  suggestionContainer: {
    backgroundColor: '#e3f2fd',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  suggestionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 2,
  },
  suggestionText: {
    fontSize: 14,
    color: '#1976d2',
  },
  matchButton: {
    backgroundColor: '#007cba',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  matchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});