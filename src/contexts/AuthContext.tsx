// src/contexts/AuthContext.tsx
// Credential-based authentication context replacing Firebase auth

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, User as CredentialUser, LoginResponse } from '../services/authService';
import { getGoogleAccessToken, isDevelopment } from '../config/firebase';

export type AuthMethod = 'credentials';

export interface AuthContextType {
  // User state
  user: CredentialUser | null;
  authMethod: AuthMethod | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasValidTokens: boolean;
  googleAccessToken: string | null;

  loginError: string | null;
  clearLoginError: () => void;

  // Credential methods
  login: (email: string, password: string) => Promise<LoginResponse>;
  register: (email: string, password: string, displayName: string, invitationToken?: string) => Promise<any>;
  forgotPassword: (email: string) => Promise<string>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  extendSession: () => Promise<boolean>;
  signOut: () => Promise<void>;

  // Session management
  showSessionWarning: boolean;
  dismissSessionWarning: () => void;

  // Legacy compatibility methods (for smooth transition)
  refreshAuth: () => Promise<void>;
  forceRefresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<CredentialUser | null>(null);
  const [authMethod, setAuthMethod] = useState<AuthMethod | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Check if user has valid tokens (session + Google calendar access)
  const checkTokensValidity = (user: CredentialUser | null, googleToken: string | null): boolean => {
    console.log("🔍 Checking tokens validity:", {
      hasUser: !!user,
      hasSessionToken: !!authService.getSessionToken(),
      hasGoogleToken: !!googleToken,
      userEmail: user?.email
    });

    // For calendar operations, we need both session token and Google access token
    return !!(user && authService.getSessionToken() && googleToken);
  };

  const updateGoogleAccessToken = async (): Promise<string | null> => {
    try {
      const token = await getGoogleAccessToken();
      setGoogleAccessToken(token);
      return token;
    } catch (error) {
      console.warn('Warning: Could not get Google access token:', error);
      setGoogleAccessToken(null);
      return null;
    }
  };

  useEffect(() => {
    initializeAuth();

    // Set up session warning callback
    authService.setWarningCallback(() => {
      setShowSessionWarning(true);
    });

    // Set up session expired callback
    authService.setExpiredCallback(() => {
      console.log('🕐 Session expired - logging out user');
      handleSessionExpired();
    });
  }, []);

