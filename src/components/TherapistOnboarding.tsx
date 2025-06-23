import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { initializeFirebase, auth } from '../config/firebase';
import { apiService } from '../services/api';
import type { Therapist, OnboardingState } from '../types';

export const TherapistOnboarding = () => {
  const [state, setState] = useState<OnboardingState>({ step: 'welcome' });
  const [isLoading, setIsLoading] = useState(false);

  const handleGetStarted = async () => {
    setIsLoading(true);
    setState({ step: 'auth' });
    
    try {
      await initializeFirebase();
      const user = auth?.currentUser;
      
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
        error: 'Authentication failed. Please try again.' 
      });
      setIsLoading(false);
    }
  };

  const handleAuthSuccess = async (user: any) => {
    setIsLoading(true);
    setState({ step: 'calendar' });

    try {
      // Check if therapist already exists
      const existingTherapist = await apiService.getTherapistByEmail(user.email);
      
      if (existingTherapist) {
        // Therapist already exists, go to success
        setState({ 
          step: 'success', 
          therapist: existingTherapist 
        });
      } else {
        // Create new therapist
        const newTherapist = await apiService.createTherapist({
          name: user.displayName || user.email,
          email: user.email,
          googleCalendarId: '', // Will be set when they grant calendar access
        });
        
        setState({ 
          step: 'success', 
          therapist: newTherapist 
        });
      }
    } catch (error) {
      console.error('Therapist creation error:', error);
      setState({ 
        step: 'auth', 
        error: 'Failed to set up your account. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderWelcomeStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Welcome to LV Notas</Text>
      <Text style={styles.subtitle}>
        Connect your Google Calendar to start managing therapy sessions
      </Text>
      
      <View style={styles.featureList}>
        <Text style={styles.feature}>📅 Automatic session tracking</Text>
        <Text style={styles.feature}>👥 Patient check-in system</Text>
        <Text style={styles.feature}>🔄 Real-time calendar sync</Text>
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
          {isLoading ? 'Setting up...' : 'Get Started with Google'}
        </Text>
      </Pressable>

      <Text style={styles.disclaimer}>
        By continuing, you agree to connect your Google Calendar with LV Notas
      </Text>
    </View>
  );

  const renderAuthStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Connecting to Google</Text>
      <ActivityIndicator size="large" color="#6200ee" style={styles.loader} />
      <Text style={styles.subtitle}>
        Please complete the Google sign-in process in the popup window
      </Text>
    </View>
  );

  const renderCalendarStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Setting up your account...</Text>
      <ActivityIndicator size="large" color="#6200ee" style={styles.loader} />
      <Text style={styles.subtitle}>
        We're configuring your calendar integration
      </Text>
    </View>
  );

  const renderSuccessStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>🎉 You're all set!</Text>
      <Text style={styles.subtitle}>
        Welcome {state.therapist?.name}! Your Google Calendar is now connected.
      </Text>

      <View style={styles.successInfo}>
        <Text style={styles.infoTitle}>What happens next:</Text>
        <Text style={styles.infoItem}>• Calendar events automatically create sessions</Text>
        <Text style={styles.infoItem}>• Patients can check in using their unique link</Text>
        <Text style={styles.infoItem}>• All data syncs in real-time</Text>
      </View>

      <View style={styles.linkContainer}>
        <Text style={styles.linkTitle}>Your patient check-in page:</Text>
        <Text style={styles.linkText}>
          https://lv-notas.web.app/checkin
        </Text>
      </View>

      <Pressable 
        style={styles.primaryButton}
        onPress={() => window.location.href = '/checkin'}
      >
        <Text style={styles.buttonText}>Go to Check-in Page</Text>
      </Pressable>
    </View>
  );

  // Listen for auth state changes
  useEffect(() => {
    if (auth) {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user && state.step === 'auth') {
          handleAuthSuccess(user);
        }
      });
      return unsubscribe;
    }
  }, [state.step]);

  const renderCurrentStep = () => {
    switch (state.step) {
      case 'welcome':
        return renderWelcomeStep();
      case 'auth':
        return renderAuthStep();
      case 'calendar':
        return renderCalendarStep();
      case 'success':
        return renderSuccessStep();
      default:
        return renderWelcomeStep();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${(Object.keys({ welcome: 1, auth: 2, calendar: 3, success: 4 })[state.step] || 1) * 25}%` }
            ]} 
          />
        </View>
      </View>
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
  linkContainer: {
    backgroundColor: '#e2e3e5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    width: '100%',
    maxWidth: 400,
  },
  linkTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  linkText: {
    fontSize: 14,
    color: '#6200ee',
    fontFamily: 'monospace',
  },
});