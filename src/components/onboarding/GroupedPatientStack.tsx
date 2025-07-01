// src/components/onboarding/GroupedPatientStack.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { PatientGroupingService, type GroupedPatient } from '../../services/patientGroupingService';
import { GroupedPatientCard } from './GroupedPatientCard';
import type { CalendarEvent, PatientData } from '../../types/onboarding';
import { apiService } from '../../services/api';

const DOT_PROGRESS_MAX = 20;

interface GroupedPatientStackProps {
    events: CalendarEvent[];
    defaultPrice: number; // in cents
    defaultTrackingStartDate: string; // Add this line
    therapistEmail: string;
    onPatientProcessed: (patientData: PatientData) => void;
    onPatientSkipped: () => void;
    onCancel: () => void;
}

export const GroupedPatientStack: React.FC<GroupedPatientStackProps> = ({
    events,
    defaultPrice,
    defaultTrackingStartDate, // Add this line
    therapistEmail,
    onPatientProcessed,
    onPatientSkipped,
    onCancel
}) => {
    const [groupedPatients, setGroupedPatients] = useState<GroupedPatient[]>([]);
    const [currentPatientIndex, setCurrentPatientIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        processEvents();
    }, [events]);

    const processEvents = () => {
        setIsLoading(true);

        try {
            console.log('🔄 Grouping events by patient...');
            const grouped = PatientGroupingService.groupEventsByPatient(events);
            setGroupedPatients(grouped);
            console.log(`✅ Successfully grouped ${events.length} events into ${grouped.length} patients`);
        } catch (error) {
            console.error('❌ Error grouping events:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePatientSaved = async (patientData: PatientData) => {
        console.log(`✅ Saving patient immediately: ${patientData.name} (${patientData.sessions.length} sessions)`);

        try {
            // Save patient immediately to database
            await apiService.importPatientWithSessions(therapistEmail, patientData);
            console.log(`✅ Patient ${patientData.name} saved successfully to database`);

            // Still call parent to update wizard state
            onPatientProcessed(patientData);

            // Move to next patient
            const nextIndex = currentPatientIndex + 1;
            setCurrentPatientIndex(nextIndex);
        } catch (error) {
            console.error(`❌ Error saving patient ${patientData.name}:`, error);
            // Show error message to user
            alert(`Erro ao salvar ${patientData.name}. Tente novamente.`);
        }
    };

    const handlePatientSkipped = () => {
        console.log(`⏭️ Patient skipped: ${groupedPatients[currentPatientIndex]?.name}`);

        onPatientSkipped();

        // Move to next patient
        const nextIndex = currentPatientIndex + 1;
        setCurrentPatientIndex(nextIndex);
    };

    // Show loading state while processing
    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6200ee" />
                <Text style={styles.loadingText}>Agrupando pacientes...</Text>
                <Text style={styles.loadingSubtext}>
                    Analisando {events.length} eventos do calendário
                </Text>
            </View>
        );
    }

    // Show completion message when all patients are processed
    if (currentPatientIndex >= groupedPatients.length) {
        return (
            <View style={styles.completionContainer}>
                <Text style={styles.completionIcon}>🎉</Text>
                <Text style={styles.completionTitle}>Todos os Pacientes Processados!</Text>
                <Text style={styles.completionSubtext}>
                    Você processou todos os {groupedPatients.length} pacientes encontrados no calendário.
                </Text>

                <Pressable style={styles.continueButton} onPress={onCancel}>
                    <Text style={styles.continueButtonText}>Continuar</Text>
                </Pressable>
            </View>
        );
    }

    // Show message if no patients found
    if (groupedPatients.length === 0) {
        return (
            <View style={styles.noDataContainer}>
                <Text style={styles.noDataIcon}>🤔</Text>
                <Text style={styles.noDataTitle}>Nenhum Paciente Encontrado</Text>
                <Text style={styles.noDataSubtext}>
                    Não conseguimos identificar pacientes únicos nos eventos do calendário.
                    Isso pode acontecer se os eventos não seguem um padrão reconhecível.
                </Text>

                <View style={styles.noDataActions}>
                    <Pressable style={styles.retryButton} onPress={processEvents}>
                        <Text style={styles.retryButtonText}>Tentar Novamente</Text>
                    </Pressable>

                    <Pressable style={styles.cancelButton} onPress={onCancel}>
                        <Text style={styles.cancelButtonText}>Voltar</Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    const currentPatient = groupedPatients[currentPatientIndex];

    return (
        <View style={styles.container}>
            {/* Progress Overview */}
            <View style={styles.progressOverview}>
                <Text style={styles.progressTitle}>
                    👥 {groupedPatients.length} pacientes únicos encontrados
                </Text>
                <Text style={styles.progressSubtitle}>
                    Processando um paciente por vez para facilitar o preenchimento
                </Text>

                {/* Progress Dots */}
                <View style={styles.progressDots}>
                    {groupedPatients.slice(0, DOT_PROGRESS_MAX).map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.progressDot,
                                index === currentPatientIndex && styles.progressDotActive,
                                index < currentPatientIndex && styles.progressDotCompleted
                            ]}
                        />
                    ))}
                    {groupedPatients.length > DOT_PROGRESS_MAX && (
                        <Text style={styles.progressMore}>+{groupedPatients.length - DOT_PROGRESS_MAX}</Text>
                    )}
                </View>
            </View>

            {/* Current Patient Card */}
            <GroupedPatientCard
                groupedPatient={currentPatient}
                defaultPrice={defaultPrice}
                defaultTrackingStartDate={defaultTrackingStartDate} // Add this line
                onSave={handlePatientSaved}
                onSkip={handlePatientSkipped}
                currentIndex={currentPatientIndex}
                totalCount={groupedPatients.length}
            />

            {/* Navigation Helper */}
            <View style={styles.navigationHelper}>
                <Text style={styles.helperText}>
                    💡 Dica: Você pode pular pacientes e adicionar os dados depois manualmente
                </Text>

                <Pressable style={styles.cancelImportButton} onPress={onCancel}>
                    <Text style={styles.cancelImportText}>Cancelar Importação</Text>
                </Pressable>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
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
    completionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    completionIcon: {
        fontSize: 64,
        marginBottom: 24,
    },
    completionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#212529',
        textAlign: 'center',
        marginBottom: 16,
    },
    completionSubtext: {
        fontSize: 16,
        color: '#6c757d',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    continueButton: {
        backgroundColor: '#6200ee',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 8,
    },
    continueButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    noDataContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    noDataIcon: {
        fontSize: 64,
        marginBottom: 24,
    },
    noDataTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#212529',
        textAlign: 'center',
        marginBottom: 16,
    },
    noDataSubtext: {
        fontSize: 16,
        color: '#6c757d',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    noDataActions: {
        flexDirection: 'row',
        gap: 16,
    },
    retryButton: {
        backgroundColor: '#6200ee',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    cancelButton: {
        backgroundColor: '#f8f9fa',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#dee2e6',
    },
    cancelButtonText: {
        color: '#6c757d',
        fontSize: 16,
        fontWeight: '600',
    },
    progressOverview: {
        backgroundColor: '#f8f9fa',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    progressTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#212529',
        textAlign: 'center',
        marginBottom: 8,
    },
    progressSubtitle: {
        fontSize: 14,
        color: '#6c757d',
        textAlign: 'center',
        marginBottom: 16,
    },
    progressDots: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    progressDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#e9ecef',
    },
    progressDotActive: {
        backgroundColor: '#6200ee',
        transform: [{ scale: 1.2 }],
    },
    progressDotCompleted: {
        backgroundColor: '#28a745',
    },
    progressMore: {
        fontSize: 12,
        color: '#6c757d',
        marginLeft: 8,
    },
    navigationHelper: {
        backgroundColor: '#fff3cd',
        padding: 6,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#ffeaa7',
    },
    helperText: {
        fontSize: 14,
        color: '#856404',
        textAlign: 'center',
        marginBottom: 12,
    },
    cancelImportButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    cancelImportText: {
        color: '#6c757d',
        fontSize: 14,
        textDecorationLine: 'underline',
    },
});