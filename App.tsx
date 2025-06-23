import React, { useState, useEffect } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { CheckInForm } from './src/components/CheckInForm';
import { TherapistOnboarding } from './src/components/TherapistOnboarding';

export default function App() {
  const [isOnboarding, setIsOnboarding] = useState(false);

  useEffect(() => {
    // Check URL parameters to determine if this is onboarding
    const urlParams = new URLSearchParams(window.location.search);
    const setupMode = urlParams.get('setup');
    
    if (setupMode !== null) {
      setIsOnboarding(true);
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {isOnboarding ? (
        <TherapistOnboarding />
      ) : (
        <CheckInForm />
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
