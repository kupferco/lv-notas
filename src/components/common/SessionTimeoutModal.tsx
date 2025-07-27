// src/components/common/SessionTimeoutModal.tsx
// Session timeout warning modal with dynamic countdown and extend option

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
    const [initialCountdown, setInitialCountdown] = useState(60);
    const [isExtending, setIsExtending] = useState(false);
    const [sessionConfig, setSessionConfig] = useState<{
        warningMinutes: number;
        extendDuration: string;
    }>({
        warningMinutes: 1,
        extendDuration: '1 hora'
    });

    // Get session configuration and real-time countdown from backend when modal opens
    useEffect(() => {
        if (!visible) {
            return;
        }

        const fetchSessionConfig = async () => {
            try {
                const status = await authService.checkSessionStatus();
                if (status) {
                    // Use ACTUAL remaining time until session expires
                    const actualRemainingSeconds = Math.max(
                        Math.floor((status.timeUntilExpiryMs || 0) / 1000),
                        5 // Minimum 5 seconds to give user time to react
                    );

                    const warningMinutes = status.warningTimeoutMinutes || 1;

                    // Calculate extend duration from backend session configuration
                    let extendDuration = '1 hora'; // Default fallback

                    if (status.inactiveTimeoutMinutes) {
                        const minutes = status.inactiveTimeoutMinutes;
                        if (minutes >= 60) {
                            const hours = Math.round(minutes / 60);
                            extendDuration = hours === 1 ? '1 hora' : `${hours} horas`;
                        } else if (minutes >= 1) {
                            extendDuration = minutes === 1 ? '1 minuto' : `${minutes} minutos`;
                        } else {
                            // For very short sessions (like rapid testing)
                            const seconds = minutes * 60;
                            extendDuration = `${seconds} segundos`;
                        }
                    }

                    setSessionConfig({
                        warningMinutes,
                        extendDuration
                    });

                    // Set both current countdown and initial value for progress calculation
                    setCountdown(actualRemainingSeconds);
                    setInitialCountdown(actualRemainingSeconds);

                    console.log('📊 Modal session config from backend:', {
                        warningMinutes,
                        extendDuration,
                        actualRemainingSeconds,
                        timeUntilExpiryMs: status.timeUntilExpiryMs,
                        inactiveTimeoutMinutes: status.inactiveTimeoutMinutes
                    });
                }
            } catch (error) {
                console.error('Error fetching session config for modal:', error);
                // Use reasonable defaults if backend call fails
                const defaultSeconds = 60;
                setCountdown(defaultSeconds);
                setInitialCountdown(defaultSeconds);
            }
        };

        fetchSessionConfig();
    }, [visible]);

    // Countdown timer
    useEffect(() => {
        if (!visible) {
            return;
        }

        const interval = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    console.log('⏰ Modal countdown reached zero - triggering logout');
                    onLogout();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [visible, onLogout]);

    // Activity monitor control - pause when modal is visible
    useEffect(() => {
        const controlActivityMonitor = async () => {
            try {
                const { activityMonitor } = await import('../../utils/activityMonitor');

                if (visible) {
                    console.log('🚨 Modal opened - pausing activity monitoring');
                    activityMonitor.setWarningActive(true);
                    console.log('🔍 Activity monitor status after pause:', activityMonitor.getStatus());
                } else {
                    console.log('✅ Modal closed - resuming activity monitoring');
                    activityMonitor.setWarningActive(false);
                    console.log('🔍 Activity monitor status after resume:', activityMonitor.getStatus());
                }
            } catch (error) {
                console.error('❌ Failed to control activity monitor:', error);
            }
        };

        controlActivityMonitor();
    }, [visible]);

    const handleExtendSession = async () => {
        setIsExtending(true);
        try {
            console.log('🔄 User clicked extend session in modal');
            await onExtend();
        } catch (error) {
            console.error('Error extending session from modal:', error);
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

    // Get appropriate time unit for display
    const getTimeUnit = (seconds: number): string => {
        return seconds >= 60 ? 'minutos' : 'segundos';
    };

    if (!visible) {
        return null;
    }

    // Calculate progress percentage based on actual remaining time
    const progressPercent = Math.max((countdown / Math.max(initialCountdown, 1)) * 100, 0);

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => { }}
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
                        {getTimeUnit(countdown)} devido à inatividade.
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

                    {/* Dynamic help text based on actual backend configuration */}
                    <Text style={styles.helpText}>
                        A sessão será estendida por mais {sessionConfig.extendDuration} se você escolher continuar.
                    </Text>

                    {/* Debug info in development - now shows actual values */}
                    {process.env.NODE_ENV === 'development' && (
                        <Text style={styles.debugText}>
                            Config: warning={sessionConfig.warningMinutes}min, extend={sessionConfig.extendDuration}, countdown={countdown}s/{initialCountdown}s
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