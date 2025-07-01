// src/components/onboarding/CalendarImportWizard.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, SafeAreaView, ScrollView } from 'react-native';
import { WizardSettings } from './WizardSettings';
import { GroupedPatientStack } from './GroupedPatientStack';
import { WizardSummary } from './WizardSummary';
import { apiService } from '../../services/api';
import type { CalendarEvent, PatientData, WizardState, WizardStep } from '../../types/onboarding';

interface CalendarImportWizardProps {
    therapistEmail: string;
    calendarId: string;
    onComplete: () => void;
    onCancel: () => void;
    onNavigateToPatients?: () => void; // Add this new prop
    mode?: 'onboarding' | 'settings';
}

export const CalendarImportWizard: React.FC<CalendarImportWizardProps> = ({
    therapistEmail,
    calendarId,
    onComplete,
    onCancel,
    onNavigateToPatients, // Add this prop
    mode = 'settings'
}) => {
    const [wizardState, setWizardState] = useState<WizardState>({
        step: 'loading',
        defaultSessionPrice: 30000, // R$ 300,00 in cents
        events: [],
        processedPatients: [],
        currentEventIndex: 0,
        importStats: {
            totalEvents: 0,
            patientsCreated: 0,
            sessionsCreated: 0,
            skipped: 0
        }
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadCalendarEvents();
    }, []);

    const loadCalendarEvents = async () => {
        setIsLoading(true);
        setError(null);

        try {
            console.log('🗓️ Loading calendar events for import...');

            // Fetch events from the last 6 months to capture therapy sessions
            const endDate = new Date();
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() - 6);

            const events = await apiService.getCalendarEventsForImport(
                calendarId,
                startDate.toISOString(),
                endDate.toISOString()
            );

            console.log(`📅 Found ${events.length} calendar events`);

            // Filter and process events that look like therapy sessions
            const therapyEvents = events.filter(event =>
                event.summary &&
                event.start?.dateTime &&
                !event.summary.toLowerCase().includes('cancelad') &&
                event.status !== 'cancelled'
            );

            console.log(`👥 Filtered to ${therapyEvents.length} potential therapy sessions`);

            setWizardState(prev => ({
                ...prev,
                step: 'settings',
                events: therapyEvents,
                importStats: {
                    ...prev.importStats,
                    totalEvents: therapyEvents.length
                }
            }));

        } catch (error) {
            console.error('❌ Error loading calendar events:', error);
            setError('Erro ao carregar eventos do calendário. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSettingsComplete = (settings: { defaultPrice: number }) => {
        console.log('⚙️ Wizard settings completed:', settings);

        setWizardState(prev => ({
            ...prev,
            step: 'importing',
            defaultSessionPrice: settings.defaultPrice
        }));
    };

    const handleNavigateToPatients = () => {
        console.log('🎯 User requested manual patient addition');

        if (onNavigateToPatients) {
            console.log('✅ Calling onNavigateToPatients callback');
            onNavigateToPatients();
        } else {
            console.log('⚠️ No onNavigateToPatients callback provided, using onComplete');
            onComplete();
        }
    };

    const handleEventProcessed = (patientData: PatientData) => {
        console.log('✅ Event processed:', patientData);

        setWizardState(prev => {
            const newProcessedPatients = [...prev.processedPatients, patientData];
            const nextIndex = prev.currentEventIndex + 1;

            return {
                ...prev,
                processedPatients: newProcessedPatients,
                currentEventIndex: nextIndex,
                step: nextIndex >= prev.events.length ? 'summary' : 'importing'
            };
        });
    };

    const handleEventSkipped = () => {
        console.log('⏭️ Event skipped');

        setWizardState(prev => {
            const nextIndex = prev.currentEventIndex + 1;

            return {
                ...prev,
                currentEventIndex: nextIndex,
                step: nextIndex >= prev.events.length ? 'summary' : 'importing',
                importStats: {
                    ...prev.importStats,
                    skipped: prev.importStats.skipped + 1
                }
            };
        });
    };

    const handleImportComplete = async () => {
        setIsLoading(true);

        try {
            console.log('🚀 Starting import process...');

            // Import all processed patients and their sessions
            for (const patientData of wizardState.processedPatients) {
                await apiService.importPatientWithSessions(therapistEmail, patientData);
            }

            console.log('✅ Import completed successfully!');

            setWizardState(prev => ({
                ...prev,
                importStats: {
                    ...prev.importStats,
                    patientsCreated: prev.processedPatients.length,
                    sessionsCreated: prev.processedPatients.reduce((total, p) => total + p.sessions.length, 0)
                }
            }));

            // Small delay to show completion state
            setTimeout(() => {
                onComplete();
            }, 2000);

        } catch (error) {
            console.error('❌ Error during import:', error);
            setError('Erro ao importar dados. Alguns dados podem ter sido salvos parcialmente.');
        } finally {
            setIsLoading(false);
        }
    };

    const getProgressPercentage = (): number => {
        if (wizardState.step === 'loading') return 10;
        if (wizardState.step === 'settings') return 20;
        if (wizardState.step === 'importing') {
            const progress = (wizardState.currentEventIndex / wizardState.events.length) * 60;
            return 20 + progress;
        }
        if (wizardState.step === 'summary') return 100;
        return 0;
    };

    const renderLoadingStep = () => (
        <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#6200ee" />
            <Text style={styles.loadingText}>Carregando eventos do calendário...</Text>
            <Text style={styles.loadingSubtext}>
                Analisando os últimos 6 meses de eventos
            </Text>
        </View>
    );

    const renderErrorStep = () => (
        <View style={styles.centerContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={loadCalendarEvents}>
                <Text style={styles.retryButtonText}>Tentar Novamente</Text>
            </Pressable>
            <Pressable style={styles.cancelButton} onPress={onCancel}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>
        </View>
    );

    const renderSettingsStep = () => (
        <WizardSettings
            defaultPrice={wizardState.defaultSessionPrice}
            totalEvents={wizardState.events.length}
            onComplete={handleSettingsComplete}
            onCancel={onCancel}
            onNavigateToPatients={handleNavigateToPatients} // Pass the navigation function
            mode={mode}
        />
    );

    const renderImportingStep = () => (
        <GroupedPatientStack
            events={wizardState.events}
            defaultPrice={wizardState.defaultSessionPrice}
            therapistEmail={therapistEmail} // Add this line
            onPatientProcessed={handleEventProcessed}
            onPatientSkipped={handleEventSkipped}
            onCancel={onCancel}
        />
    );

    const renderSummaryStep = () => (
        <WizardSummary
            stats={wizardState.importStats}
            processedPatients={wizardState.processedPatients}
            onComplete={handleImportComplete}
            onCancel={onCancel}
            isLoading={isLoading}
        />
    );

    const renderCurrentStep = () => {
        if (error) return renderErrorStep();

        switch (wizardState.step) {
            case 'loading':
                return renderLoadingStep();
            case 'settings':
                return renderSettingsStep();
            case 'importing':
                return renderImportingStep();
            case 'summary':
                return renderSummaryStep();
            default:
                return renderLoadingStep();
        }
    };

    // CalendarImportWizard.tsx - KEEP this simple version
    return (
        <View style={styles.container}>
            {renderCurrentStep()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    scrollableContent: {
        flex: 1,
    },
    scrollContentContainer: {
        paddingBottom: 20,
    },
    centerContainer: {
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
    errorText: {
        fontSize: 16,
        color: '#dc3545',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    retryButton: {
        backgroundColor: '#6200ee',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        marginBottom: 12,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    cancelButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
    },
    cancelButtonText: {
        color: '#6c757d',
        fontSize: 16,
    },
});