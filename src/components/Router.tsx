import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckInForm } from './CheckInForm';
import { PatientManagement } from './PatientManagement';
import { TherapistOnboarding } from './TherapistOnboarding';
import { Settings } from './Settings';

interface RouterProps {
  therapistEmail: string | null;
  onOnboardingComplete: (email: string) => void;
  onLogout: () => void;
}

export const Router: React.FC<RouterProps> = ({ therapistEmail, onOnboardingComplete, onLogout }) => {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  
  console.log('Router render - currentPath:', currentPath, 'therapistEmail:', therapistEmail);
  
  // Listen for URL changes (back/forward buttons, direct navigation)
  useEffect(() => {
    const handlePopState = () => {
      console.log('URL changed to:', window.location.pathname);
      setCurrentPath(window.location.pathname);
    };

    // Set initial path
    setCurrentPath(window.location.pathname);
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // If no therapist is logged in, always show onboarding
  if (!therapistEmail) {
    console.log('No therapist, showing onboarding');
    return <TherapistOnboarding onComplete={onOnboardingComplete} />;
  }

  console.log('Routing to path:', currentPath);

  // Route based on current path
  switch (currentPath) {
    case '/check-in':
      console.log('Rendering CheckInForm');
      return <CheckInForm therapistEmail={therapistEmail} />;

    case '/pacientes':
      console.log('Rendering PatientManagement');
      return (
        <PatientManagement
          therapistEmail={therapistEmail}
          onComplete={() => {
            // After adding patients, stay on this page
          }}
        />
      );

    case '/configuracoes':
      console.log('Rendering Settings');
      return <Settings therapistEmail={therapistEmail} onLogout={onLogout} />;
    
    case '/dashboard':
    case '/':
    default:
      console.log('Rendering Dashboard');
      return (
        <View style={styles.dashboardContainer}>
          <Text style={styles.dashboardTitle}>Dashboard</Text>
          <Text style={styles.dashboardSubtitle}>
            Aqui você terá uma visão geral das suas sessões, pacientes e estatísticas.
          </Text>
          <Text style={styles.comingSoon}>Em breve! 🚀</Text>
        </View>
      );
  }
};

const styles = StyleSheet.create({
  dashboardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  dashboardTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 16,
    textAlign: 'center',
  },
  dashboardSubtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  comingSoon: {
    fontSize: 18,
    color: '#6200ee',
    fontWeight: '600',
  },
});

// Navigation helper functions
export const navigateTo = (path: string) => {
  console.log('Navigating to:', path);
  window.history.pushState({}, '', path);
  // Trigger a re-render by dispatching a custom event
  window.dispatchEvent(new Event('popstate'));
};

export const getCurrentPath = () => window.location.pathname;