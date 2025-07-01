// src/components/onboarding/GroupedPatientCard.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';
import type { GroupedPatient } from '../../services/patientGroupingService';
import { PatientGroupingService } from '../../services/patientGroupingService';
import type { PatientData } from '../../types/onboarding';

interface GroupedPatientCardProps {
    groupedPatient: GroupedPatient;
    defaultPrice: number; // in cents
    onSave: (patientData: PatientData) => void;
    onSkip: () => void;
    currentIndex: number;
    totalCount: number;
}

export const GroupedPatientCard: React.FC<GroupedPatientCardProps> = ({
    groupedPatient,
    defaultPrice,
    onSave,
    onSkip,
    currentIndex,
    totalCount
}) => {
    const [patientName, setPatientName] = useState(groupedPatient.name);
    const [email, setEmail] = useState(groupedPatient.suggestedEmail);
    const [phone, setPhone] = useState('');
    const [sessionPrice, setSessionPrice] = useState(defaultPrice);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isExpanded, setIsExpanded] = useState(false);

    // Add this useEffect after your useState declarations
    useEffect(() => {
        console.log(`🔄 Updating form for patient: ${groupedPatient.name} (index: ${currentIndex})`);

        // Reset form state for the new patient
        setPatientName(groupedPatient.name);
        setEmail(groupedPatient.suggestedEmail);
        setPhone(''); // Always start with empty phone
        setSessionPrice(defaultPrice);
        setErrors({}); // Clear any previous errors
        setIsExpanded(false); // Collapse sessions list for new patient
    }, [groupedPatient.id, currentIndex, defaultPrice]); // Watch for patient changes

    // Analyze session pattern
    const frequencyAnalysis = PatientGroupingService.analyzeSessionFrequency(groupedPatient);



    const formatCurrency = (value: string): string => {
        const numericValue = value.replace(/[^\d,]/g, '');
        const parts = numericValue.split(',');
        if (parts.length > 2) {
            return parts[0] + ',' + parts.slice(1).join('').slice(0, 2);
        }
        if (parts[1] && parts[1].length > 2) {
            return parts[0] + ',' + parts[1].slice(0, 2);
        }
        return numericValue;
    };

    const formatPhone = (value: string): string => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 2) return numbers;
        if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
        if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
        return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    };

    const getFrequencyText = (): string => {
        switch (frequencyAnalysis.suggestedFrequency) {
            case 'weekly':
                return frequencyAnalysis.weeklyPattern
                    ? `Semanal (${frequencyAnalysis.weeklyPattern}s)`
                    : 'Semanal';
            case 'biweekly':
                return 'Quinzenal';
            case 'monthly':
                return 'Mensal';
            default:
                return 'Irregular';
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!patientName.trim()) {
            newErrors.patientName = 'Nome é obrigatório';
        }

        if (!email.trim()) {
            newErrors.email = 'Email é obrigatório';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            newErrors.email = 'Email inválido';
        }

        if (!phone.trim()) {
            newErrors.phone = 'Telefone é obrigatório';
        } else if (phone.replace(/\D/g, '').length < 10) {
            newErrors.phone = 'Telefone deve ter pelo menos 10 dígitos';
        }

        if (sessionPrice < 1000) {
            newErrors.sessionPrice = 'Valor mínimo é R$ 10,00';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (!validateForm()) return;

        const patientData: PatientData = {
            name: patientName.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.replace(/\D/g, ''),
            sessionPrice: sessionPrice,
            therapyStartDate: groupedPatient.firstSessionDate,
            lvNotasBillingStartDate: new Date().toISOString().split('T')[0], // Start billing from today
            sessions: groupedPatient.allEvents.map(event => ({
                date: event.start?.dateTime || event.start?.date || '',
                googleEventId: event.id,
                status: 'agendada' as const
            })),
            originalEvents: groupedPatient.allEvents
        };

        onSave(patientData);
    };

    return (
        <View style={styles.container}>
            {/* Fixed Header */}
            <View style={styles.fixedHeader}>
                <Text style={styles.progressText}>
                    Paciente {currentIndex + 1} de {totalCount}
                </Text>
                <Text style={styles.sessionCount}>
                    {groupedPatient.sessionCount} sessões encontradas
                </Text>
            </View>

            {/* Scrollable Content */}
            <ScrollView
                style={styles.scrollableContent}
                contentContainerStyle={styles.scrollContentContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Patient Summary Card */}
                <View style={styles.summaryCard}>
                    <Text style={styles.patientNameDisplay}>{groupedPatient.name}</Text>

                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>📅 Frequência:</Text>
                        <Text style={styles.summaryValue}>{getFrequencyText()}</Text>
                    </View>

                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>📊 Período:</Text>
                        <Text style={styles.summaryValue}>
                            {new Date(groupedPatient.firstSessionDate).toLocaleDateString('pt-BR')} até{' '}
                            {new Date(groupedPatient.lastSessionDate).toLocaleDateString('pt-BR')}
                        </Text>
                    </View>

                    <Pressable
                        style={styles.expandButton}
                        onPress={() => setIsExpanded(!isExpanded)}
                    >
                        <Text style={styles.expandButtonText}>
                            {isExpanded ? '▼ Ver menos sessões' : '▶ Ver algumas sessões'}
                        </Text>
                    </Pressable>

                    {isExpanded && (
                        <View style={styles.sessionsList}>
                            {groupedPatient.sampleEvents.map((event, index) => (
                                <Text key={index} style={styles.sessionItem}>
                                    • {new Date(event.start?.dateTime || event.start?.date || '').toLocaleDateString('pt-BR', {
                                        weekday: 'short',
                                        day: '2-digit',
                                        month: '2-digit',
                                        hour: event.start?.dateTime ? '2-digit' : undefined,
                                        minute: event.start?.dateTime ? '2-digit' : undefined
                                    })}
                                </Text>
                            ))}
                            {groupedPatient.sessionCount > 3 && (
                                <Text style={styles.moreSessionsText}>
                                    ... e mais {groupedPatient.sessionCount - 3} sessões
                                </Text>
                            )}
                        </View>
                    )}
                </View>

                {/* Patient Details Form */}
                <View style={styles.formSection}>
                    <Text style={styles.sectionTitle}>👤 Complete os dados do paciente</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Nome Completo *</Text>
                        <TextInput
                            style={[styles.textInput, errors.patientName && styles.inputError]}
                            value={patientName}
                            onChangeText={setPatientName}
                            placeholder="Ex: Maria Silva Santos"
                            placeholderTextColor="#999"
                        />
                        {errors.patientName && <Text style={styles.errorText}>{errors.patientName}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email *</Text>
                        <TextInput
                            style={[styles.textInput, errors.email && styles.inputError]}
                            value={email}
                            onChangeText={setEmail}
                            placeholder="maria@exemplo.com"
                            placeholderTextColor="#999"
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Telefone *</Text>
                        <TextInput
                            style={[styles.textInput, errors.phone && styles.inputError]}
                            value={phone}
                            onChangeText={(value) => setPhone(formatPhone(value))}
                            placeholder="(11) 99999-9999"
                            placeholderTextColor="#999"
                            keyboardType="phone-pad"
                        />
                        {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Valor da Sessão *</Text>
                        <View style={styles.priceInputContainer}>
                            <Text style={styles.currencyPrefix}>R$</Text>
                            <TextInput
                                style={[styles.priceInput, errors.sessionPrice && styles.inputError]}
                                value={(sessionPrice / 100).toFixed(2).replace('.', ',')}
                                onChangeText={(value) => {
                                    const formatted = formatCurrency(value);
                                    const priceInCents = Math.round(parseFloat(formatted.replace(',', '.')) * 100) || 0;
                                    setSessionPrice(priceInCents);
                                }}
                                placeholder="300,00"
                                placeholderTextColor="#999"
                                keyboardType="numeric"
                            />
                        </View>
                        {errors.sessionPrice && <Text style={styles.errorText}>{errors.sessionPrice}</Text>}
                    </View>

                    <View style={styles.infoBox}>
                        <Text style={styles.infoTitle}>💡 Sobre a cobrança:</Text>
                        <Text style={styles.infoText}>
                            • O LV Notas começará a rastrear pagamentos a partir de hoje
                        </Text>
                        <Text style={styles.infoText}>
                            • Todas as {groupedPatient.sessionCount} sessões serão importadas
                        </Text>
                        <Text style={styles.infoText}>
                            • Você poderá ajustar datas e valores depois
                        </Text>
                    </View>
                </View>
            </ScrollView>

            {/* Fixed Footer */}
            <View style={styles.fixedFooter}>
                <View style={styles.actionContainer}>
                    <Pressable style={styles.skipButton} onPress={onSkip}>
                        <Text style={styles.skipButtonText}>⏭️ Pular</Text>
                    </Pressable>

                    <Pressable style={styles.saveButton} onPress={handleSave}>
                        <Text style={styles.saveButtonText}>✅ Salvar e Próximo</Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    // Replace container, header styles and add these new ones:
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    fixedHeader: {
        backgroundColor: '#fff',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
        zIndex: 1,
    },
    scrollableContent: {
        flex: 1,
    },
    scrollContentContainer: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    fixedFooter: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e9ecef',
        paddingHorizontal: 20,
        paddingVertical: 12,
        zIndex: 1,
    },
    actionContainer: {
        flexDirection: 'row',
        gap: 12,
        paddingTop: 12,        // Reduced from 20
        paddingBottom: 8,      // Reduced from original
        borderTopWidth: 1,
        borderTopColor: '#e9ecef',
    },
    skipButton: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        paddingVertical: 8,    // Reduced from 16
        paddingHorizontal: 12, // Reduced from original
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#dee2e6',
    },
    skipButtonText: {
        fontSize: 14,          // Reduced from 16
        color: '#6c757d',
        fontWeight: '600',
    },
    saveButton: {
        flex: 2,
        backgroundColor: '#6200ee',
        paddingVertical: 8,    // Reduced from 16
        paddingHorizontal: 12, // Reduced from original
        borderRadius: 8,
        alignItems: 'center',
    },
    saveButtonText: {
        fontSize: 14,          // Reduced from 16
        color: '#fff',
        fontWeight: '600',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: 600,
        alignSelf: 'center',
        width: '100%',
    },
    formSection: {
        paddingBottom: 20, // Remove flex: 1 and marginBottom
    },
    progressText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6200ee',
    },
    sessionCount: {
        fontSize: 14,
        color: '#6c757d',
    },
    summaryCard: {
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
        borderLeftWidth: 4,
        borderLeftColor: '#6200ee',
    },
    patientNameDisplay: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#212529',
        marginBottom: 16,
        textAlign: 'center',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    summaryLabel: {
        fontSize: 14,
        color: '#6c757d',
        fontWeight: '500',
    },
    summaryValue: {
        fontSize: 14,
        color: '#212529',
        fontWeight: '500',
    },
    expandButton: {
        marginTop: 12,
        paddingVertical: 8,
    },
    expandButtonText: {
        fontSize: 14,
        color: '#6200ee',
        fontWeight: '500',
    },
    sessionsList: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#dee2e6',
    },
    sessionItem: {
        fontSize: 12,
        color: '#6c757d',
        marginBottom: 4,
    },
    moreSessionsText: {
        fontSize: 12,
        color: '#6200ee',
        fontStyle: 'italic',
        marginTop: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#212529',
        marginBottom: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#495057',
        marginBottom: 8,
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#ced4da',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: '#212529',
        backgroundColor: '#fff',
    },
    inputError: {
        borderColor: '#dc3545',
    },
    priceInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ced4da',
        borderRadius: 8,
        backgroundColor: '#fff',
        paddingHorizontal: 16,
    },
    currencyPrefix: {
        fontSize: 16,
        fontWeight: '600',
        color: '#495057',
        marginRight: 8,
    },
    priceInput: {
        flex: 1,
        fontSize: 16,
        color: '#212529',
        paddingVertical: 12,
    },
    errorText: {
        fontSize: 12,
        color: '#dc3545',
        marginTop: 4,
    },
    infoBox: {
        backgroundColor: '#d1ecf1',
        borderRadius: 8,
        padding: 16,
        marginTop: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#17a2b8',
    },
    infoTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0c5460',
        marginBottom: 8,
    },
    infoText: {
        fontSize: 12,
        color: '#0c5460',
        marginBottom: 4,
    },
});