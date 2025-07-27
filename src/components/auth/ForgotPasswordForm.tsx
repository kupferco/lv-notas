// src/components/auth/ForgotPasswordForm.tsx
// Forgot password form with reset functionality

import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

interface ForgotPasswordFormProps {
  onSuccess?: () => void;
  onShowLogin?: () => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onSuccess,
  onShowLogin,
}) => {
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { forgotPassword, resetPassword } = useAuth();

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePasswordReset = (): string | null => {
    if (!resetToken.trim()) {
      return 'Código de redefinição é obrigatório.';
    }

    if (!newPassword) {
      return 'Nova senha é obrigatória.';
    }

    if (newPassword.length < 8) {
      return 'Nova senha deve ter pelo menos 8 caracteres.';
    }

    if (newPassword !== confirmPassword) {
      return 'Senhas não coincidem.';
    }

    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);

    if (!hasLowerCase || !hasUpperCase || !hasNumbers) {
      return 'Nova senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número.';
    }

    return null;
  };

  const handleRequestReset = async () => {
    if (!email.trim()) {
      setError('Por favor, digite seu email.');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Por favor, insira um email válido.');
      return;
    }

    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      console.log('🔍 DEBUG: Requesting password reset for:', email.trim().toLowerCase());

      const response = await forgotPassword(email.trim().toLowerCase());

      console.log('🔍 DEBUG: Full forgotPassword response:', response);
      console.log('🔍 DEBUG: Response type:', typeof response);

      // Handle different response formats safely
      let token: string;
      if (typeof response === 'string') {
        // If response is just the token string
        token = response;
        console.log('🔍 DEBUG: Response is string token');
      } else if (response && typeof response === 'object') {
        // If response is an object, try to extract token
        const responseObj = response as any; // Type assertion for debugging
        console.log('🔍 DEBUG: Response keys:', Object.keys(responseObj));
        token = responseObj.resetToken || responseObj.token || String(response);
        console.log('🔍 DEBUG: Extracted from object');
      } else {
        token = String(response);
        console.log('🔍 DEBUG: Converted to string');
      }

      console.log('🔍 DEBUG: Extracted token:', token);
      console.log('🔍 DEBUG: Token type:', typeof token);
      console.log('🔍 DEBUG: Token length:', token?.length);

      if (!token) {
        console.log('❌ DEBUG: No token found in response!');
        setError('Erro: Código de redefinição não recebido do servidor.');
        return;
      }

      console.log('✅ DEBUG: Password reset requested successfully with token:', token.substring(0, 10) + '...');

      // TEMPORARY: Always show the token for debugging (restore dev check later)
      // if (process.env.NODE_ENV === 'development') {
      setResetToken(token);
      setSuccess(`Código de redefinição gerado! Token: ${token.substring(0, 8)}... (${token.length} chars)`);
      // } else {
      //   setSuccess('Se existe uma conta com este email, você receberá um código de redefinição.');
      // }

      setStep('reset');
    } catch (error: any) {
      console.error('❌ DEBUG: Password reset request failed:', error);
      console.error('❌ DEBUG: Error type:', typeof error);
      console.error('❌ DEBUG: Error message:', error.message);
      console.error('❌ DEBUG: Full error:', error);

      setError(`Erro ao solicitar redefinição de senha: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const validationError = validatePasswordReset();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      await resetPassword(resetToken.trim(), newPassword);

      console.log('✅ Password reset successfully');
      setSuccess('Senha redefinida com sucesso! Você já pode fazer login com a nova senha.');

      // Clear sensitive data
      setResetToken('');
      setNewPassword('');
      setConfirmPassword('');

      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (error: any) {
      console.error('❌ Password reset failed:', error);

      if (error.message.includes('Invalid or expired')) {
        setError('Código de redefinição inválido ou expirado. Solicite um novo código.');
      } else {
        setError(error.message || 'Erro ao redefinir senha. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToRequest = () => {
    setStep('request');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
  };

  const getPasswordStrength = (): { score: number; label: string; color: string } => {
    if (newPassword.length === 0) return { score: 0, label: '', color: '#e9ecef' };

    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[a-z]/.test(newPassword)) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/\d/.test(newPassword)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) score++;

    if (score <= 2) return { score, label: 'Fraca', color: '#dc3545' };
    if (score <= 3) return { score, label: 'Média', color: '#ffc107' };
    if (score <= 4) return { score, label: 'Boa', color: '#17a2b8' };
    return { score, label: 'Excelente', color: '#28a745' };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {step === 'request' ? 'Esqueceu sua Senha?' : 'Redefinir Senha'}
        </Text>
        <Text style={styles.subtitle}>
          {step === 'request'
            ? 'Digite seu email para receber um código de redefinição'
            : 'Digite o código recebido e sua nova senha'
          }
        </Text>
      </View>

      {/* Success Message */}
      {success ? (
        <View style={styles.successContainer}>
          <Text style={styles.successText}>✅ {success}</Text>
        </View>
      ) : null}

      {/* Error Message */}
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      ) : null}

      {/* Request Reset Form */}
      {step === 'request' && (
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
              editable={!isLoading}
            />
          </View>

          <Pressable
            style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
            onPress={handleRequestReset}
            disabled={isLoading}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.primaryButtonText}>Enviando...</Text>
              </View>
            ) : (
              <Text style={styles.primaryButtonText}>📧 Solicitar Redefinição</Text>
            )}
          </Pressable>
        </View>
      )}

      {/* Reset Password Form */}
      {step === 'reset' && (
        <View style={styles.form}>
          {/* Development Token Display */}
          {/* {process.env.NODE_ENV === 'development' && resetToken && ( */}
          {resetToken && (
            <View style={styles.devTokenContainer}>
              <Text style={styles.devTokenLabel}>Código (Desenvolvimento):</Text>
              <Text style={styles.devTokenText}>{resetToken}</Text>
              <Text style={styles.devTokenHelp}>
                Cole este código no campo abaixo
              </Text>
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Código de Redefinição</Text>
            <TextInput
              style={styles.input}
              placeholder="Cole o código recebido por email"
              value={resetToken}
              onChangeText={setResetToken}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nova Senha</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Mínimo 8 caracteres"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
                editable={!isLoading}
              />
              <Pressable
                style={styles.passwordToggle}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.passwordToggleText}>
                  {showPassword ? '👁️' : '🙈'}
                </Text>
              </Pressable>
            </View>

            {/* Password Strength Indicator */}
            {newPassword.length > 0 && (
              <View style={styles.passwordStrength}>
                <View style={styles.strengthBar}>
                  <View
                    style={[
                      styles.strengthFill,
                      {
                        width: `${(passwordStrength.score / 5) * 100}%`,
                        backgroundColor: passwordStrength.color
                      }
                    ]}
                  />
                </View>
                <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                  {passwordStrength.label}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirmar Nova Senha</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite a senha novamente"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              editable={!isLoading}
            />
            {confirmPassword.length > 0 && newPassword !== confirmPassword && (
              <Text style={styles.passwordMismatch}>❌ Senhas não coincidem</Text>
            )}
          </View>

          <Pressable
            style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={isLoading}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.primaryButtonText}>Redefinindo...</Text>
              </View>
            ) : (
              <Text style={styles.primaryButtonText}>🔒 Redefinir Senha</Text>
            )}
          </Pressable>

          {/* Back to Request Button */}
          <Pressable
            style={styles.secondaryButton}
            onPress={handleBackToRequest}
            disabled={isLoading}
          >
            <Text style={styles.secondaryButtonText}>← Solicitar Novo Código</Text>
          </Pressable>
        </View>
      )}

      {/* Back to Login Link */}
      {onShowLogin && (
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>
            Lembrou sua senha?{' '}
          </Text>
          <Pressable onPress={onShowLogin} disabled={isLoading}>
            <Text style={styles.loginLink}>
              Voltar ao login
            </Text>
          </Pressable>
        </View>
      )}

      {/* Help Text */}
      {step === 'request' && (
        <View style={styles.helpContainer}>
          <Text style={styles.helpText}>
            💡 Se você não receber o email em alguns minutos, verifique sua pasta de spam.
          </Text>
          <Text style={styles.helpText}>
            Problemas? Entre em contato com o suporte.
          </Text>
        </View>
      )}

      {/* Password Requirements (for reset step) */}
      {step === 'reset' && (
        <View style={styles.requirementsContainer}>
          <Text style={styles.requirementsTitle}>Requisitos da nova senha:</Text>
          <Text style={styles.requirement}>• Mínimo 8 caracteres</Text>
          <Text style={styles.requirement}>• Pelo menos uma letra minúscula</Text>
          <Text style={styles.requirement}>• Pelo menos uma letra maiúscula</Text>
          <Text style={styles.requirement}>• Pelo menos um número</Text>
        </View>
      )}
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
    lineHeight: 22,
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
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  passwordToggle: {
    position: 'absolute',
    right: 12,
    top: 12,
    bottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: 32,
  },
  passwordToggleText: {
    fontSize: 18,
  },
  passwordStrength: {
    marginTop: 8,
  },
  strengthBar: {
    height: 4,
    backgroundColor: '#e9ecef',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 0.3s ease, background-color 0.3s ease',
  } as any,
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  passwordMismatch: {
    color: '#dc3545',
    fontSize: 12,
    marginTop: 4,
  },
  devTokenContainer: {
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderColor: '#ffeaa7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  devTokenLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 4,
  },
  devTokenText: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#856404',
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ffeaa7',
    marginBottom: 4,
  },
  devTokenHelp: {
    fontSize: 11,
    color: '#856404',
    fontStyle: 'italic',
  },
  primaryButton: {
    backgroundColor: '#6200ee',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    minHeight: 56,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#6200ee',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#adb5bd',
    borderColor: '#adb5bd',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#6200ee',
    fontSize: 16,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  loginText: {
    color: '#6c757d',
    fontSize: 14,
  },
  loginLink: {
    color: '#6200ee',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  helpContainer: {
    backgroundColor: '#d1ecf1',
    borderWidth: 1,
    borderColor: '#bee5eb',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    marginBottom: 16,
  },
  helpText: {
    color: '#0c5460',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 16,
  },
  requirementsContainer: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    width: '100%',
  },
  requirementsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 6,
  },
  requirement: {
    fontSize: 11,
    color: '#6c757d',
    marginBottom: 2,
  },
});