  const initializeAuth = async () => {
    try {
      console.log('🔄 Initializing credential authentication...');

      // First check if we have a stored session token
      const storedToken = localStorage.getItem('session_token');
      const storedUserData = localStorage.getItem('user_data');

      if (storedToken && storedUserData) {
        console.log('🔍 Found stored session, validating...');

        // Check if the stored session is still valid
        const credentialUser = await authService.getCurrentUser();
        if (credentialUser) {
          console.log('✅ Stored session is valid:', credentialUser.email);
          setUser(credentialUser);
          setAuthMethod('credentials');

          // Also get Google access token for calendar operations
          await updateGoogleAccessToken();

          setIsLoading(false);
          return;
        } else {
          console.log('❌ Stored session expired, clearing storage');
          localStorage.removeItem('session_token');
          localStorage.removeItem('user_data');
        }
      }

      console.log('ℹ️ No valid stored session found');
      setUser(null);
      setAuthMethod(null);
      setGoogleAccessToken(null);
    } catch (error) {
      console.error('❌ Authentication initialization error:', error);
      // Clear potentially corrupted data
      localStorage.removeItem('session_token');
      localStorage.removeItem('user_data');
      setUser(null);
      setAuthMethod(null);
      setGoogleAccessToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSessionExpired = async () => {
    console.log('🕐 Handling session expiration...');
    setShowSessionWarning(false);
    setUser(null);
    setAuthMethod(null);
    setGoogleAccessToken(null);

    // Show user-friendly message
    if (typeof window !== 'undefined') {
      window.alert('Sua sessão expirou. Você será redirecionado para a tela de login.');
    }
  };

  // Credential authentication methods
  const handleLogin = async (email: string, password: string): Promise<LoginResponse> => {
    try {
      setIsLoading(true);
      setLoginError(null); // Clear any previous errors

      const loginResponse = await authService.login(email, password);

      setUser(loginResponse.user);
      setAuthMethod('credentials');

      // Also get Google access token for calendar operations
      await updateGoogleAccessToken();

      return loginResponse;
    } catch (error: any) {
      console.error('Login error:', error);

      // Set error at context level instead of component level
      if (error.message === 'Invalid email or password') {
        setLoginError('Email ou senha incorretos. Verifique suas credenciais.');
      } else if (error.message === 'EMAIL_NOT_VERIFIED') {
        setLoginError('Sua conta precisa ser verificada. Verifique seu email ou contate o administrador.');
      } else {
        setLoginError(error.message || 'Erro ao fazer login. Tente novamente.');
      }

      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (email: string, password: string, displayName: string, invitationToken?: string): Promise<any> => {
    try {
      setIsLoading(true);
      return await authService.register(email, password, displayName, invitationToken);
    } catch (error: any) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (email: string): Promise<string> => {
    return await authService.forgotPassword(email);
  };

  const handleResetPassword = async (token: string, newPassword: string): Promise<void> => {
    return await authService.resetPassword(token, newPassword);
  };

  const handleExtendSession = async (): Promise<boolean> => {
    const success = await authService.extendSession();
    if (success) {
      setShowSessionWarning(false);
    }
    return success;
  };

  const handleSignOut = async (): Promise<void> => {
    try {
      setIsLoading(true);
      console.log("🚪 Starting unified logout process...");

      // Step 1: Call the backend logout API if we have a session
      if (authService.getSessionToken()) {
        try {
          await authService.logout();
          console.log("✅ Backend logout completed");
        } catch (error) {
          console.warn("⚠️ Backend logout failed, continuing with local cleanup:", error);
        }
      }

      // Step 2: Clear all session data through authService
      authService.clearSessionData();
      console.log("✅ Session data cleared");

      // Step 3: Clear all React state
      setUser(null);
      setAuthMethod(null);
      setShowSessionWarning(false);
      setGoogleAccessToken(null);
      setLoginError(null);
      console.log("✅ React state cleared");

      // Step 4: Clear app-specific cached data but PRESERVE Google tokens for persistence
      localStorage.removeItem("therapist_email");
      localStorage.removeItem("therapist_calendar_id");
      localStorage.removeItem("currentTherapist");

      // DO NOT remove these - we want to keep Google permissions across sessions:
      // localStorage.removeItem("google_token_data");
      // localStorage.removeItem("calendar_permission_granted");

      console.log("✅ Unified logout completed (Google tokens preserved for next session)");

    } catch (error) {
      console.error("❌ Error during unified logout:", error);
      // Still clear local state even if something fails
      setUser(null);
      setAuthMethod(null);
      setShowSessionWarning(false);
      setGoogleAccessToken(null);
      setLoginError(null);

      // Force clear session data
      authService.clearSessionData();
    } finally {
      setIsLoading(false);
    }
  };

  // Legacy compatibility methods for smooth transition
  // In src/contexts/AuthContext.tsx - Update refreshAuth method
  const refreshAuth = async (): Promise<void> => {
    console.log('🔄 Refreshing auth state...');

    // Don't set loading if we already have a valid session
    if (!authService.getSessionToken()) {
      setIsLoading(true);
    }

    try {
      const credentialUser = await authService.getCurrentUser();
      if (credentialUser) {
        setUser(credentialUser);
        setAuthMethod('credentials');
        await updateGoogleAccessToken();
      } else {
        setUser(null);
        setAuthMethod(null);
        setGoogleAccessToken(null);
      }
    } catch (error) {
      console.error('❌ Error refreshing auth:', error);
      // Only clear state if there's really no session
      if (!authService.getSessionToken()) {
        setUser(null);
        setAuthMethod(null);
        setGoogleAccessToken(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const forceRefresh = async (): Promise<void> => {
    console.log('⚡ Force refreshing auth state...');
    await refreshAuth();
  };

  const dismissSessionWarning = () => {
    setShowSessionWarning(false);
  };

  // Computed properties
  const isAuthenticated = !!user && !!authService.getSessionToken();
  const hasValidTokens = checkTokensValidity(user, googleAccessToken);

  const clearLoginError = () => {
    setLoginError(null);
  };

  const contextValue: AuthContextType = {
    // User state
    user,
    authMethod,
    isLoading,
    isAuthenticated,
    hasValidTokens,
    googleAccessToken,

    // Credential methods
    login: handleLogin,
    register: handleRegister,
    forgotPassword: handleForgotPassword,
    resetPassword: handleResetPassword,
    extendSession: handleExtendSession,
    signOut: handleSignOut,

    // Session management
    showSessionWarning,
    dismissSessionWarning,

    // Legacy compatibility
    refreshAuth,
    forceRefresh,

    loginError,
    clearLoginError,
  };

  console.log("🎨 AuthProvider rendering with state:", {
    isLoading,
    isAuthenticated,
    hasValidTokens,
    userEmail: user?.email,
    authMethod
  });

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Higher-order component for components that need authentication
interface WithAuthProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const WithAuth: React.FC<WithAuthProps> = ({
  children,
  fallback = <div>Loading authentication...</div>
}) => {
  const { hasValidTokens, isLoading } = useAuth();

  if (isLoading) {
    return <>{fallback}</>;
  }

  if (!hasValidTokens) {
    return <div>Authentication required</div>;
  }

  return <>{children}</>;
};