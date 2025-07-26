// src/components/common/SessionTimeoutModal.tsx
// Session timeout warning modal with countdown and extend option

import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';

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
  const [countdown, setCountdown] = useState(60);
  const [isExtending, setIsExtending] = useState(false);
  const [sessionConfig, setSessionConfig] = useState<{
    warningMinutes: number;
    extendDuration: string;
  }>({
    warningMinutes: 1,
    extendDuration: '1 hora'
  });

  // Get session configuration from backend when modal opens
  useEffect(() => {
    if (!visible) {
      return;
    }

    const fetchSessionConfig = async () => {
      try {
        const status = await authService.checkSessionStatus();
        if (status) {
          // Convert backend config to readable format
          const warningMinutes = status.warningTimeoutMinutes || 1;
          const warningSeconds = Math.max(warningMinutes * 60, 10); // Minimum 10 seconds
          
          // Try to infer extend duration from backend data
          // This is a reasonable assumption - most systems extend by the same duration as the original session
          let extendDuration = '1 hora'; // Default fallback
          
          if (status.inactiveTimeoutMinutes) {
            const minutes = status.inactiveTimeoutMinutes;
            if (minutes >= 60) {
              const hours = Math.round(minutes / 60);
              extendDuration = hours === 1 ? '1 hora' : `${hours} horas`;
            } else {
              extendDuration = minutes === 1 ? '1 minuto' : `${minutes} minutos`;
            }
          }

          setSessionConfig({
            warningMinutes,
            extendDuration
          });
          
          setCountdown(warningSeconds);
          
          console.log('📊 Session config from backend:', {
            warningMinutes,
            extendDuration,
            initialCountdown: warningSeconds
          });
        }
      } catch (error) {
        console.error('Error fetching session config:', error);
        // Use defaults if backend call fails
        setCountdown(60);
      }
    };

    fetchSessionConfig();
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
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

  // Format countdown for display
  const formatCountdown = (seconds: number): string => {
    if (seconds >= 60) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return seconds.toString();
  };

  if (!visible) {
    return null;
  }

  const initialCountdown = sessionConfig.warningMinutes * 60;
  const progressPercent = (countdown / Math.max(initialCountdown, 60)) * 100;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.iconContainer}>
            <Text style={styles.warningIcon}>⚠️</Text>
          </View>

          <Text style={styles.title}>Sessão Expirando</Text>

          <Text style={styles.message}>
            Sua sessão expirará em{' '}
            <Text style={styles.countdown}>{formatCountdown(countdown)}</Text>{' '}
            {countdown >= 60 ? 'minutos' : 'segundos'} devido à inatividade.
          </Text>

          <Text style={styles.submessage}>
            Deseja continuar trabalhando ou fazer logout?
          </Text>

          <View style={styles.progressContainer}>
            <View 
              style={[
                styles.progressBar, 
                { 
                  width: `${progressPercent}%`,
                  backgroundColor: progressPercent > 33 ? '#28a745' 
                                 : progressPercent > 17 ? '#ffc107' 
                                 : '#dc3545'
                }
              ]} 
            />
          </View>

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

          {/* Dynamic help text based on backend configuration */}
          <Text style={styles.helpText}>
            A sessão será estendida por mais {sessionConfig.extendDuration} se você escolher continuar.
          </Text>

          {/* Debug info in development */}
          {process.env.NODE_ENV === 'development' && (
            <Text style={styles.debugText}>
              Backend config: aviso={sessionConfig.warningMinutes}min, extensão={sessionConfig.extendDuration}
            </Text>
          )}
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
  debugText: {
    fontSize: 10,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 8,
    fontFamily: 'monospace',
    fontStyle: 'italic',
  },
});