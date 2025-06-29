// src/components/onboarding/WizardSummary.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import type { ImportStats, PatientData } from '../../types/onboarding';

interface WizardSummaryProps {
  stats: ImportStats;
  processedPatients: PatientData[];
  onComplete: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

export const WizardSummary: React.FC<WizardSummaryProps> = ({
  stats,
  processedPatients,
  onComplete,
  onCancel,
  isLoading
}) => {
  const formatCurrency = (cents: number): string => {
    return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
  };

  const formatPhone = (phone: string): string => {
    if (phone.length === 11) {
      return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
    }
    if (phone.length === 10) {
      return `(${phone.slice(0, 2)}) ${phone.slice(2, 6)}-${phone.slice(6)}`;
    }
    return phone;
  };

  const totalSessions = processedPatients.reduce((total, patient) => total + patient.sessions.length, 0);
  const totalRevenue = processedPatients.reduce((total, patient) => 
    total + (patient.sessions.length * patient.sessionPrice), 0
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Importando dados...</Text>
        <Text style={styles.loadingSubtext}>
          Criando {processedPatients.length} pacientes e {totalSessions} sessões
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Success Header */}
        <View style={styles.header}>
          <Text style={styles.successIcon}>🎉</Text>
          <Text style={styles.title}>Importação Concluída!</Text>
          <Text style={styles.subtitle}>
            Seus dados foram processados com sucesso
          </Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{processedPatients.length}</Text>
            <Text style={styles.statLabel}>Pacientes</Text>
            <Text style={styles.statIcon}>👥</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{totalSessions}</Text>
            <Text style={styles.statLabel}>Sessões</Text>
            <Text style={styles.statIcon}>📅</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{formatCurrency(totalRevenue)}</Text>
            <Text style={styles.statLabel}>Receita Total</Text>
            <Text style={styles.statIcon}>💰</Text>
          </View>
        </View>

        {/* Additional Stats */}
        {stats.skipped > 0 && (
          <View style={styles.skippedInfo}>
            <Text style={styles.skippedText}>
              ⏭️ {stats.skipped} eventos foram pulados
            </Text>
          </View>
        )}

        {/* Patients List */}
        <View style={styles.patientsSection}>
          <Text style={styles.sectionTitle}>👥 Pacientes Importados</Text>
          
          {processedPatients.map((patient, index) => (
            <View key={index} style={styles.patientCard}>
              <View style={styles.patientHeader}>
                <Text style={styles.patientName}>{patient.name}</Text>
                <Text style={styles.patientPrice}>{formatCurrency(patient.sessionPrice)}</Text>
              </View>
              
              <View style={styles.patientDetails}>
                <Text style={styles.patientInfo}>📧 {patient.email}</Text>
                <Text style={styles.patientInfo}>📱 {formatPhone(patient.phone)}</Text>
                <Text style={styles.patientInfo}>
                  📅 {patient.sessions.length} sessão{patient.sessions.length !== 1 ? 's' : ''}
                </Text>
                <Text style={styles.patientInfo}>
                  💳 Cobrança LV Notas desde: {new Date(patient.lvNotasBillingStartDate).toLocaleDateString('pt-BR')}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* What's Next Section */}
        <View style={styles.nextStepsSection}>
          <Text style={styles.sectionTitle}>🚀 Próximos Passos</Text>
          
          <View style={styles.nextStepsList}>
            <Text style={styles.nextStep}>
              ✅ Seus pacientes já estão no sistema
            </Text>
            <Text style={styles.nextStep}>
              ✅ As sessões foram sincronizadas com o calendário
            </Text>
            <Text style={styles.nextStep}>
              ✅ Você pode começar a gerenciar pagamentos
            </Text>
            <Text style={styles.nextStep}>
              ✅ Novos eventos do calendário serão sincronizados automaticamente
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <Pressable style={styles.completeButton} onPress={onComplete}>
            <Text style={styles.completeButtonText}>🎯 Ir para o App</Text>
          </Pressable>
        </View>

        {/* Additional Help */}
        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>💡 Dica</Text>
          <Text style={styles.helpText}>
            Agora você pode acessar "Pagamentos" para ver o status financeiro 
            dos seus pacientes e enviar lembretes via WhatsApp.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    color: '#212529',
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 8,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 16,
  },
  skippedInfo: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  skippedText: {
    fontSize: 14,
    color: '#856404',
  },
  patientsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  patientCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  patientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  patientPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6200ee',
  },
  patientDetails: {
    gap: 4,
  },
  patientInfo: {
    fontSize: 14,
    color: '#6c757d',
  },
  nextStepsSection: {
    marginBottom: 32,
  },
  nextStepsList: {
    backgroundColor: '#d1ecf1',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#6200ee',
  },
  nextStep: {
    fontSize: 14,
    color: '#0c5460',
    marginBottom: 8,
    lineHeight: 20,
  },
  actionContainer: {
    marginBottom: 24,
  },
  completeButton: {
    backgroundColor: '#6200ee',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeButtonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  helpSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#155724',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#155724',
    lineHeight: 20,
  },
});