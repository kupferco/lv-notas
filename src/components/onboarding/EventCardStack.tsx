// src/components/onboarding/EventCardStack.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import type { CalendarEvent, PatientData, SessionData, EventProcessingState, ValidationErrors } from '../../types/onboarding';

interface EventCardStackProps {
  events: CalendarEvent[];
  currentIndex: number;
  defaultPrice: number; // in cents
  onEventProcessed: (patientData: PatientData) => void;
  onEventSkipped: () => void;
  onCancel: () => void;
}

export const EventCardStack: React.FC<EventCardStackProps> = ({
  events,
  currentIndex,
  defaultPrice,
  onEventProcessed,
  onEventSkipped,
  onCancel
}) => {
  const [formState, setFormState] = useState<EventProcessingState>({
    patientName: '',
    email: '',
    phone: '',
    sessionPrice: defaultPrice,
    therapyStartDate: '',
    lvNotasBillingStartDate: '', // Changed from chargingStartDate
    groupedSessions: []
  });
  
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const currentEvent = events[currentIndex];

  useEffect(() => {
    if (currentEvent) {
      initializeFormForEvent(currentEvent);
    }
  }, [currentEvent, currentIndex]);

  const initializeFormForEvent = (event: CalendarEvent) => {
    console.log('🎯 Initializing form for event:', event.summary);

    // Extract patient name from event summary
    const patientName = extractPatientName(event.summary);
    
    // Look for email in attendees
    const attendeeEmail = event.attendees?.[0]?.email || '';
    
    // Group all events with the same patient name
    const relatedEvents = events.filter(e => 
      extractPatientName(e.summary).toLowerCase() === patientName.toLowerCase()
    );

    // Create session data from related events
    const sessions: SessionData[] = relatedEvents.map(e => ({
      date: e.start.dateTime || e.start.date || '',
      googleEventId: e.id,
      status: 'agendada' as const
    }));

    // Set default LV Notas billing start date to first session date
    const firstSessionDate = sessions.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )[0]?.date;

    setFormState({
      patientName,
      email: attendeeEmail,
      phone: '',
      sessionPrice: defaultPrice,
      therapyStartDate: '',
      lvNotasBillingStartDate: firstSessionDate ? formatDateForInput(firstSessionDate) : '', // Changed field name
      groupedSessions: sessions
    });

    setErrors({});
  };

  const extractPatientName = (summary: string): string => {
    // Remove common therapy-related words and clean up the name
    const cleaned = summary
      .replace(/(?:sessão|session|terapia|therapy|consulta|appointment)/gi, '')
      .replace(/[-–—]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return cleaned || 'Paciente';
  };

  const formatDateForInput = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

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
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, '');
    
    // Apply Brazilian phone formatting
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!formState.patientName.trim()) {
      newErrors.patientName = 'Nome do paciente é obrigatório';
    }

    if (!formState.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!formState.phone.trim()) {
      newErrors.phone = 'Telefone é obrigatório';
    } else if (formState.phone.replace(/\D/g, '').length < 10) {
      newErrors.phone = 'Telefone deve ter pelo menos 10 dígitos';
    }

    if (formState.sessionPrice < 1000) { // R$ 10,00 minimum
      newErrors.sessionPrice = 'Valor mínimo é R$ 10,00';
    }

    if (!formState.lvNotasBillingStartDate) {
      newErrors.lvNotasBillingStartDate = 'Data de início da cobrança é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSavePatient = async () => {
    if (!validateForm()) return;

    setIsProcessing(true);

    try {
      const patientData: PatientData = {
        name: formState.patientName.trim(),
        email: formState.email.trim().toLowerCase(),
        phone: formState.phone.replace(/\D/g, ''), // Store only numbers
        sessionPrice: formState.sessionPrice,
        therapyStartDate: formState.therapyStartDate || undefined,
        lvNotasBillingStartDate: formState.lvNotasBillingStartDate, // Changed field name
        sessions: formState.groupedSessions,
        originalEvents: events.filter(e => 
          formState.groupedSessions.some(s => s.googleEventId === e.id)
        )
      };

      console.log('✅ Saving patient data:', patientData);
      onEventProcessed(patientData);
    } catch (error) {
      console.error('❌ Error processing patient:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkip = () => {
    console.log('⏭️ Skipping event:', currentEvent?.summary);
    onEventSkipped();
  };

  if (!currentEvent) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Nenhum evento para processar</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Event Preview Card */}
          <View style={styles.eventCard}>
            <Text style={styles.eventTitle}>📅 {currentEvent.summary}</Text>
            <Text style={styles.eventDate}>
              {new Date(currentEvent.start.dateTime || currentEvent.start.date || '').toLocaleDateString('pt-BR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: currentEvent.start.dateTime ? '2-digit' : undefined,
                minute: currentEvent.start.dateTime ? '2-digit' : undefined
              })}
            </Text>
            {formState.groupedSessions.length > 1 && (
              <Text style={styles.groupedSessions}>
                👥 {formState.groupedSessions.length} sessões encontradas para este paciente
              </Text>
            )}
          </View>

          {/* Patient Form */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>👤 Dados do Paciente</Text>
            
            {/* Patient Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome Completo *</Text>
              <TextInput
                style={[styles.textInput, errors.patientName && styles.inputError]}
                value={formState.patientName}
                onChangeText={(value) => setFormState(prev => ({ ...prev, patientName: value }))}
                placeholder="Ex: Maria Silva"
                placeholderTextColor="#999"
              />
              {errors.patientName && <Text style={styles.errorText}>{errors.patientName}</Text>}
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={[styles.textInput, errors.email && styles.inputError]}
                value={formState.email}
                onChangeText={(value) => setFormState(prev => ({ ...prev, email: value }))}
                placeholder="maria@exemplo.com"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            {/* Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Telefone *</Text>
              <TextInput
                style={[styles.textInput, errors.phone && styles.inputError]}
                value={formState.phone}
                onChangeText={(value) => setFormState(prev => ({ ...prev, phone: formatPhone(value) }))}
                placeholder="(11) 99999-9999"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
              {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
            </View>
          </View>

          {/* Session Details */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>💰 Detalhes das Sessões</Text>
            
            {/* Session Price */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Valor da Sessão *</Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencyPrefix}>R$</Text>
                <TextInput
                  style={[styles.priceInput, errors.sessionPrice && styles.inputError]}
                  value={(formState.sessionPrice / 100).toFixed(2).replace('.', ',')}
                  onChangeText={(value) => {
                    const formatted = formatCurrency(value);
                    const priceInCents = Math.round(parseFloat(formatted.replace(',', '.')) * 100) || 0;
                    setFormState(prev => ({ ...prev, sessionPrice: priceInCents }));
                  }}
                  placeholder="300,00"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
              </View>
              {errors.sessionPrice && <Text style={styles.errorText}>{errors.sessionPrice}</Text>}
            </View>

            {/* Therapy Start Date (Optional) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Início da Terapia (opcional)</Text>
              <TextInput
                style={styles.textInput}
                value={formState.therapyStartDate}
                onChangeText={(value) => setFormState(prev => ({ ...prev, therapyStartDate: value }))}
                placeholder="AAAA-MM-DD"
                placeholderTextColor="#999"
              />
              <Text style={styles.inputHint}>Quando o paciente começou a terapia com você</Text>
            </View>

            {/* LV Notas Billing Start Date */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Começar Cobrança LV Notas a Partir de *</Text>
              <TextInput
                style={[styles.textInput, errors.lvNotasBillingStartDate && styles.inputError]}
                value={formState.lvNotasBillingStartDate}
                onChangeText={(value) => setFormState(prev => ({ ...prev, lvNotasBillingStartDate: value }))}
                placeholder="AAAA-MM-DD"
                placeholderTextColor="#999"
              />
              <Text style={styles.inputHint}>
                O LV Notas começará a rastrear pagamentos a partir desta data
              </Text>
              {errors.lvNotasBillingStartDate && <Text style={styles.errorText}>{errors.lvNotasBillingStartDate}</Text>}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            <Pressable style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipButtonText}>⏭️ Pular</Text>
            </Pressable>
            
            <Pressable 
              style={[styles.saveButton, isProcessing && styles.saveButtonDisabled]} 
              onPress={handleSavePatient}
              disabled={isProcessing}
            >
              <Text style={styles.saveButtonText}>
                {isProcessing ? '⏳ Salvando...' : '✅ Salvar e Próximo'}
              </Text>
            </Pressable>
          </View>

          {/* Cancel Import */}
          <Pressable style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancelar Importação</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  eventCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#6200ee',
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  eventDate: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
  },
  groupedSessions: {
    fontSize: 14,
    color: '#6200ee',
    fontWeight: '500',
  },
  formSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
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
  inputHint: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
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
  actionContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  skipButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  skipButtonText: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    backgroundColor: '#6200ee',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#adb5bd',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#6c757d',
  },
  errorText: {
    fontSize: 12,
    color: '#dc3545',
    marginTop: 4,
  },
});