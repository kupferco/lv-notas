// src/components/payments/PaymentActionButton.tsx

import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { PaymentActionButtonProps } from '../../types/payments';

export const PaymentActionButton: React.FC<PaymentActionButtonProps> = ({
  showButton,
  buttonText,
  buttonType,
  onPress,
  disabled = false
}) => {
  // Don't render anything if button shouldn't be shown
  if (!showButton) {
    return null;
  }

  const getButtonStyle = () => {
    if (disabled) {
      return [styles.button, styles.disabledButton];
    }

    switch (buttonType) {
      case 'invoice':
        return [styles.button, styles.invoiceButton];
      case 'reminder':
        return [styles.button, styles.reminderButton];
      default:
        return [styles.button, styles.defaultButton];
    }
  };

  const getTextStyle = () => {
    if (disabled) {
      return [styles.buttonText, styles.disabledButtonText];
    }

    switch (buttonType) {
      case 'invoice':
        return [styles.buttonText, styles.invoiceButtonText];
      case 'reminder':
        return [styles.buttonText, styles.reminderButtonText];
      default:
        return [styles.buttonText, styles.defaultButtonText];
    }
  };

  const getButtonIcon = () => {
    switch (buttonType) {
      case 'invoice':
        return '💰';
      case 'reminder':
        return '📝';
      default:
        return '';
    }
  };

  return (
    <Pressable
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled}
      android_ripple={{ color: 'rgba(255, 255, 255, 0.3)' }}
    >
      {disabled ? (
        <ActivityIndicator size="small" color="#6c757d" />
      ) : (
        <Text style={getTextStyle()}>
          {buttonText}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
    maxWidth: 180,
    minHeight: 40,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  invoiceButton: {
    backgroundColor: '#6200ee',
    borderWidth: 2,
    borderColor: '#6200ee',
  },
  reminderButton: {
    backgroundColor: '#dc3545',
    borderWidth: 2,
    borderColor: '#dc3545',
  },
  defaultButton: {
    backgroundColor: '#6c757d',
    borderWidth: 2,
    borderColor: '#6c757d',
  },
  disabledButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#dee2e6',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
  invoiceButtonText: {
    color: '#fff',
  },
  reminderButtonText: {
    color: '#fff',
  },
  defaultButtonText: {
    color: '#fff',
  },
  disabledButtonText: {
    color: '#6c757d',
  },
});