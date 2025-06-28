// src/components/PaymentsOverview.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../contexts/AuthContext';

// Types for the payments data
interface PatientPaymentSummary {
  patient_id: number;
  patient_name: string;
  total_sessions: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  billing_cycle: string;
  last_session_date: string;
  payment_requested: boolean; // NEW: Track if payment has been requested
  payment_request_date?: string; // NEW: When payment was requested
}

interface SessionPaymentDetail {
  session_id: number;
  session_date: string;
  patient_name: string;
  patient_id: number;
  session_price: number;
  payment_status: 'paid' | 'pending' | 'overdue';
  days_since_session: number;
}

interface PaymentsSummary {
  total_revenue: number;
  paid_revenue: number;
  pending_revenue: number;
  total_sessions: number;
  paid_sessions: number;
  pending_sessions: number;
}

export const PaymentsOverview = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<'patient' | 'session'>('patient');
  
  // Date filtering state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [quickFilter, setQuickFilter] = useState('current_month');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'todos' | 'nao_cobrado' | 'aguardando_pagamento' | 'pago' | 'pendente'>('todos');
  
  // Data state
  const [patientSummaries, setPatientSummaries] = useState<PatientPaymentSummary[]>([]);
  const [sessionDetails, setSessionDetails] = useState<SessionPaymentDetail[]>([]);
  const [paymentsSummary, setPaymentsSummary] = useState<PaymentsSummary | null>(null);

  // Initialize dates on component mount - FIXED: Current month = 1st to last day
  useEffect(() => {
    const today = new Date();
    const firstDayCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    setStartDate(formatDate(firstDayCurrentMonth));
    setEndDate(formatDate(lastDayCurrentMonth));
  }, []);

  // Load data when dates or payment filter change
  useEffect(() => {
    if (startDate && endDate && user?.email) {
      loadPaymentsData();
    }
  }, [startDate, endDate, paymentStatusFilter, user?.email]);

  const formatDate = (date: Date): string => {
    // Format in local timezone instead of UTC
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // FIXED: Proper month calculations - 1st to last day
  const setQuickDateRange = (range: string) => {
    const today = new Date();
    let start: Date, end: Date;

    switch (range) {
      case 'current_month':
        // June 1 → June 30
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'last_month':
        // May 1 → May 31
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'last_3_months':
        // April 1 → June 30 (3 months: April, May, June)
        start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'last_6_months':
        // January 1 → June 30 (6 months: Jan, Feb, Mar, Apr, May, June)
        start = new Date(today.getFullYear(), today.getMonth() - 5, 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      default:
        return;
    }

    console.log(`Setting ${range}:`, { 
      start: start.toISOString().split('T')[0], 
      end: end.toISOString().split('T')[0] 
    });

    setStartDate(formatDate(start));
    setEndDate(formatDate(end));
    setQuickFilter(range);
  };

  const loadPaymentsData = async () => {
    if (!user?.email) return;
    
    setLoading(true);
    try {
      // Enhanced mock data with different payment scenarios
      const today = new Date();
      const mockPatientSummaries: PatientPaymentSummary[] = [
        {
          patient_id: 1,
          patient_name: 'Maria Silva',
          total_sessions: 6,
          total_amount: 1080,
          paid_amount: 720,
          pending_amount: 360,
          billing_cycle: 'monthly',
          last_session_date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          payment_requested: false // Not requested yet - should show "Total de Sessões" + "Cobrar"
        },
        {
          patient_id: 2,
          patient_name: 'João Santos',
          total_sessions: 4,
          total_amount: 800,
          paid_amount: 800,
          pending_amount: 0,
          billing_cycle: 'weekly',
          last_session_date: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          payment_requested: false // Fully paid - should show "Pago" + no button
        },
        {
          patient_id: 3,
          patient_name: 'Ana Costa',
          total_sessions: 8,
          total_amount: 1440,
          paid_amount: 1080,
          pending_amount: 360,
          billing_cycle: 'monthly',
          last_session_date: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          payment_requested: true,
          payment_request_date: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Requested 3 days ago - should show "Aguardando Pagamento" + no button
        },
        {
          patient_id: 4,
          patient_name: 'Carlos Oliveira',
          total_sessions: 10,
          total_amount: 1800,
          paid_amount: 1260,
          pending_amount: 540,
          billing_cycle: 'monthly',
          last_session_date: new Date(today.getTime() - 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          payment_requested: true,
          payment_request_date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Requested 10 days ago - should show "Pendente" + "Enviar Lembrete"
        }
      ];

      const mockSessionDetails: SessionPaymentDetail[] = [
        {
          session_id: 1,
          session_date: '2025-06-25',
          patient_name: 'Maria Silva',
          patient_id: 1,
          session_price: 180,
          payment_status: 'pending',
          days_since_session: 2
        },
        {
          session_id: 2,
          session_date: '2025-06-24',
          patient_name: 'João Santos',
          patient_id: 2,
          session_price: 200,
          payment_status: 'paid',
          days_since_session: 3
        }
      ];

      const summary: PaymentsSummary = {
        total_revenue: mockPatientSummaries.reduce((sum, p) => sum + p.total_amount, 0),
        paid_revenue: mockPatientSummaries.reduce((sum, p) => sum + p.paid_amount, 0),
        pending_revenue: mockPatientSummaries.reduce((sum, p) => sum + p.pending_amount, 0),
        total_sessions: mockPatientSummaries.reduce((sum, p) => sum + p.total_sessions, 0),
        paid_sessions: mockSessionDetails.filter(s => s.payment_status === 'paid').length,
        pending_sessions: mockSessionDetails.filter(s => s.payment_status !== 'paid').length
      };

      setPatientSummaries(mockPatientSummaries);
      setSessionDetails(mockSessionDetails);
      setPaymentsSummary(summary);

    } catch (error) {
      console.error('Error loading payments data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return `R$ ${amount.toFixed(2).replace('.', ',')}`;
  };

  const getPaymentStatusDetails = (patient: PatientPaymentSummary) => {
    const PENDING_THRESHOLD_DAYS = 7; // This will be configurable later
    
    if (patient.pending_amount === 0) {
      return {
        status: 'pago',
        color: '#28a745',
        text: 'Pago',
        showButton: false,
        buttonText: '',
        buttonType: '',
        displayAmount: formatCurrency(patient.total_amount),
        amountLabel: 'Total'
      };
    }
    
    if (!patient.payment_requested) {
      // Payment hasn't been requested yet - show total sessions amount
      return {
        status: 'nao_cobrado',
        color: '#6c757d',
        text: 'Não Cobrado',
        showButton: true,
        buttonText: '💰 Cobrar',
        buttonType: 'invoice',
        displayAmount: formatCurrency(patient.pending_amount),
        amountLabel: 'A Cobrar'
      };
    }
    
    // Payment has been requested - check if it's overdue
    const daysSinceRequest = patient.payment_request_date 
      ? Math.floor((new Date().getTime() - new Date(patient.payment_request_date).getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    
    if (daysSinceRequest >= PENDING_THRESHOLD_DAYS) {
      return {
        status: 'pendente',
        color: '#dc3545',
        text: 'Pendente',
        showButton: true,
        buttonText: '📝 Enviar Lembrete',
        buttonType: 'reminder',
        displayAmount: formatCurrency(patient.pending_amount),
        amountLabel: 'Pendente'
      };
    } else {
      return {
        status: 'aguardando_pagamento',
        color: '#ffc107',
        text: 'Aguardando Pagamento',
        showButton: false, // No button during waiting period
        buttonText: '',
        buttonType: '',
        displayAmount: formatCurrency(patient.pending_amount),
        amountLabel: 'Aguardando'
      };
    }
  };

  const formatPhoneForWhatsApp = (phone: string): string => {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    
    // Ensure it starts with country code (55 for Brazil)
    if (digits.startsWith('55')) {
      return digits;
    } else if (digits.length === 11) {
      // Mobile number: add country code
      return `55${digits}`;
    } else if (digits.length === 10) {
      // Landline: add country code
      return `55${digits}`;
    }
    
    return digits;
  };

  const createWhatsAppLink = (phone: string, message: string): string => {
    const whatsappPhone = formatPhoneForWhatsApp(phone);
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${whatsappPhone}?text=${encodedMessage}`;
  };

  const handleStatusChange = async (patientId: number, newStatus: string) => {
    console.log(`Changing payment status for patient ${patientId} to ${newStatus}`);
    // TODO: API call to update payment status
    // For now, just show console log
  };

  const handleSendPaymentRequest = async (patient: PatientPaymentSummary) => {
    const message = `Olá ${patient.patient_name}!

Espero que esteja bem. Venho através desta mensagem solicitar o pagamento das suas sessões de terapia.

Detalhes do pagamento:
- ${patient.total_sessions} sessões realizadas
- Valor total: ${formatCurrency(patient.pending_amount)}

Para facilitar o pagamento:
- PIX: [seu_pix_aqui]
- Transferência bancária: [dados_bancarios]

O prazo para pagamento é de 7 dias. Qualquer dúvida, estou à disposição!

Obrigado(a)`;

    // For mock data, we'll create a generic phone
    const mockPhone = "447866750132"; // Replace with actual patient.telefone
    const whatsappLink = createWhatsAppLink(mockPhone, message);
    
    console.log(`Sending payment request to patient ${patient.patient_name}`);
    console.log(`WhatsApp link: ${whatsappLink}`);
    
    // TODO: Update patient payment_requested status in database
    // For now, just open WhatsApp
    if (typeof window !== 'undefined') {
      window.open(whatsappLink, '_blank');
    }
  };

  const handleChasePayment = async (patient: PatientPaymentSummary) => {
    const message = `Ola ${patient.patient_name},

Venho gentilmente lembrar sobre o pagamento pendente das suas sessoes de terapia.

Situacao:
- Valor em aberto: ${formatCurrency(patient.pending_amount)}
- Ultima sessao: ${new Date(patient.last_session_date).toLocaleDateString('pt-BR')}

Para manter a continuidade do nosso trabalho, peco que regularize a situacao o quanto antes.

Formas de pagamento:
- PIX: [seu_pix_aqui]
- Transferencia: [dados_bancarios]

Aguardo seu retorno. Obrigado(a)!`;

    // For mock data, we'll create a generic phone
    const mockPhone = "5511999999999"; // Replace with actual patient.telefone
    const whatsappLink = createWhatsAppLink(mockPhone, message);
    
    console.log(`Chasing payment for patient ${patient.patient_name}`);
    console.log(`WhatsApp link: ${whatsappLink}`);
    
    // Open WhatsApp
    if (typeof window !== 'undefined') {
      window.open(whatsappLink, '_blank');
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Carregando dados de pagamentos...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>💰 Visão Geral de Pagamentos</Text>
      </View>

      {/* Quick Filters */}
      <View style={styles.filtersContainer}>
        <Text style={styles.sectionLabel}>Período:</Text>
        <View style={styles.quickFilters}>
          {[
            { key: 'current_month', label: 'Mês Atual' },
            { key: 'last_month', label: 'Mês Passado' },
            { key: 'last_3_months', label: 'Últimos 3 Meses' },
            { key: 'last_6_months', label: 'Últimos 6 Meses' }
          ].map(filter => (
            <Pressable
              key={filter.key}
              style={[
                styles.quickFilterButton,
                quickFilter === filter.key && styles.quickFilterButtonActive
              ]}
              onPress={() => setQuickDateRange(filter.key)}
            >
              <Text style={[
                styles.quickFilterText,
                quickFilter === filter.key && styles.quickFilterTextActive
              ]}>
                {filter.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Date Range Display */}
        <View style={styles.dateRangeContainer}>
          <Text style={styles.dateLabel}>De: {startDate}</Text>
          <Text style={styles.dateLabel}>Até: {endDate}</Text>
        </View>
      </View>

      {/* Payment Status Filter - Moved below toggle */}
      <View style={styles.filtersContainer}>
        <Text style={styles.sectionLabel}>Status dos Pagamentos:</Text>
        <Picker
          style={styles.filterPicker}
          selectedValue={paymentStatusFilter}
          onValueChange={(value) => setPaymentStatusFilter(value)}
        >
          <Picker.Item label="📋 Todos" value="todos" />
          <Picker.Item label="📄 Não Cobrado" value="nao_cobrado" />
          <Picker.Item label="⏰ Aguardando Pagamento" value="aguardando_pagamento" />
          <Picker.Item label="✅ Pago" value="pago" />
          <Picker.Item label="🔔 Pendente" value="pendente" />
        </Picker>
      </View>

      {/* Summary Cards */}
      {paymentsSummary && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Receita Total</Text>
            <Text style={styles.summaryAmount}>{formatCurrency(paymentsSummary.total_revenue)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Pago</Text>
            <Text style={[styles.summaryAmount, { color: '#28a745' }]}>
              {formatCurrency(paymentsSummary.paid_revenue)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Pendente</Text>
            <Text style={[styles.summaryAmount, { color: '#ffc107' }]}>
              {formatCurrency(paymentsSummary.pending_revenue)}
            </Text>
          </View>
        </View>
      )}

      {/* FIXED: View Toggle (Toggle instead of Dropdown) */}
      <View style={styles.viewToggleContainer}>
        <Text style={styles.sectionLabel}>Visualização:</Text>
        <View style={styles.toggleContainer}>
          <Pressable
            style={[
              styles.toggleButton,
              styles.toggleButtonLeft,
              viewType === 'patient' && styles.toggleButtonActive
            ]}
            onPress={() => setViewType('patient')}
          >
            <Text style={[
              styles.toggleButtonText,
              viewType === 'patient' && styles.toggleButtonTextActive
            ]}>
              👥 Por Paciente
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.toggleButton,
              styles.toggleButtonRight,
              viewType === 'session' && styles.toggleButtonActive
            ]}
            onPress={() => setViewType('session')}
          >
            <Text style={[
              styles.toggleButtonText,
              viewType === 'session' && styles.toggleButtonTextActive
            ]}>
              📅 Por Sessão
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Patient-Centric View */}
      {viewType === 'patient' && (
        <View style={styles.dataContainer}>
          <Text style={styles.sectionTitle}>Resumo por Paciente</Text>
          {patientSummaries.map(patient => (
            <View key={patient.patient_id} style={styles.patientCard}>
              <Text style={styles.patientName}>{patient.patient_name}</Text>
              <Text style={styles.sessionCount}>📅 {patient.total_sessions} sessões</Text>
              <View style={styles.paymentRow}>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentTotal}>
                    Total: {formatCurrency(patient.total_amount)}
                  </Text>
                  <Text style={[styles.paymentStatus, { color: getPaymentStatusDetails(patient).color }]}>
                    Status: {getPaymentStatusDetails(patient).text}
                  </Text>
                </View>
                {patient.pending_amount > 0 && (
                  <Text style={[styles.pendingAmount, { color: getPaymentStatusDetails(patient).color }]}>
                    {getPaymentStatusDetails(patient).amountLabel}: {getPaymentStatusDetails(patient).displayAmount}
                  </Text>
                )}
              </View>

              {/* Payment Action Buttons */}
              <View style={styles.actionSection}>
                <Text style={styles.actionLabel}>Editar status do pagamento:</Text>
                <View style={styles.actionRow}>
                  <View style={styles.compactDropdownWrapper}>
                    <Picker
                      style={styles.compactStatusDropdown}
                      selectedValue={getPaymentStatusDetails(patient).status}
                      onValueChange={(value) => handleStatusChange(patient.patient_id, value)}
                    >
                      <Picker.Item label="Pago" value="pago" />
                      <Picker.Item label="Total de Sessões" value="nao_cobrado" />
                      <Picker.Item label="Aguardando Pagamento" value="aguardando_pagamento" />
                      <Picker.Item label="Pendente" value="pendente" />
                    </Picker>
                  </View>

                  {getPaymentStatusDetails(patient).showButton && (
                    <View style={styles.actionButtons}>
                      <Pressable 
                        style={[
                          styles.actionButton, 
                          getPaymentStatusDetails(patient).buttonType === 'invoice' 
                            ? styles.primaryButton 
                            : styles.reminderButton
                        ]}
                        onPress={() => {
                          if (getPaymentStatusDetails(patient).buttonType === 'invoice') {
                            handleSendPaymentRequest(patient);
                          } else {
                            handleChasePayment(patient);
                          }
                        }}
                      >
                        <Text style={[
                          getPaymentStatusDetails(patient).buttonType === 'invoice' 
                            ? styles.actionButtonText 
                            : styles.reminderButtonText
                        ]}>
                          {getPaymentStatusDetails(patient).buttonText}
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Session-Centric View */}
      {viewType === 'session' && (
        <View style={styles.dataContainer}>
          <Text style={styles.sectionTitle}>Detalhes por Sessão</Text>
          {sessionDetails.map(session => (
            <View key={session.session_id} style={styles.sessionCard}>
              <Text style={styles.sessionDate}>
                {new Date(session.session_date).toLocaleDateString('pt-BR')}
              </Text>
              <Text style={styles.sessionPatient}>{session.patient_name}</Text>
              <Text style={styles.sessionPrice}>{formatCurrency(session.session_price)}</Text>
              <Text style={styles.sessionPaymentStatus}>
                Status: {session.payment_status === 'paid' ? '✅ Pago' : '⏰ Pendente'}
              </Text>
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
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6c757d',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 15,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 10,
  },
  quickFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 15,
  },
  quickFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e9ecef',
    borderWidth: 1,
    borderColor: '#ced4da',
  },
  quickFilterButtonActive: {
    backgroundColor: '#6200ee',
    borderColor: '#6200ee',
  },
  quickFilterText: {
    fontSize: 14,
    color: '#495057',
  },
  quickFilterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  filterPicker: {
    marginBottom: 15,
  },
  dateRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateLabel: {
    fontSize: 14,
    color: '#6c757d',
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 15,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 5,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
  },
  viewToggleContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 15,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 2,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonLeft: {
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  toggleButtonRight: {
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#6200ee',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
  },
  toggleButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  dataContainer: {
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 15,
  },
  patientCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 5,
  },
  sessionCount: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 10,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 2,
  },
  paymentStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  pendingAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  sessionCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  sessionDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 5,
  },
  sessionPatient: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 5,
  },
  sessionPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 5,
  },
  sessionPaymentStatus: {
    fontSize: 12,
    color: '#6c757d',
  },
  actionSection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  statusDropdownContainer: {
    marginBottom: 10,
  },
  actionLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 5,
  },
  compactDropdownWrapper: {
    width: 160, // Increased from 120 to prevent "Total de Sessões" line break
  },
  compactStatusDropdown: {
    fontSize: 12,
    height: 30,
    minHeight: 30,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    justifyContent: 'flex-start', // Changed from default
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80, // Added minimum width instead of flex: 1
    maxWidth: 160, // Increased from 140 to prevent "Enviar Lembrete" line break
  },
  primaryButton: {
    backgroundColor: '#6200ee',
  },
  reminderButton: {
    backgroundColor: '#dc3545',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  reminderButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default PaymentsOverview;