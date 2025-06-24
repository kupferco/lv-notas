import React, { useState, useEffect } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { Router } from './src/components/Router';
import { NavigationBar } from './src/components/NavigationBar';

const App: React.FC = () => {
  const [therapistEmail, setTherapistEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkExistingLogin = () => {
      const savedEmail = localStorage.getItem('therapist_email');
      console.log('Checking localStorage for therapist_email:', savedEmail);
      if (savedEmail) {
        setTherapistEmail(savedEmail);
      }
      setIsLoading(false);
    };

    checkExistingLogin();
  }, []);

  const handleOnboardingComplete = (email: string) => {
    console.log('Onboarding complete with email:', email);
    localStorage.setItem('therapist_email', email);
    setTherapistEmail(email);
    
    // After onboarding, redirect to check-in page
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new Event('popstate'));
  };

  const handleLogout = () => {
    localStorage.removeItem('therapist_email');
    setTherapistEmail(null);
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new Event('popstate'));
  };

  if (isLoading) {
    return null;
  }

  // Check for setup parameter to force onboarding
  const urlParams = new URLSearchParams(window.location.search);
  const forceSetup = urlParams.has('setup');
  
  if (forceSetup || !therapistEmail) {
    return <Router therapistEmail={null} onOnboardingComplete={handleOnboardingComplete} onLogout={handleLogout} />;
  }

  // Show main app with navigation
  return (
    <SafeAreaView style={styles.container}>
      <NavigationBar />
      <Router therapistEmail={therapistEmail} onOnboardingComplete={handleOnboardingComplete} onLogout={handleLogout} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
});

export default App;