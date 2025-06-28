// src/components/payments/PaymentsOverview.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';

// Import our new modular components
import { PaymentFilters } from './PaymentFilters';
import { PaymentSummaryCards } from './PaymentSummaryCards';
import { PatientPaymentCard } from './PatientPaymentCard';
import { SessionPaymentCard } from './SessionPaymentCard';

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

export const PaymentsOverview = () => {
    const { user } = useAuth();
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

    // Load data when filters change
    useEffect(() => {
        if (filters.dateRange.startDate && filters.dateRange.endDate && user?.email) {
            loadPaymentsData();
        }
    }, [filters.dateRange, filters.statusFilter, filters.patientFilter, user?.email]);

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
            console.log('🔄 Loading real payment data from API...');
            console.log('Patient filter:', filters.patientFilter);

            // Load patients list for filter dropdown
            const patientsData = await apiService.getPatients(user.email);
            setAllPatients(patientsData.map(p => ({ id: p.id, name: p.name })));

            // Call API endpoints without patient filter (we'll filter frontend-side)
            const [summaryData, patientData, sessionData] = await Promise.all([
                apiService.getPaymentSummary(user.email, filters.dateRange.startDate, filters.dateRange.endDate),
                apiService.getPatientPayments(user.email, filters.dateRange.startDate, filters.dateRange.endDate, filters.statusFilter),
                apiService.getSessionPayments(user.email, filters.dateRange.startDate, filters.dateRange.endDate, filters.statusFilter)
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

            // Calculate summary from filtered data instead of using API summary
            const calculatedSummary = {
                total_revenue: filteredPatientData.reduce((sum, p) => sum + p.total_amount, 0),
                paid_revenue: filteredPatientData.reduce((sum, p) => sum + p.paid_amount, 0),
                pending_revenue: filteredPatientData.reduce((sum, p) => sum + p.pending_amount, 0),
                // Add the new revenue breakdowns
                nao_cobrado_revenue: filteredSessionData
                    .filter(s => s.payment_status === 'pending')
                    .reduce((sum, s) => sum + s.session_price, 0),
                aguardando_revenue: filteredSessionData
                    .filter(s => s.payment_status === 'aguardando_pagamento')
                    .reduce((sum, s) => sum + s.session_price, 0),
                pendente_revenue: filteredSessionData
                    .filter(s => s.payment_status === 'pendente')
                    .reduce((sum, s) => sum + s.session_price, 0),
                total_sessions: filteredPatientData.reduce((sum, p) => sum + p.total_sessions, 0),
                paid_sessions: filteredSessionData.filter(s => s.payment_status === 'paid').length,
                pending_sessions: filteredSessionData.filter(s => s.payment_status !== 'paid').length
            };

            console.log('💰 Calculated summary for filtered data:', calculatedSummary);

            // Set the filtered data and calculated summary
            setPaymentsSummary(calculatedSummary);
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

    // Payment action handlers (simplified - only for sessions now)
    const handleSendPaymentRequest = async (patient: PatientPaymentSummary) => {
        console.log(`Sending payment request to ${patient.patient_name}`);
        // TODO: Implement actual payment request logic if needed
    };

    const handleChasePayment = async (patient: PatientPaymentSummary) => {
        console.log(`Chasing payment for ${patient.patient_name}`);
        // TODO: Implement actual payment chase logic if needed
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
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>💰 Visão Geral de Pagamentos</Text>
            </View>

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
                        <Text style={styles.sectionTitle}>Resumo por Paciente</Text>
                        {patientSummaries.map(patient => (
                            <PatientPaymentCard
                                key={patient.patient_id}
                                patient={patient}
                                onViewDetails={handleViewPatientDetails}
                            />
                        ))}
                    </>
                ) : (
                    <>
                        <Text style={styles.sectionTitle}>Detalhes por Sessão</Text>
                        {sessionDetails.map(session => (
                            <SessionPaymentCard
                                key={session.session_id}
                                session={session}
                                onStatusChange={handleStatusChange}
                            />
                        ))}
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
    contentContainer: {
        paddingHorizontal: 15,
        paddingBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#212529',
        marginBottom: 15,
        marginTop: 5,
    },
});