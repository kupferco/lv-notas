// src/components/auth/AuthNavigator.tsx
// Main authentication navigator managing login, register, and forgot password flows

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { SessionTimeoutModal } from '../common/SessionTimeoutModal';
import { useAuth } from '../../contexts/AuthContext';
import { activityMonitor } from '../../utils/activityMonitor'; // Import the activity monitor

type AuthScreen = 'login' | 'register' | 'forgotPassword';

interface AuthNavigatorProps {
    onAuthSuccess?: () => void;
    initialScreen?: AuthScreen;
    invitationToken?: string;
}

export const AuthNavigator: React.FC<AuthNavigatorProps> = ({
    onAuthSuccess,
    initialScreen = 'login',
    invitationToken,
}) => {
    const [currentScreen, setCurrentScreen] = useState<AuthScreen>(initialScreen);
    const {
        user,
        isLoading,
        showSessionWarning,
        dismissSessionWarning,
        extendSession,
        signOut
    } = useAuth();

    // Add this at the top of your AuthNavigator component
    console.log('🔍 AuthNavigator render:', {
        user: !!user,
        isLoading,
        currentScreen,
        userEmail: user?.email,
        showSessionWarning // Add this to track warning state
    });

    // CRITICAL: Control activity monitor based on warning state
    useEffect(() => {
        if (showSessionWarning) {
            console.log('🚨 Session warning modal appeared - pausing activity monitoring');
            activityMonitor.setWarningActive(true);
        } else {
            console.log('✅ Session warning modal closed - resuming activity monitoring');
            activityMonitor.setWarningActive(false);
        }
        
        // Cleanup: ensure activity monitoring is resumed if component unmounts
        return () => {
            activityMonitor.setWarningActive(false);
        };
    }, [showSessionWarning]);

    // Update the useEffect with more logging
    useEffect(() => {
        console.log('🔍 AuthNavigator useEffect triggered:', {
            user: !!user,
            isLoading,
            hasOnAuthSuccess: !!onAuthSuccess,
            userEmail: user?.email
        });

        if (user && onAuthSuccess) {
            console.log('✅ User authenticated, calling onAuthSuccess');
            onAuthSuccess();
        }
    }, [user, onAuthSuccess]);

    // Auto-navigate to register if invitation token is provided
    useEffect(() => {
        if (invitationToken && currentScreen === 'login') {
            setCurrentScreen('register');
        }
    }, [invitationToken, currentScreen]);

    const handleShowLogin = () => {
        setCurrentScreen('login');
    };

    const handleShowRegister = () => {
        setCurrentScreen('register');
    };

    const handleShowForgotPassword = () => {
        setCurrentScreen('forgotPassword');
    };

    const handleExtendSession = async () => {
        console.log('👤 User clicked "Continue Session" - extending session');
        
        // IMPORTANT: Re-enable activity monitoring BEFORE extending session
        activityMonitor.setWarningActive(false);
        
        const success = await extendSession();
        if (!success) {
            console.log('❌ Failed to extend session - user will be logged out');
        } else {
            console.log('✅ Session extended successfully by user choice');
        }
    };

    const handleSessionTimeout = async () => {
        console.log('🕐 Session timeout - user chose to logout or timer expired');
        
        // Disable activity monitoring completely
        activityMonitor.setWarningActive(false);
        activityMonitor.stopMonitoring();
        
        await signOut();
    };

    const renderCurrentScreen = () => {
        console.log('🔄 Rendering screen:', currentScreen);
        switch (currentScreen) {
            case 'login':
                return (
                    <LoginForm
                        onShowRegister={handleShowRegister}
                        onShowForgotPassword={handleShowForgotPassword}
                    />
                );

            case 'register':
                return (
                    <RegisterForm
                        onSuccess={handleShowLogin}
                        onShowLogin={handleShowLogin}
                        invitationToken={invitationToken}
                    />
                );

            case 'forgotPassword':
                return (
                    <ForgotPasswordForm
                        onSuccess={handleShowLogin}
                        onShowLogin={handleShowLogin}
                    />
                );

            default:
                return (
                    <LoginForm
                        onShowRegister={handleShowRegister}
                        onShowForgotPassword={handleShowForgotPassword}
                    />
                );
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {renderCurrentScreen()}
            </View>

            {/* Session Timeout Warning Modal */}
            <SessionTimeoutModal
                visible={showSessionWarning}
                onExtend={handleExtendSession}
                onLogout={handleSessionTimeout}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});