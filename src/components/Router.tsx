// src/components/Router.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { NavigationBar } from './NavigationBar';
import { CheckInForm } from './CheckInForm';
import { Sessions } from './Sessions';
import { PatientManagement } from './PatientManagement';
import { PaymentsOverview } from './payments/PaymentsOverview';
import { Settings } from './Settings';
import { Dashboard } from './dashboard/Dashboard';

// Simple URL-based routing
export const getCurrentPath = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.pathname;
  }
  return '/';
};

export const navigateTo = (path: string) => {
  if (typeof window !== 'undefined') {
    window.history.pushState({}, '', path);
    // Trigger a re-render by dispatching a custom event
    window.dispatchEvent(new Event('popstate'));
  }
};

export const Router: React.FC = () => {
  const { user } = useAuth();
  const [currentRoute, setCurrentRoute] = React.useState(getCurrentPath());

  React.useEffect(() => {
    const handleRouteChange = () => {
      setCurrentRoute(getCurrentPath());
    };

    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  const renderContent = () => {
    switch (currentRoute) {
      case '/':
      case '/dashboard':
        return <Dashboard />;
      case '/payments':
        return <PaymentsOverview />;
      case '/payments':
        return <PaymentsOverview />;
      case '/check-in':
        return <CheckInForm therapistEmail={user.email || ''} />;
      case '/sessoes':
        return <Sessions />;
      case '/pacientes':
        return (
          <PatientManagement
            therapistEmail={user.email || ''}
            onComplete={() => {
              // Navigate back to patients list or refresh
              console.log('Patient management completed');
            }}
          />
        );
      case '/configuracoes':
        return (
          <Settings
            therapistEmail={user.email || ''}
            onLogout={() => {
              // Handle logout - this should call your auth context logout
              console.log('Logout requested');
              // You might want to call: auth.signOut() or similar
            }}
          />
        );
      default:
        return (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>Página não encontrada</Text>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* Layer 1: Fixed Main Navigation */}
      <View style={styles.topNavBar}>
        <NavigationBar />
      </View>

      {/* Layer 2: Content Area (where wizard progress will go when active) */}
      <View style={styles.contentArea}>
        {renderContent()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#f8f9fa',
  } as any,
  topNavBar: {
    height: 90, // Fixed height for main nav
    backgroundColor: '#fff',
    flexShrink: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  contentArea: {
    flex: 1,
    overflow: 'hidden',
  } as any,
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitleText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#6c757d',
  },
  errorText: {
    fontSize: 18,
    color: '#dc3545',
  },
});