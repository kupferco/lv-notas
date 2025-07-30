// src/components/auth/LoginForm.tsx
// Professional login form with both credential and Firebase auth options

import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

interface LoginFormProps {
    onSuccess?: () => void;
    onShowRegister?: () => void;
    onShowForgotPassword?: () => void;
    successMessage?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({
    onSuccess,
    onShowRegister,
    onShowForgotPassword,
    successMessage,
}) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [loginMethod, setLoginMethod] = useState<'credentials'>('credentials');

    const { login, loginError, clearLoginError } = useAuth();


    const handleCredentialLogin = async () => {
        if (!email.trim() || !password.trim()) {
            return;
        }

        if (!isValidEmail(email)) {
            return;
        }

        if (loginError) {
            clearLoginError();
        }

        setIsLoading(true);

        try {
            await login(email.trim().toLowerCase(), password);
            console.log('✅ Credential login successful');

            // REMOVE THIS - let AuthNavigator's useEffect handle navigation:
            // if (onSuccess) {
            //     onSuccess();
            // }

        } catch (error: any) {
            console.log('❌ Login failed, error handled by AuthContext');
        } finally {
            setIsLoading(false);
        }
    };

    const isValidEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleSubmit = () => {
        handleCredentialLogin();
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Entrar no LV Notas</Text>
                <Text style={styles.subtitle}>
                    Sistema de Gestão para Terapeutas
                </Text>
            </View>

            {/* Success Message */}
            {successMessage && (
                <View style={styles.successContainer}>
                    <Text style={styles.successText}>✅ {successMessage}</Text>
                </View>
            )}

            {/* Login Method - Simplified to Credentials Only */}
            <View style={styles.methodInfo}>
                <Text style={styles.methodInfoText}>
                    🔐 Entre com seu email e senha
                </Text>
                <Text style={styles.methodInfoSubtext}>
                    Sistema de autenticação seguro com sessões protegidas
                </Text>
            </View>

            {/* Error Message */}
            {loginError ? (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>⚠️ {loginError}</Text>
                </View>
            ) : null}

            {/* Credential Login Form */}
            <View style={styles.form}>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="seu@example.com"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="email"
                        textContentType="emailAddress"
                        editable={!isLoading}
                        onSubmitEditing={handleSubmit}
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Senha</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Sua senha"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={true}
                        autoComplete="password"
                        textContentType="password"
                        editable={!isLoading}
                        onSubmitEditing={handleSubmit}
                        returnKeyType="go"
                    />
                </View>

                {/* Forgot Password Link */}
                {onShowForgotPassword && (
                    <Pressable
                        style={styles.forgotPasswordButton}
                        onPress={onShowForgotPassword}
                        disabled={isLoading}
                    >
                        <Text style={styles.forgotPasswordText}>
                            Esqueceu sua senha?
                        </Text>
                    </Pressable>
                )}
            </View>

            {/* Login Button */}
            <Pressable
                style={[styles.loginButton, isLoading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={isLoading}
            >
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#fff" />
                        <Text style={styles.loginButtonText}>Entrando...</Text>
                    </View>
                ) : (
                    <Text style={styles.loginButtonText}>🔐 Entrar</Text>
                )}
            </Pressable>

            {/* Register Link */}
            {onShowRegister && (
                <View style={styles.registerContainer}>
                    <Text style={styles.registerText}>
                        Não tem uma conta?{' '}
                    </Text>
                    <Pressable onPress={onShowRegister} disabled={isLoading}>
                        <Text style={styles.registerLink}>
                            Criar nova conta
                        </Text>
                    </Pressable>
                </View>
            )}

            {/* Development Info */}
            {process.env.NODE_ENV === 'development' && (
                <View style={styles.devInfo}>
                    <Text style={styles.devInfoText}>
                        🧪 Desenvolvimento: Use qualquer email@example.com + senha "teste123"
                    </Text>
                    <Text style={styles.devInfoText}>
                        Ou teste com usuários migrados usando "Esqueceu sua senha?"
                    </Text>
                </View>
            )}

            {/* Help Text */}
            <Text style={styles.helpText}>
                Problemas para acessar? Entre em contato com o suporte.
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        maxWidth: 400,
        alignSelf: 'center',
        width: '100%',
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#212529',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#6c757d',
        textAlign: 'center',
    },
    methodInfo: {
        backgroundColor: '#e3f2fd',
        borderWidth: 1,
        borderColor: '#bbdefb',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        width: '100%',
    },
    methodInfoText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1565c0',
        textAlign: 'center',
        marginBottom: 8,
    },
    methodInfoSubtext: {
        fontSize: 14,
        color: '#1976d2',
        textAlign: 'center',
        fontStyle: 'italic',
    },
    errorContainer: {
        backgroundColor: '#f8d7da',
        borderWidth: 1,
        borderColor: '#f5c6cb',
        borderRadius: 8,
        padding: 12,
        marginBottom: 20,
        width: '100%',
    },
    errorText: {
        color: '#721c24',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    form: {
        width: '100%',
        marginBottom: 20,
    },
    inputContainer: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#212529',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ced4da',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#212529',
    },
    forgotPasswordButton: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    forgotPasswordText: {
        color: '#6200ee',
        fontSize: 14,
        textDecorationLine: 'underline',
    },
    firebaseInfo: {
        backgroundColor: '#d1ecf1',
        borderWidth: 1,
        borderColor: '#bee5eb',
        borderRadius: 8,
        padding: 16,
        marginBottom: 20,
        width: '100%',
    },
    firebaseInfoText: {
        color: '#0c5460',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 8,
        lineHeight: 20,
    },
    firebaseInfoSubtext: {
        color: '#0c5460',
        fontSize: 12,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    loginButton: {
        backgroundColor: '#6200ee',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        minHeight: 56,
    },
    buttonDisabled: {
        backgroundColor: '#adb5bd',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    registerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    registerText: {
        color: '#6c757d',
        fontSize: 14,
    },
    registerLink: {
        color: '#6200ee',
        fontSize: 14,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    devInfo: {
        backgroundColor: '#fff3cd',
        borderWidth: 1,
        borderColor: '#ffeaa7',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        width: '100%',
    },
    devInfoText: {
        color: '#856404',
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 4,
    },
    helpText: {
        color: '#6c757d',
        fontSize: 12,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    successContainer: {
        backgroundColor: '#d4edda',
        borderWidth: 1,
        borderColor: '#c3e6cb',
        borderRadius: 8,
        padding: 12,
        marginBottom: 20,
        width: '100%',
    },
    successText: {
        color: '#155724',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        fontWeight: '500',
    },
});