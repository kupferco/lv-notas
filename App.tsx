import React, { useState, useEffect } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { CheckInForm } from './src/components/CheckInForm';
import { TherapistOnboarding } from './src/components/TherapistOnboarding';

export default function App() {
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [currentTherapist, setCurrentTherapist] = useState<string | null>(null);

  useEffect(() => {
    // Check URL parameters to determine if this is onboarding
    const urlParams = new URLSearchParams(window.location.search);
    const setupMode = urlParams.get('setup');
    
    if (setupMode !== null) {
      setIsOnboarding(true);
    } else {
      // For normal check-in, set the current therapist
      // In development, use test@example.com
      // In production, this would come from Firebase auth
      const isDevelopment = window.location.hostname.includes('localhost');
      const therapistEmail = isDevelopment ? 'test@example.com' : 'production@email.com';
      setCurrentTherapist(therapistEmail);
    }
  }, []);

  const handleOnboardingComplete = (therapistEmail: string) => {
    setIsOnboarding(false);
    setCurrentTherapist(therapistEmail);
  };

  return (
    <SafeAreaView style={styles.container}>
      {isOnboarding ? (
        <TherapistOnboarding onComplete={handleOnboardingComplete} />
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
