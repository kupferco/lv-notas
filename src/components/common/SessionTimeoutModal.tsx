// src/components/common/SessionTimeoutModal.tsx
// Session timeout warning modal with countdown and extend option

import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

interface SessionTimeoutModalProps {
  visible: boolean;
  onExtend: () => void;
  onLogout: () => void;
}

export const SessionTimeoutModal: React.FC<SessionTimeoutModalProps> = ({
  visible,
  onExtend,
  onLogout,
}) => {
  const [countdown, setCountdown] = useState(60); // 60 seconds countdown
  const [isExtending, setIsExtending] = useState(false);

  useEffect(() => {
    if (!visible) {
      setCountdown(60); // Reset countdown when modal closes
      return;
    }

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Auto-logout when countdown reaches 0
          onLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [visible, onLogout]);

  const handleExtendSession = async () => {
    setIsExtending(true);
    try {
      await onExtend();
    } catch (error) {
      console.error('Error extending session:', error);
    } finally {
      setIsExtending(false);
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {}} // Prevent closing by pressing back/escape
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Warning Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.warningIcon}>⚠️</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>Sessão Expirando</Text>

          {/* Message */}
          <Text style={styles.message}>
            Sua sessão expirará em{' '}
            <Text style={styles.countdown}>{countdown}</Text>{' '}
            segundos devido à inatividade.
          </Text>

          <Text style={styles.submessage}>
            Deseja continuar trabalhando ou fazer logout?
          </Text>

          {/* Countdown Progress Bar */}
          <View style={styles.progressContainer}>
            <View 
              style={[
                styles.progressBar, 
                { 
                  width: `${(countdown / 60) * 100}%`,
                  backgroundColor: countdown > 20 ? '#28a745' : countdown > 10 ? '#ffc107' : '#dc3545'
                }
              ]} 
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Pressable
              style={[styles.button, styles.logoutButton]}
              onPress={onLogout}
              disabled={isExtending}
            >
              <Text style={styles.logoutButtonText}>🚪 Sair</Text>
            </Pressable>

            <Pressable
              style={[styles.button, styles.extendButton, isExtending && styles.buttonDisabled]}
              onPress={handleExtendSession}
              disabled={isExtending}
            >
              <Text style={styles.extendButtonText}>
                {isExtending ? '⏳ Estendendo...' : '⏰ Continuar Trabalhando'}
              </Text>
            </Pressable>
          </View>

          {/* Help Text */}
          <Text style={styles.helpText}>
            A sessão será estendida por mais 1 hora se você escolher continuar.
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    marginBottom: 16,
  },
  warningIcon: {
    fontSize: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#495057',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  submessage: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  countdown: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#dc3545',
  },
  progressContainer: {
    width: '100%',
    height: 4,
    backgroundColor: '#e9ecef',
    borderRadius: 2,
    marginBottom: 24,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 1s ease-out, background-color 0.3s ease',
  } as any,
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  logoutButton: {
    backgroundColor: '#6c757d',
    borderWidth: 1,
    borderColor: '#5a6268',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  extendButton: {
    backgroundColor: '#28a745',
    borderWidth: 1,
    borderColor: '#1e7e34',
  },
  extendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#6c757d',
    borderColor: '#6c757d',
    opacity: 0.6,
  },
  helpText: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 16,
    fontStyle: 'italic',
  },
});