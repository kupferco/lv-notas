// src/components/auth/AuthNavigator.tsx
// Main authentication navigator managing login, register, and forgot password flows

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
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
        userEmail: user?.email
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

    // const handleAuthSuccess = () => {
    //     console.log('🎉 Authentication successful');
    //     if (onAuthSuccess) {
    //         onAuthSuccess();
    //     }
    // };

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
        const success = await extendSession();
        if (!success) {
            // If extend failed, user will be logged out automatically
            console.log('❌ Failed to extend session');
        }
    };

    const handleSessionTimeout = async () => {
        console.log('🕐 Session timeout - logging out');
        await signOut();
    };

    const renderCurrentScreen = () => {
        console.log(4555555, currentScreen)
        switch (currentScreen) {
            case 'login':
                return (
                    <LoginForm
                        // onSuccess={handleAuthSuccess}
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
                        // onSuccess={handleAuthSuccess}
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