// src/components/auth/AuthNavigator.tsx
// Main authentication navigator managing login, register, and forgot password flows

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { SessionTimeoutModal } from '../common/SessionTimeoutModal';
import { useAuth } from '../../contexts/AuthContext';

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
    const [registrationMessage, setRegistrationMessage] = useState<string>('');
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
        showSessionWarning
    });

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
        setRegistrationMessage(''); // Clear any registration messages
    };

    const handleShowRegister = () => {
        setCurrentScreen('register');
        setRegistrationMessage(''); // Clear any registration messages
    };

    const handleShowForgotPassword = () => {
        setCurrentScreen('forgotPassword');
        setRegistrationMessage(''); // Clear any registration messages
    };

    const handleRegistrationSuccess = (message?: string) => {
        console.log('✅ Registration successful:', message);

        // Set success message
        const successMessage = message || 'Account created successfully! You can now log in with your credentials.';
        setRegistrationMessage(successMessage);

        // Remove the Alert.alert call - just switch to login screen
        setCurrentScreen('login');
    };

    const handleExtendSession = async () => {
        console.log('👤 User clicked "Continue Session" - extending session');

        const success = await extendSession();
        if (!success) {
            console.log('❌ Failed to extend session - user will be logged out');
        } else {
            console.log('✅ Session extended successfully by user choice');
        }
    };

    const handleSessionTimeout = async () => {
        console.log('🕐 Session timeout - user chose to logout or timer expired');
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
                        successMessage={registrationMessage} // Add this line back
                    />
                );

            case 'register':
                return (
                    <RegisterForm
                        onSuccess={handleRegistrationSuccess}
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
                        successMessage={registrationMessage} // Add this line back
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