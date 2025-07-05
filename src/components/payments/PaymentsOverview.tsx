// src/components/payments/PaymentsOverview.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { apiService } from '../../services/api';

// Import our new interactive components
import { ModeHeader } from '../common/ModeHeader';

// Import our new modular components
import { PaymentFilters } from './PaymentFilters';
import { PaymentSummaryCards } from './PaymentSummaryCards';
import { PatientPaymentCard } from './PatientPaymentCard';
import { SessionPaymentCard } from './SessionPaymentCard';
import { PatientPaymentList } from './PatientPaymentList';
import { SessionPaymentList } from './SessionPaymentList';

// Import types
import {
    PatientPaymentSummary,
    SessionPaymentDetail,
    PaymentsSummary,
    PaymentFiltersState,
    QuickFilterType,
    PaymentStatusFilter,
    ViewType
} from '../../types/payments';
import { whatsappService } from '../../services/whatsapp';

export const PaymentsOverview = () => {
    const { user } = useAuth();
    const { 
        isSimpleMode, 
        isAdvancedMode, 
        isCardView, 
        isListView,
        isAutoCheckInEnabled,
        getCurrentModeLabel,
        getCurrentViewLabel 
    } = useSettings();
    
    const [loading, setLoading] = useState(true);

    // Filter state
    const [filters, setFilters] = useState<PaymentFiltersState>({
        dateRange: { startDate: '', endDate: '' },
        quickFilter: 'current_month',
        statusFilter: 'todos',
        patientFilter: 'todos', // Add this
        viewType: 'patient'
    });

    // Data state
    const [patientSummaries, setPatientSummaries] = useState<PatientPaymentSummary[]>([]);
    const [sessionDetails, setSessionDetails] = useState<SessionPaymentDetail[]>([]);
    const [paymentsSummary, setPaymentsSummary] = useState<PaymentsSummary | null>(null);
    const [allPatients, setAllPatients] = useState<{ id: string; name: string }[]>([]);

    // Initialize dates on component mount
    useEffect(() => {
        const today = new Date();
        const firstDayCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        setFilters(prev => ({
            ...prev,
            dateRange: {
                startDate: formatDate(firstDayCurrentMonth),
                endDate: formatDate(lastDayCurrentMonth)
            }
        }));
    }, []);

    // Load data when filters change OR when auto check-in mode changes
    useEffect(() => {
        if (filters.dateRange.startDate && filters.dateRange.endDate && user?.email) {
            loadPaymentsData();
        }
    }, [filters.dateRange, filters.statusFilter, filters.patientFilter, user?.email, isAutoCheckInEnabled()]);

    const formatDate = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const setQuickDateRange = (range: QuickFilterType) => {
        const today = new Date();
        let start: Date, end: Date;

        switch (range) {
            case 'current_month':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                break;
            case 'last_month':
                start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                end = new Date(today.getFullYear(), today.getMonth(), 0);
                break;
            case 'last_3_months':
                start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
                end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                break;
            case 'last_6_months':
                start = new Date(today.getFullYear(), today.getMonth() - 5, 1);
                end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                break;
            default:
                return;
        }

        setFilters(prev => ({
            ...prev,
            dateRange: {
                startDate: formatDate(start),
                endDate: formatDate(end)
            },
            quickFilter: range
        }));
    };

    const loadPaymentsData = async () => {
        if (!user?.email) return;

        setLoading(true);
        try {
            const autoCheckInMode = isAutoCheckInEnabled();
            console.log('🔄 Loading payment data with Auto Check-in:', autoCheckInMode);
            console.log('Patient filter:', filters.patientFilter);
            console.log('Status filter:', filters.statusFilter);

            // Load patients list for filter dropdown
            const patientsData = await apiService.getPatients(user.email);
            setAllPatients(patientsData.map(p => ({ id: p.id, name: p.name })));

            // Call API endpoints with auto check-in parameter and filters
            const [summaryData, patientData, sessionData] = await Promise.all([
                apiService.getPaymentSummary(user.email, filters.dateRange.startDate, filters.dateRange.endDate, autoCheckInMode, filters.statusFilter, filters.patientFilter),
                apiService.getPatientPayments(user.email, filters.dateRange.startDate, filters.dateRange.endDate, 'todos', autoCheckInMode),
                apiService.getSessionPayments(user.email, filters.dateRange.startDate, filters.dateRange.endDate, 'todos', autoCheckInMode)
            ]);

            console.log('📊 Raw patient data:', patientData.length, 'patients');
            console.log('📅 Raw session data:', sessionData.length, 'sessions');

            // Apply patient filter on frontend
            let filteredPatientData = patientData;
            let filteredSessionData = sessionData;

            if (filters.patientFilter !== 'todos') {
                const selectedPatientId = parseInt(filters.patientFilter);
                console.log('🔍 Filtering for patient ID:', selectedPatientId);

                filteredPatientData = patientData.filter(p => p.patient_id === selectedPatientId);
                filteredSessionData = sessionData.filter(s => s.patient_id === selectedPatientId);

                console.log('📊 Filtered patient data:', filteredPatientData.length, 'patients');
                console.log('📅 Filtered session data:', filteredSessionData.length, 'sessions');
            }

            // Apply status filter based on current mode
            if (filters.statusFilter !== 'todos') {
                console.log('🎯 Applying status filter:', filters.statusFilter);

                if (isSimpleMode()) {
                    // Simple mode: Map filter values to database statuses
                    if (filters.statusFilter === 'pago') {
                        filteredSessionData = filteredSessionData.filter(s => s.payment_status === 'paid');
                        filteredPatientData = filteredPatientData.filter(p => p.pending_amount === 0 && p.paid_amount > 0);
                    } else if (filters.statusFilter === 'pendente') {
                        // In simple mode, "pendente" includes all non-paid statuses
                        filteredSessionData = filteredSessionData.filter(s => s.payment_status !== 'paid');
                        filteredPatientData = filteredPatientData.filter(p => p.pending_amount > 0);
                    }
                } else {
                    // Advanced mode: Direct status matching
                    if (filters.statusFilter === 'pago') {
                        filteredSessionData = filteredSessionData.filter(s => s.payment_status === 'paid');
                        filteredPatientData = filteredPatientData.filter(p => p.pending_amount === 0 && p.paid_amount > 0);
                    } else if (filters.statusFilter === 'nao_cobrado') {
                        filteredSessionData = filteredSessionData.filter(s => s.payment_status === 'pending');
                        filteredPatientData = filteredPatientData.filter(p => {
                            // Patient should have non-cobrado sessions and no aguardando/pendente sessions
                            const patientSessions = sessionData.filter(s => s.patient_id === p.patient_id);
                            return patientSessions.some(s => s.payment_status === 'pending') &&
                                !patientSessions.some(s => ['aguardando_pagamento', 'pendente'].includes(s.payment_status));
                        });
                    } else if (filters.statusFilter === 'aguardando_pagamento') {
                        filteredSessionData = filteredSessionData.filter(s => s.payment_status === 'aguardando_pagamento');
                        filteredPatientData = filteredPatientData.filter(p => p.aguardando_sessions > 0);
                    } else if (filters.statusFilter === 'pendente') {
                        filteredSessionData = filteredSessionData.filter(s => s.payment_status === 'pendente');
                        filteredPatientData = filteredPatientData.filter(p => p.pendente_sessions > 0);
                    }
                }

                console.log('📊 Status filtered patient data:', filteredPatientData.length, 'patients');
                console.log('📅 Status filtered session data:', filteredSessionData.length, 'sessions');
            }

            // Use the summary from API (it's already calculated with auto check-in consideration)
            setPaymentsSummary(summaryData);
            setPatientSummaries(filteredPatientData);
            setSessionDetails(filteredSessionData);

        } catch (error) {
            console.error('❌ Error loading payments data:', error);
            alert('Erro ao carregar dados de pagamentos. Verifique sua conexão.');
        } finally {
            setLoading(false);
        }
    };

    // Filter handlers
    const handleQuickFilterChange = (filter: QuickFilterType) => {
        setQuickDateRange(filter);
    };

    const handleStatusFilterChange = (statusFilter: PaymentStatusFilter) => {
        setFilters(prev => ({ ...prev, statusFilter }));
    };

    const handleViewTypeChange = (viewType: ViewType) => {
        setFilters(prev => ({ ...prev, viewType: viewType }));
    };

    const handlePatientFilterChange = (patientId: string) => {
        setFilters(prev => ({ ...prev, patientFilter: patientId }));
    };

    // Payment action handlers - now with auto check-in support
    const handleSendPaymentRequest = async (patient: PatientPaymentSummary) => {
        console.log(`💰 Sending payment request to ${patient.patient_name}`);

        try {
            // Show preview first (optional - for user confirmation)
            const whatsappData = whatsappService.previewMessage(patient, 'invoice');

            const confirmed = window.confirm(
                `Enviar cobrança via WhatsApp para ${patient.patient_name}?\n\n` +
                `Telefone: ${whatsappData.phone}\n` +
                `Valor pendente: R$ ${patient.pending_amount.toFixed(2).replace('.', ',')}\n\n` +
                `Clique OK para abrir WhatsApp com a mensagem pronta.`
            );

            if (confirmed) {
                // Send WhatsApp message (now uses config templates)
                whatsappService.sendPaymentRequest(patient);

                // Call API to mark as payment requested with auto check-in mode
                try {
                    await apiService.sendPaymentRequest(patient.patient_id.toString(), isAutoCheckInEnabled());
                } catch (apiError) {
                    console.log('Note: Could not update payment request status in database:', apiError);
                }

                // Reload data to reflect changes
                await loadPaymentsData();

                console.log('✅ Payment request sent successfully');
            }
        } catch (error: any) {
            console.error('❌ Error sending payment request:', error);
            alert(`Erro ao enviar cobrança: ${error.message}`);
        }
    };

    const handleChasePayment = async (patient: PatientPaymentSummary) => {
        console.log(`📝 Sending payment reminder to ${patient.patient_name}`);

        try {
            // Show preview first (optional - for user confirmation)
            const whatsappData = whatsappService.previewMessage(patient, 'reminder');

            const confirmed = window.confirm(
                `Enviar lembrete via WhatsApp para ${patient.patient_name}?\n\n` +
                `Telefone: ${whatsappData.phone}\n` +
                `Valor pendente: R$ ${patient.pending_amount.toFixed(2).replace('.', ',')}\n\n` +
                `Clique OK para abrir WhatsApp com o lembrete pronto.`
            );

            if (confirmed) {
                // Send WhatsApp reminder (now uses config templates)
                whatsappService.sendPaymentReminder(patient);

                // Reload data to reflect any changes
                await loadPaymentsData();

                console.log('✅ Payment reminder sent successfully');
            }
        } catch (error: any) {
            console.error('❌ Error sending payment reminder:', error);
            alert(`Erro ao enviar lembrete: ${error.message}`);
        }
    };

    const handleViewPatientDetails = (patientId: number) => {
        console.log(`📋 Viewing details for patient ${patientId}`);

        // Switch to session view and filter by this patient
        setFilters(prev => ({
            ...prev,
            viewType: 'session',
            patientFilter: patientId.toString()
        }));
    };

    const handleStatusChange = async (sessionId: number, newStatus: string) => {
        console.log(`💰 Changing payment status for session ${sessionId} to ${newStatus}`);

        if (!user?.email) {
            console.error('❌ No user email available');
            alert('Erro: usuário não autenticado');
            return;
        }

        try {
            // Call the API to update payment status
            await apiService.updatePaymentStatus(sessionId, newStatus, user.email);

            console.log('✅ Payment status updated successfully');

            // Reload the payments data to reflect the changes
            await loadPaymentsData();

            // Show success message
            // alert(`Status da sessão alterado para: ${newStatus}`);

        } catch (error: any) {
            console.error('❌ Error updating payment status:', error);
            alert(`Erro ao alterar status de pagamento: ${error.message}`);
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
            {/* Interactive Header with Toggles */}
            <ModeHeader 
                title="💰 Visão Geral de Pagamentos"
                showPaymentMode={true}
                showViewMode={true}
            />

            {/* Filters */}
            <PaymentFilters
                filters={filters}
                patients={allPatients}
                onFiltersChange={{
                    onQuickFilterChange: handleQuickFilterChange,
                    onStatusFilterChange: handleStatusFilterChange,
                    onPatientFilterChange: handlePatientFilterChange,
                    onViewTypeChange: handleViewTypeChange
                }}
            />

            {/* Summary Cards */}
            <PaymentSummaryCards
                summary={paymentsSummary}
                loading={false}
            />

            {/* Content based on view type */}
            <View style={styles.contentContainer}>
                {filters.viewType === 'patient' ? (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Resumo por Paciente</Text>
                            <Text style={styles.sectionSubtitle}>
                                {isSimpleMode()
                                    ? `${patientSummaries.length} pacientes (modo ${getCurrentModeLabel().toLowerCase()})`
                                    : `${patientSummaries.length} pacientes (modo ${getCurrentModeLabel().toLowerCase()})`
                                } • Visualização em {getCurrentViewLabel().toLowerCase()}
                                {isAutoCheckInEnabled() && ' • ⚡ Check-in Automático Ativo'}
                            </Text>
                        </View>

                        {/* Conditional rendering based on view mode */}
                        {isCardView() ? (
                            // Card View
                            patientSummaries.map(patient => (
                                <PatientPaymentCard
                                    key={patient.patient_id}
                                    patient={patient}
                                    onViewDetails={handleViewPatientDetails}
                                    onSendPaymentRequest={handleSendPaymentRequest}
                                    onChasePayment={handleChasePayment}
                                />
                            ))
                        ) : (
                            // List View
                            <PatientPaymentList
                                patients={patientSummaries}
                                onViewDetails={handleViewPatientDetails}
                                onSendPaymentRequest={handleSendPaymentRequest}
                                onChasePayment={handleChasePayment}
                            />
                        )}
                    </>
                ) : (
                    <>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionTitleRow}>
                                <Pressable
                                    style={styles.backButton}
                                    onPress={() => setFilters(prev => ({ ...prev, viewType: 'patient' }))}
                                >
                                    <Text style={styles.backButtonText}>← Pacientes</Text>
                                </Pressable>
                                <Text style={styles.sectionTitle}>Detalhes por Sessão</Text>
                            </View>
                            <Text style={styles.sectionSubtitle}>
                                {isSimpleMode()
                                    ? `${sessionDetails.length} sessões (2 status disponíveis)`
                                    : `${sessionDetails.length} sessões (4 status disponíveis)`
                                } • Visualização em {getCurrentViewLabel().toLowerCase()}
                                {isAutoCheckInEnabled() && ' • ⚡ Check-in Automático Ativo'}
                            </Text>
                        </View>

                        {/* Conditional rendering based on view mode */}
                        {isCardView() ? (
                            // Card View
                            sessionDetails.map(session => (
                                <SessionPaymentCard
                                    key={session.session_id}
                                    session={session}
                                    onStatusChange={handleStatusChange}
                                />
                            ))
                        ) : (
                            // List View
                            <SessionPaymentList
                                sessions={sessionDetails}
                                onStatusChange={handleStatusChange}
                            />
                        )}
                    </>
                )}
            </View>
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
    contentContainer: {
        paddingHorizontal: 15,
        paddingBottom: 20,
    },
    sectionHeader: {
        marginBottom: 15,
        marginTop: 5,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#212529',
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#6c757d',
        fontStyle: 'italic',
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    backButton: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        backgroundColor: '#e9ecef',
        borderRadius: 6,
    },
    backButtonText: {
        fontSize: 12,
        color: '#495057',
        fontWeight: '500',
    },
});