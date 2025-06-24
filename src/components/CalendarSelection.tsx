import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { apiService } from '../services/api';

interface Calendar {
  id: string;
  summary: string;
  description: string;
  accessRole: string;
  primary: boolean;
}

interface CalendarSelectionProps {
  onCalendarSelected: (calendarId: string) => void;
  onBack: () => void;
}

export const CalendarSelection: React.FC<CalendarSelectionProps> = ({
  onCalendarSelected,
  onBack
}) => {
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCalendars();
  }, []);

  const loadCalendars = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiService.getCalendars();
      setCalendars(data);
      
      // Auto-select primary calendar if available
      const primaryCalendar = data.find(cal => cal.primary);
      if (primaryCalendar) {
        setSelectedCalendar(primaryCalendar.id);
      }
    } catch (error) {
      console.error('Error loading calendars:', error);
      setError('Erro ao carregar calendários. Verifique suas permissões do Google Calendar.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    if (selectedCalendar) {
      onCalendarSelected(selectedCalendar);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Carregando seus calendários...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={loadCalendars}>
          <Text style={styles.retryButtonText}>Tentar Novamente</Text>
        </Pressable>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Selecione seu Google Calendar</Text>
        <Text style={styles.subtitle}>
          Escolha o calendário onde as sessões de terapia serão agendadas:
        </Text>

        <View style={styles.calendarList}>
          {calendars.map((calendar) => (
            <Pressable
              key={calendar.id}
              style={[
                styles.calendarItem,
                selectedCalendar === calendar.id && styles.calendarItemSelected
              ]}
              onPress={() => setSelectedCalendar(calendar.id)}
            >
              <View style={styles.calendarInfo}>
                <Text style={styles.calendarName}>
                  {calendar.summary}
                  {calendar.primary && <Text style={styles.primaryBadge}> (Principal)</Text>}
                </Text>
                {calendar.description && (
                  <Text style={styles.calendarDescription}>{calendar.description}</Text>
                )}
                <Text style={styles.calendarRole}>
                  Permissão: {calendar.accessRole === 'owner' ? 'Proprietário' : 'Editor'}
                </Text>
              </View>
              <View style={styles.radioButton}>
                {selectedCalendar === calendar.id && <View style={styles.radioButtonInner} />}
              </View>
            </Pressable>
          ))}
        </View>

        {calendars.length === 0 && (
          <View style={styles.noCalendarsContainer}>
            <Text style={styles.noCalendarsText}>
              Nenhum calendário encontrado. Verifique se você tem calendários no Google Calendar 
              e se concedeu as permissões necessárias.
            </Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <Pressable style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>Voltar</Text>
          </Pressable>
          <Pressable
            style={[
              styles.continueButton,
              !selectedCalendar && styles.continueButtonDisabled
            ]}
            onPress={handleContinue}
            disabled={!selectedCalendar}
          >
            <Text style={styles.continueButtonText}>Continuar</Text>
          </Pressable>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  calendarList: {
    marginBottom: 30,
  },
  calendarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fafafa',
  },
  calendarItemSelected: {
    borderColor: '#6200ee',
    backgroundColor: '#f3e5f5',
  },
  calendarInfo: {
    flex: 1,
  },
  calendarName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  primaryBadge: {
    color: '#6200ee',
    fontWeight: 'bold',
  },
  calendarDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  calendarRole: {
    fontSize: 12,
    color: '#999',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6200ee',
  },
  noCalendarsContainer: {
    padding: 20,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    marginBottom: 30,
  },
  noCalendarsText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    flex: 1,
    backgroundColor: '#6200ee',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#ccc',
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#6200ee',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
    minWidth: 150,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});