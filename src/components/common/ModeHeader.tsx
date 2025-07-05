// src/components/common/ModeHeader.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ToggleSwitch } from './ToggleSwitch';
import { useSettings } from '../../contexts/SettingsContext';
import { PaymentMode, ViewMode } from '../../config/paymentsMode';

interface ModeHeaderProps {
  title?: string;
  showPaymentMode?: boolean;
  showViewMode?: boolean;
  style?: any;
}

export const ModeHeader: React.FC<ModeHeaderProps> = ({
  title,
  showPaymentMode = true,
  showViewMode = true,
  style
}) => {
  const {
    paymentMode,
    setPaymentMode,
    viewMode,
    setViewMode,
    autoCheckInMode,
    getCurrentModeLabel,
    getCurrentViewLabel
  } = useSettings();

  const paymentModeOptions = [
    { label: 'Simples', value: 'simple' as PaymentMode },
    { label: 'Avançado', value: 'advanced' as PaymentMode }
  ];

  const viewModeOptions = [
    { label: 'Cartões', value: 'card' as ViewMode, icon: '🃏' },
    { label: 'Lista', value: 'list' as ViewMode, icon: '📋' }
  ];

  return (
    <View style={[styles.container, style]}>
      {title && (
        <Text style={styles.title}>{title}</Text>
      )}
      
      <View style={styles.togglesContainer}>
        {showPaymentMode && (
          <View style={styles.toggleGroup}>
            <Text style={styles.toggleLabel}>Modo:</Text>
            <ToggleSwitch
              options={paymentModeOptions}
              selectedValue={paymentMode}
              onValueChange={(value) => setPaymentMode(value as PaymentMode)}
              style={styles.toggle}
            />
          </View>
        )}

        {showViewMode && (
          <View style={styles.toggleGroup}>
            <Text style={styles.toggleLabel}>Visualização:</Text>
            <ToggleSwitch
              options={viewModeOptions}
              selectedValue={viewMode}
              onValueChange={(value) => setViewMode(value as ViewMode)}
              style={styles.toggle}
            />
          </View>
        )}
      </View>

      {/* Current mode indicator */}
      <View style={styles.currentModeContainer}>
        <Text style={styles.currentModeText}>
          {getCurrentModeLabel()} • {getCurrentViewLabel()}
          {showPaymentMode && autoCheckInMode && ' • ⚡ Check-in Automático'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  togglesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  toggleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    minWidth: 60,
  },
  toggle: {
    minWidth: 120,
  },
  currentModeContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  currentModeText: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
});