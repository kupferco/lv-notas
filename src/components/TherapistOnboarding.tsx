import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { initializeFirebase, auth } from '../config/firebase';
import { apiService } from '../services/api';
import { PatientManagement } from './PatientManagement';
import { CalendarSelection } from './CalendarSelection';
import type { Therapist, OnboardingState } from '../types';

interface TherapistOnboardingProps {
  onComplete?: (therapistEmail: string) => void;
  mode?: 'full' | 'addPatient';
  existingTherapist?: string | null;
}

export const TherapistOnboarding: React.FC<TherapistOnboardingProps> = ({
  onComplete,
  mode = 'full',
  existingTherapist
}) => {
  const [state, setState] = useState<OnboardingState>({
    step: mode === 'addPatient' ? 'addPatients' : 'welcome'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('');

  // Set up existing therapist for addPatient mode
  useEffect(() => {
    if (mode === 'addPatient' && existingTherapist) {
      setState({
        step: 'addPatients',
        therapist: {
          email: existingTherapist,
          name: existingTherapist.split('@')[0],
          id: 'existing'
        }
      });
    }
  }, [mode, existingTherapist]);

  // Listen for auth state changes ONLY when in auth step
  useEffect(() => {
    if (auth && state.step === 'auth') {
      const unsubscribe = (auth as any).onAuthStateChanged((user: any) => {
        if (user) {
          handleAuthSuccess(user);
        }
      });
      return unsubscribe;
    }
  }, [state.step]);

  const getProgressPercentage = (): number => {
    if (mode === 'addPatient') {
      return 100; // Always full progress for patient management
    }

    const stepMap: Record<string, number> = {
      welcome: 20,
      auth: 40,
      'calendar-selection': 60,
      calendar: 70,
      success: 80,
      addPatients: 100
    };
    return stepMap[state.step] || 20;
  };

  const handleGetStarted = async () => {
    setIsLoading(true);
    setState({ step: 'auth' });

    try {
      // For localhost development, skip Firebase auth
      if (window.location.hostname === 'localhost') {
        console.log('Local development: skipping Firebase auth');
        // Simulate a NEW user for local testing - use timestamp to ensure uniqueness
        const mockUser = {
          email: `test-therapist-${Date.now()}@example.com`,
          displayName: 'Novo Terapeuta',
          getIdToken: () => Promise.resolve('mock-token')
        };
        await handleAuthSuccess(mockUser);
        return;
      }

      await initializeFirebase();
      const user = (auth as any)?.currentUser;

      if (user) {
        // User is already authenticated, move to calendar setup
        await handleAuthSuccess(user);
      } else {
        // Will trigger Firebase auth popup
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setState({
        step: 'welcome',
        error: 'Falha na autenticação. Tente novamente.'
      });
      setIsLoading(false);
    }
  };

  const handleAuthSuccess = async (user: any) => {
    setIsLoading(true);
    setState({ step: 'calendar-selection' });

    console.log('=== AUTH SUCCESS ===');
    console.log('User object:', user);
    console.log('User email:', user.email);

    try {
      // Check if therapist already exists
      const existingTherapist = await apiService.getTherapistByEmail(user.email);
      console.log('Existing therapist check result:', existingTherapist);

      if (existingTherapist) {
        // Existing therapist logic...
      } else {
        // NEW therapist - create account but wait for calendar selection
        console.log('Creating new therapist with data:', {
          name: user.displayName || user.email,
          email: user.email,
          googleCalendarId: ''
        });

        const newTherapist = await apiService.createTherapist({
          name: user.displayName || user.email,
          email: user.email,
          googleCalendarId: '', // Will be set when they select calendar
        });

        console.log('New therapist created:', newTherapist);

        setState({
          step: 'calendar-selection',
          therapist: newTherapist
        });
      }
    } catch (error) {
      console.error('Therapist creation error:', error);
      setState({
        step: 'auth',
        error: 'Falha ao configurar sua conta. Tente novamente.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalendarSelected = async (calendarId: string) => {
    console.log('Calendar selected:', calendarId);
    setSelectedCalendarId(calendarId);
    setIsLoading(true);
    setState({ step: 'calendar' });

    try {
      // Skip API call in development with mock email
      if (state.therapist && !state.therapist.email.includes('test-therapist')) {
        console.log('Updating therapist calendar for:', state.therapist.email);
        await apiService.updateTherapistCalendar(state.therapist.email, calendarId);
        console.log('Calendar update successful');
      } else {
        console.log('Skipping API call for development mock user');
      }

      setState(prev => ({
        ...prev,
        step: 'success',
        therapist: prev.therapist ? { ...prev.therapist, googleCalendarId: calendarId } : undefined
      }));
      console.log('Set step to success');
    } catch (error) {
      console.error('Error saving calendar:', error);
      setState(prev => ({
        ...prev,
        step: 'calendar-selection',
        error: 'Erro ao salvar calendário. Tente novamente.'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToAuth = () => {
    setState({ step: 'auth' });
  };

  const renderWelcomeStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Bem-vindo ao LV Notas</Text>
      <Text style={styles.subtitle}>
        Conecte seu Google Calendar para começar a gerenciar sessões de terapia
      </Text>

      <View style={styles.featureList}>
        <Text style={styles.feature}>📅 Acompanhamento automático de sessões</Text>
        <Text style={styles.feature}>👥 Sistema de check-in de pacientes</Text>
        <Text style={styles.feature}>🔄 Sincronização em tempo real</Text>
      </View>

      {state.error && (
        <Text style={styles.errorText}>{state.error}</Text>
      )}

      <Pressable
        style={styles.primaryButton}
        onPress={handleGetStarted}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Configurando...' : 'Começar com Google'}
        </Text>
      </Pressable>

      <Text style={styles.disclaimer}>
        Ao continuar, você concorda em conectar seu Google Calendar com LV Notas
      </Text>
    </View>
  );

  const renderAuthStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Conectando ao Google</Text>
      <ActivityIndicator size="large" color="#6200ee" style={styles.loader} />
      <Text style={styles.subtitle}>
        Complete o processo de login do Google na janela popup
      </Text>
    </View>
  );

  const renderCalendarSelectionStep = () => (
    <CalendarSelection
      onCalendarSelected={handleCalendarSelected}
      onBack={handleBackToAuth}
    />
  );

  const renderCalendarStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Salvando calendário...</Text>
      <ActivityIndicator size="large" color="#6200ee" style={styles.loader} />
      <Text style={styles.subtitle}>
        Estamos configurando a integração do seu calendário
      </Text>
    </View>
  );

  const renderSuccessStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>🎉 Tudo pronto!</Text>
      <Text style={styles.subtitle}>
        Bem-vindo {state.therapist?.name}! Seu Google Calendar está conectado.
      </Text>

      <View style={styles.successInfo}>
        <Text style={styles.infoTitle}>O que acontece agora:</Text>
        <Text style={styles.infoItem}>• Eventos do calendário criam sessões automaticamente</Text>
        <Text style={styles.infoItem}>• Pacientes podem confirmar presença com link único</Text>
        <Text style={styles.infoItem}>• Todos os dados sincronizam em tempo real</Text>
      </View>

      <Pressable
        style={styles.secondaryButton}
        onPress={() => {
          console.log('Finish Onboarding clicked');
          console.log('onComplete function exists:', !!onComplete);
          console.log('Full therapist object:', state.therapist);
          console.log('therapist email:', state.therapist?.email);

          // Use the email from the mock user if therapist email is missing
          let email = state.therapist?.email;

          // If no email in therapist object, but we have a mock user email stored
          if (!email && window.location.hostname === 'localhost') {
            // For development, we need to use a valid email from the database
            // Let's use the most recent therapist from the database
            email = 'test-therapist-1750778998339@example.com'; // Use one from your database
          }

          console.log('Using email for completion:', email);

          if (onComplete && email) {
            onComplete(email);
          } else {
            console.error('Cannot complete onboarding - missing email or onComplete callback');
          }
        }}
      >
        <Text style={styles.secondaryButtonText}>Finalizar e Ir para App</Text>
      </Pressable>
    </View>
  );

  const renderAddPatientsStep = () => (
    <PatientManagement
      therapistEmail={state.therapist?.email || existingTherapist || ''}
      onComplete={() => {
        console.log('PatientManagement onComplete called');
        // When patient management is complete
        if (onComplete) {
          console.log('Calling onComplete with email:', state.therapist?.email || existingTherapist || '');
          onComplete(state.therapist?.email || existingTherapist || '');
        } else {
          console.log('No onComplete callback available');
        }
      }}
    />
  );

  const renderCurrentStep = () => {
    switch (state.step) {
      case 'welcome':
        return renderWelcomeStep();
      case 'auth':
        return renderAuthStep();
      case 'calendar-selection':
        return renderCalendarSelectionStep();
      case 'calendar':
        return renderCalendarStep();
      case 'success':
        return renderSuccessStep();
      case 'addPatients':
        return renderAddPatientsStep();
      default:
        return renderWelcomeStep();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {mode === 'full' && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${getProgressPercentage()}%` }
              ]}
            />
          </View>
        </View>
      )}
      {renderCurrentStep()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  progressContainer: {
    padding: 20,
    backgroundColor: '#fff',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e9ecef',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6200ee',
    borderRadius: 2,
  },
  stepContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  featureList: {
    marginBottom: 32,
  },
  feature: {
    fontSize: 16,
    color: '#495057',
    marginBottom: 12,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#6200ee',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 16,
    minWidth: 200,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  disclaimer: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 16,
  },
  loader: {
    marginVertical: 24,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8d7da',
    borderRadius: 4,
  },
  successInfo: {
    backgroundColor: '#d1ecf1',
    padding: 20,
    borderRadius: 8,
    marginBottom: 24,
    width: '100%',
    maxWidth: 400,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0c5460',
    marginBottom: 12,
  },
  infoItem: {
    fontSize: 14,
    color: '#0c5460',
    marginBottom: 8,
  },
  secondaryButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#6200ee',
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    color: '#6200ee',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
