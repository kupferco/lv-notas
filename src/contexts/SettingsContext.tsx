// src/contexts/SettingsContext.tsx

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { PaymentMode, ViewMode } from '../config/paymentsMode';
import { apiService } from '../services/api';

interface SettingsContextType {
  // Payment Mode
  paymentMode: PaymentMode;
  setPaymentMode: (mode: PaymentMode) => void;
  isSimpleMode: () => boolean;
  isAdvancedMode: () => boolean;

  // View Mode
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isCardView: () => boolean;
  isListView: () => boolean;

  // Auto Check-in Mode
  autoCheckInMode: boolean;
  setAutoCheckInMode: (enabled: boolean) => void;
  isAutoCheckInEnabled: () => boolean;

  // Combined mode info
  getCurrentModeLabel: () => string;
  getCurrentViewLabel: () => string;

  loadSettingsFromAPI: (therapistEmail: string) => Promise<void>;
  saveSettingsToAPI: (therapistEmail: string, overrideSettings?: {
    payment_mode?: string;
    view_mode?: string;
    auto_check_in_mode?: string;
  }) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  // Initialize with default values from config
  const [paymentMode, setPaymentModeState] = useState<PaymentMode>('simple');
  const [viewMode, setViewModeState] = useState<ViewMode>('list');
  const [autoCheckInMode, setAutoCheckInModeState] = useState<boolean>(false);

  // ADD THESE NEW FUNCTIONS HERE (inside the component)
  const loadSettingsFromAPI = async (therapistEmail: string) => {
    if (!therapistEmail) {
      console.warn('Cannot load settings: therapistEmail is required');
      return;
    }

    try {
      console.log(`📖 Loading settings from API for: ${therapistEmail}`);

      const response = await apiService.getTherapistSettings(therapistEmail);
      console.log('📊 Settings loaded from API:', response.settings);

      // Update state with loaded settings (using defaults if not found)
      setPaymentModeState(response.settings.payment_mode === 'advanced' ? 'advanced' : 'simple');
      setViewModeState(response.settings.view_mode === 'list' ? 'list' : 'card');
      setAutoCheckInModeState(response.settings.auto_check_in_mode === 'true');

      console.log('✅ Settings applied to context state');

    } catch (error: any) {
      console.error('❌ Error loading settings from API:', error);

      // If it's a 404, therapist doesn't exist yet - that's okay, use defaults
      if (error.message?.includes('404')) {
        console.log('👤 Therapist settings not found, using defaults');
      } else {
        console.error('🚨 Settings API error:', error.message);
      }

      // Keep default values - don't throw error
    }
  };

  const saveSettingsToAPI = async (
    therapistEmail: string,
    overrideSettings?: {
      payment_mode?: string;
      view_mode?: string;
      auto_check_in_mode?: string;
    }
  ) => {
    if (!therapistEmail) {
      console.warn('Cannot save settings: therapistEmail is required');
      return;
    }

    try {
      console.log(`💾 Saving settings to API for: ${therapistEmail}`);

      const settingsToSave = {
        payment_mode: overrideSettings?.payment_mode || paymentMode,
        view_mode: overrideSettings?.view_mode || viewMode,
        auto_check_in_mode: overrideSettings?.auto_check_in_mode || autoCheckInMode.toString()
      };

      console.log('📤 Settings to save:', settingsToSave);

      const response = await apiService.updateTherapistSettings(therapistEmail, settingsToSave);
      console.log('✅ Settings saved successfully:', response);

    } catch (error: any) {
      console.error('❌ Error saving settings to API:', error);
      throw error;
    }
  };

  // Payment mode helpers
  const isSimpleMode = () => paymentMode === 'simple';
  const isAdvancedMode = () => paymentMode === 'advanced';

  // View mode helpers
  const isCardView = () => viewMode === 'card';
  const isListView = () => viewMode === 'list';

  // Auto check-in helpers
  const isAutoCheckInEnabled = () => autoCheckInMode;

  // Mode setters with logging for debugging
  const setPaymentMode = (mode: PaymentMode) => {
    console.log(`Switching payment mode from ${paymentMode} to ${mode}`);
    setPaymentModeState(mode);
  };

  const setViewMode = (mode: ViewMode) => {
    console.log(`Switching view mode from ${viewMode} to ${mode}`);
    setViewModeState(mode);
  };

  const setAutoCheckInMode = (enabled: boolean) => {
    console.log(`Switching auto check-in mode from ${autoCheckInMode} to ${enabled}`);
    setAutoCheckInModeState(enabled);
  };

  // Display labels
  const getCurrentModeLabel = () => {
    return paymentMode === 'simple' ? 'Simples' : 'Avançado';
  };

  const getCurrentViewLabel = () => {
    return viewMode === 'card' ? 'Cartões' : 'Lista';
  };

  const contextValue: SettingsContextType = {
    paymentMode,
    setPaymentMode,
    isSimpleMode,
    isAdvancedMode,
    viewMode,
    setViewMode,
    isCardView,
    isListView,
    autoCheckInMode,
    setAutoCheckInMode,
    isAutoCheckInEnabled,
    getCurrentModeLabel,
    getCurrentViewLabel,

    loadSettingsFromAPI,
    saveSettingsToAPI,
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};

// Custom hook to use the settings context
export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

// Export types for use in other components
export type { SettingsContextType };