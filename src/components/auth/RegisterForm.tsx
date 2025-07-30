// src/components/auth/RegisterForm.tsx
// Registration form with invitation token support and validation

import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

interface RegisterFormProps {
  onSuccess?: () => void;
  onShowLogin?: () => void;
  invitationToken?: string;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSuccess,
  onShowLogin,
  invitationToken,
}) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    invitationToken: invitationToken || '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register } = useAuth();

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(''); // Clear error when user starts typing
  };

  const validateForm = (): string | null => {
    if (!formData.email.trim()) {
      return 'Email é obrigatório.';
    }

    if (!isValidEmail(formData.email)) {
      return 'Por favor, insira um email válido.';
    }

    if (!formData.displayName.trim()) {
      return 'Nome é obrigatório.';
    }

    if (formData.displayName.length < 2) {
      return 'Nome deve ter pelo menos 2 caracteres.';
    }

    if (!formData.password) {
      return 'Senha é obrigatória.';
    }

    if (formData.password.length < 8) {
      return 'Senha deve ter pelo menos 8 caracteres.';
    }

    if (formData.password !== formData.confirmPassword) {
      return 'Senhas não coincidem.';
    }

    // Check password strength
    const hasLowerCase = /[a-z]/.test(formData.password);
    const hasUpperCase = /[A-Z]/.test(formData.password);
    const hasNumbers = /\d/.test(formData.password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(formData.password);

    if (!hasLowerCase || !hasUpperCase || !hasNumbers) {
      return 'Senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número.';
    }

    return null;
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const result = await register(
        formData.email.trim().toLowerCase(),
        formData.password,
        formData.displayName.trim(),
        formData.invitationToken || undefined
      );

      console.log('✅ Registration successful:', result);

      if (result.requiresEmailVerification) {
        setSuccess('Conta criada com sucesso! Verifique seu email para ativar a conta.');
      } else {
        setSuccess('Conta criada com sucesso! Você já pode fazer login.');
      }

      // Clear form
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        displayName: '',
        invitationToken: invitationToken || '',
      });

      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (error: any) {
      console.error('❌ Registration failed:', error);

      if (error.message.includes('already exists')) {
        setError('Já existe uma conta com este email. Tente fazer login ou use outro email.');
      } else {
        setError(error.message || 'Erro ao criar conta. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (): { score: number; label: string; color: string } => {
    const password = formData.password;
    if (password.length === 0) return { score: 0, label: '', color: '#e9ecef' };

    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

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
        <Text style={styles.title}>Criar Nova Conta</Text>
        <Text style={styles.subtitle}>
          {invitationToken
            ? 'Complete seu cadastro usando o convite recebido'
            : 'Junte-se ao LV Notas'
          }
        </Text>
      </View>

      {/* Invitation Token Info */}
      {invitationToken && (
        <View style={styles.invitationInfo}>
          <Text style={styles.invitationText}>
            ✅ Convite válido recebido! Complete as informações abaixo.
          </Text>
        </View>
      )}

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

      {/* Form */}
      <View style={styles.form}>
        {/* Name Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Nome Completo *</Text>
          <TextInput
            style={styles.input}
            placeholder="Seu nome completo"
            value={formData.displayName}
            onChangeText={(value) => updateField('displayName', value)}
            autoCapitalize="words"
            editable={!isLoading}
          />
        </View>

        {/* Email Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            placeholder="seu@example.com"
            value={formData.email}
            onChangeText={(value) => updateField('email', value)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
          />
        </View>

        {/* Password Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Senha *</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Mínimo 8 caracteres"
              value={formData.password}
              onChangeText={(value) => updateField('password', value)}
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
          {formData.password.length > 0 && (
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

        {/* Confirm Password Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Confirmar Senha *</Text>
          <TextInput
            style={styles.input}
            placeholder="Digite a senha novamente"
            value={formData.confirmPassword}
            onChangeText={(value) => updateField('confirmPassword', value)}
            secureTextEntry={!showPassword}
            editable={!isLoading}
          />
          {formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword && (
            <Text style={styles.passwordMismatch}>❌ Senhas não coincidem</Text>
          )}
        </View>

        {/* Invitation Token Input (if not provided) */}
        {!invitationToken && (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Código de Convite (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Cole seu código de convite aqui"
              value={formData.invitationToken}
              onChangeText={(value) => updateField('invitationToken', value)}
              autoCapitalize="none"
              editable={!isLoading}
            />
            <Text style={styles.helpText}>
              Deixe em branco se não tiver um código de convite.
            </Text>
          </View>
        )}
      </View>

      {/* Register Button */}
      <Pressable
        style={[styles.registerButton, isLoading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.registerButtonText}>Criando conta...</Text>
          </View>
        ) : (
          <Text style={styles.registerButtonText}>✨ Criar Conta</Text>
        )}
      </Pressable>

      {/* Login Link */}
      {onShowLogin && (
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>
            Já tem uma conta?{' '}
          </Text>
          <Pressable onPress={onShowLogin} disabled={isLoading}>
            <Text style={styles.loginLink}>
              Fazer login
            </Text>
          </Pressable>
        </View>
      )}

      {/* Password Requirements */}
      <View style={styles.requirementsContainer}>
        <Text style={styles.requirementsTitle}>Requisitos da senha:</Text>
        <Text style={styles.requirement}>• Mínimo 8 caracteres</Text>
        <Text style={styles.requirement}>• Pelo menos uma letra minúscula</Text>
        <Text style={styles.requirement}>• Pelo menos uma letra maiúscula</Text>
        <Text style={styles.requirement}>• Pelo menos um número</Text>
      </View>
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
    marginBottom: 24,
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
  invitationInfo: {
    backgroundColor: '#d4edda',
    borderWidth: 1,
    borderColor: '#c3e6cb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    width: '100%',
  },
  invitationText: {
    color: '#155724',
    fontSize: 14,
    textAlign: 'center',
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
  helpText: {
    color: '#6c757d',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  registerButton: {
    backgroundColor: '#28a745',
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
  registerButtonText: {
    color: '#fff',
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