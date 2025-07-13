// src/components/NavigationBar.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { navigateTo, getCurrentPath } from './Router';

export const NavigationBar: React.FC = () => {
  const [currentPath, setCurrentPath] = useState(getCurrentPath());

  console.log('NavigationBar render - currentPath:', currentPath);

  useEffect(() => {
    const handlePopState = () => {
      const newPath = getCurrentPath();
      console.log('NavigationBar - URL changed to:', newPath);
      setCurrentPath(newPath);
    };

    // Set initial path
    setCurrentPath(getCurrentPath());

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const NavButton: React.FC<{ path: string; label: string }> = ({ path, label }) => {
    const isActive = currentPath === path ||
      (path === '/' && (currentPath === '/dashboard' || currentPath === '/'));

    return (
      <Pressable
        style={[styles.navButton, isActive && styles.navButtonActive]}
        onPress={() => {
          console.log('Nav button clicked:', path);
          navigateTo(path);
          setCurrentPath(path);
        }}
      >
        <Text style={[styles.navButtonText, isActive && styles.navButtonTextActive]}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>LV Notas</Text>
      <View style={styles.nav}>
        {/* <NavButton path="/" label="Dashboard" /> */}
        <NavButton path="/payments" label="Payments" />
        {/* <NavButton path="/check-in" label="Check-in" /> */}
        {/* <NavButton path="/sessoes" label="Sessões" /> */}
        <NavButton path="/pacientes" label="Pacientes" />
        <NavButton path="/configuracoes" label="Configurações" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 0, // Increase this for more padding
    paddingBottom: 20,   // Add extra bottom padding
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 12,
  },
  nav: {
    flexDirection: 'row',
    gap: 8,
  },
  navButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
  },
  navButtonActive: {
    backgroundColor: '#6200ee',
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6c757d',
  },
  navButtonTextActive: {
    color: '#fff',
  },
});