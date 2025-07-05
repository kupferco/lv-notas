// src/contexts/SettingsContext.tsx

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { PaymentMode, ViewMode } from '../config/paymentsMode';

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
  
  // Combined mode info
  getCurrentModeLabel: () => string;
  getCurrentViewLabel: () => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  // Initialize with default values from config
  const [paymentMode, setPaymentModeState] = useState<PaymentMode>('simple');
  const [viewMode, setViewModeState] = useState<ViewMode>('list');

  // Payment mode helpers
  const isSimpleMode = () => paymentMode === 'simple';
  const isAdvancedMode = () => paymentMode === 'advanced';

  // View mode helpers
  const isCardView = () => viewMode === 'card';
  const isListView = () => viewMode === 'list';

  // Mode setters with logging for debugging
  const setPaymentMode = (mode: PaymentMode) => {
    console.log(`Switching payment mode from ${paymentMode} to ${mode}`);
    setPaymentModeState(mode);
  };

  const setViewMode = (mode: ViewMode) => {
    console.log(`Switching view mode from ${viewMode} to ${mode}`);
    setViewModeState(mode);
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
    getCurrentModeLabel,
    getCurrentViewLabel,
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