// src/components/payments/PaymentSystemNavigator.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { apiService } from '../../services/api';

// Import both payment systems
import { PaymentsOverview } from './PaymentsOverview';
import { MonthlyBillingOverview } from './monthly/MonthlyBillingOverview';

// Payment system modes
type PaymentSystemMode = 'current' | 'calendar-only';

export const PaymentSystemNavigator = () => {
  const { user } = useAuth();

  // State for navigation
  const [paymentSystemMode, setPaymentSystemMode] = useState<PaymentSystemMode>('calendar-only');
  
  // State for monthly billing date selection
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);

  // Generate year options (current year and previous 2 years)
  const yearOptions = [
    selectedYear,
    selectedYear - 1,
    selectedYear - 2
  ];

  // Generate month options
  const monthOptions = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ];

  const getCurrentTherapistEmailForMode = () => {
    return user?.email || apiService.getCurrentTherapistEmail() || '';
  };

  const getSystemModeInfo = (mode: PaymentSystemMode) => {
    switch (mode) {
      case 'current':
        return {
          title: '💰 Sistema Atual (Baseado em Sessões)',
          description: 'Sistema tradicional com sessões do banco de dados e pagamentos por sessão',
          features: [
            'Sessões do banco de dados PostgreSQL',
            'Pagamentos por sessão individual',
            'Auto check-in opcional',
            'Modos Simples e Avançado',
            'WhatsApp por sessão'
          ]
        };
      case 'calendar-only':
        return {
          title: '📅 Sistema Calendário-Only (Cobrança Mensal)',
          description: 'Sistema moderno que lê sessões apenas do Google Calendar e faz cobrança mensal',
          features: [
            'Sessões lidas do Google Calendar (tempo real)',
            'Cobrança mensal com snapshot imutável',
            'Workflow Processar → Pagar → Protegido',
            'Auditoria completa preservada',
            'WhatsApp mensal profissional'
          ]
        };
    }
  };

  const currentModeInfo = getSystemModeInfo(paymentSystemMode);

  return (
    <View style={styles.container}>
      

      {/* Monthly Billing Date Selector (only for calendar-only mode) */}
      {paymentSystemMode === 'calendar-only' && (
        <View style={styles.dateSelector}>
          <Text style={styles.dateSelectorTitle}>📅 Período de Cobrança</Text>
          
          <View style={styles.dateControls}>
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>Mês:</Text>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                style={styles.dateSelect as any}
              >
                {monthOptions.map(month => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </View>

            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>Ano:</Text>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                style={styles.dateSelect as any}
              >
                {yearOptions.map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </View>
          </View>

          {/* <Text style={styles.selectedPeriod}>
            Período selecionado: {monthOptions.find(m => m.value === selectedMonth)?.label} de {selectedYear}
          </Text> */}
        </View>
      )}

      

      {/* Render Selected Payment System */}
      <View style={styles.systemContainer}>
        {paymentSystemMode === 'current' ? (
          <PaymentsOverview />
        ) : (
          <MonthlyBillingOverview
            therapistEmail={getCurrentTherapistEmailForMode()}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  navigationHeader: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  navigationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  navigationSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  modeSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  modeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#dee2e6',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  modeButtonActive: {
    borderColor: '#007bff',
    backgroundColor: '#e7f1ff',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6c757d',
  },
  modeButtonTextActive: {
    color: '#007bff',
  },
  infoCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  infoDescription: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 12,
    lineHeight: 20,
  },
  featuresList: {
    marginTop: 8,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 6,
  },
  featureItem: {
    fontSize: 13,
    color: '#6c757d',
    marginBottom: 3,
    paddingLeft: 8,
  },
  dateSelector: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  dateSelectorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 12,
  },
  dateControls: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  dateField: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 4,
  },
  dateSelect: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    paddingHorizontal: 8,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  selectedPeriod: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  migrationBanner: {
    backgroundColor: '#e7f1ff',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007bff',
  },
  migrationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 6,
  },
  migrationText: {
    fontSize: 13,
    color: '#495057',
    marginBottom: 6,
    lineHeight: 18,
  },
  migrationNote: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  systemContainer: {
    flex: 1,
  },
});

export default PaymentSystemNavigator;