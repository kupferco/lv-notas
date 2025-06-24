import React, { useState, useEffect } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { CheckInForm } from './src/components/CheckInForm';
import { TherapistOnboarding } from './src/components/TherapistOnboarding';
import { initializeFirebase, auth } from './src/config/firebase';

export default function App() {
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [currentTherapist, setCurrentTherapist] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingMode, setOnboardingMode] = useState<'full' | 'addPatient'>('full');

  useEffect(() => {
    const initializeApp = async () => {
      // Check URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const setupMode = urlParams.get('setup');
      const addPatientMode = urlParams.get('addPatient');
      
      if (setupMode !== null) {
        // Full onboarding for new therapists
        setOnboardingMode('full');
        setIsOnboarding(true);
        setIsLoading(false);
        return;
      }
      
      if (addPatientMode !== null) {
        // Patient management for existing therapists
        const storedTherapist = localStorage.getItem('currentTherapist');
        if (storedTherapist) {
          setCurrentTherapist(storedTherapist);
          setOnboardingMode('addPatient');
          setIsOnboarding(true);
          setIsLoading(false);
          return;
        } else {
          // No stored therapist, redirect to full onboarding
          window.location.href = '/?setup=true';
          return;
        }
      }

      // Check for stored therapist
      const storedTherapist = localStorage.getItem('currentTherapist');
      
      if (storedTherapist) {
        // Validate stored therapist still exists in database
        try {
          // You could add API call here to verify therapist still exists
          setCurrentTherapist(storedTherapist);
          setIsLoading(false);
        } catch (error) {
          // Therapist not found, clear storage and onboard
          localStorage.removeItem('currentTherapist');
          setIsOnboarding(true);
          setIsLoading(false);
        }
      } else {
        // No stored therapist - check if we're in production with Firebase auth
        const isDevelopment = window.location.hostname.includes('localhost');
        
        if (isDevelopment) {
          // Development: require onboarding
          setIsOnboarding(true);
          setIsLoading(false);
        } else {
          // Production: check Firebase auth
          try {
            await initializeFirebase();
            const user = auth?.currentUser;
            
            if (user?.email) {
              localStorage.setItem('currentTherapist', user.email);
              setCurrentTherapist(user.email);
            } else {
              setIsOnboarding(true);
            }
          } catch (error) {
            setIsOnboarding(true);
          }
          setIsLoading(false);
        }
      }
    };

    initializeApp();
  }, []);

  const handleOnboardingComplete = (therapistEmail: string) => {
    // Store therapist in localStorage
    localStorage.setItem('currentTherapist', therapistEmail);
    setIsOnboarding(false);
    setCurrentTherapist(therapistEmail);
    
    // Clear URL parameters after completion
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/');
    }
  };

  const handlePatientManagementComplete = () => {
    // Just close patient management and go back to check-in
    setIsOnboarding(false);
    
    // Clear URL parameters
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <div style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <p>Carregando...</p>
        </div>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {isOnboarding ? (
        <TherapistOnboarding 
          onComplete={onboardingMode === 'full' ? handleOnboardingComplete : handlePatientManagementComplete}
          mode={onboardingMode}
          existingTherapist={onboardingMode === 'addPatient' ? currentTherapist : undefined}
        />
      ) : (
        <CheckInForm therapistEmail={currentTherapist} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});