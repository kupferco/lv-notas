// src/components/payments/PaymentActionButton.tsx

import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';

interface PaymentActionButtonProps {
  showButton: boolean;
  buttonText: string;
  buttonType: 'invoice' | 'reminder' | '';
  onPress: () => void;
  disabled?: boolean;
}

export const PaymentActionButton: React.FC<PaymentActionButtonProps> = ({
  showButton,
  buttonText,
  buttonType,
  onPress,
  disabled = false
}) => {
  if (!showButton || !buttonText) {
    return null;
  }

  const getButtonStyle = () => {
    switch (buttonType) {
      case 'invoice':
        return [styles.button, styles.invoiceButton, disabled && styles.buttonDisabled];
      case 'reminder':
        return [styles.button, styles.reminderButton, disabled && styles.buttonDisabled];
      default:
        return [styles.button, styles.defaultButton, disabled && styles.buttonDisabled];
    }
  };

  const handlePress = () => {
    if (!disabled && onPress) {
      console.log(`🔘 PaymentActionButton pressed: ${buttonText} (${buttonType})`);
      onPress();
    }
  };

  return (
    <Pressable
      style={getButtonStyle()}
      onPress={handlePress}
      disabled={disabled}
    >
      <Text style={[styles.buttonText, disabled && styles.buttonTextDisabled]}>
        {buttonText}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 2,        // Very small padding
    paddingHorizontal: 6,      // Very small padding
    borderRadius: 8,           // Small pill
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 28,              // Very narrow - just for emoji
    marginBottom: 2,
    alignSelf: 'flex-end',     // Right align
  },

  buttonText: {
    fontSize: 12,              // Just show emoji clearly
    fontWeight: '600',
    color: '#fff',
  },
  invoiceButton: {
    backgroundColor: '#28a745',
    borderWidth: 1,
    borderColor: '#28a745',
  },
  reminderButton: {
    backgroundColor: '#ffc107',
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  defaultButton: {
    backgroundColor: '#6200ee',
    borderWidth: 1,
    borderColor: '#6200ee',
  },
  buttonDisabled: {
    backgroundColor: '#6c757d',
    borderColor: '#6c757d',
    opacity: 0.6,
  },
  buttonTextDisabled: {
    color: '#fff',
    opacity: 0.8,
  },
});