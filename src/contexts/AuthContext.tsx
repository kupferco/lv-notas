// src/contexts/AuthContext.tsx
// Credential-based authentication context replacing Firebase auth

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
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
  const [sessionMonitoringActive, setSessionMonitoringActive] = useState(false);
  const [sessionMonitoringCleanup, setSessionMonitoringCleanup] = useState<(() => void) | null>(null);
  const showSessionWarningRef = useRef(showSessionWarning);

  // Update the ref whenever showSessionWarning changes
  useEffect(() => {
    showSessionWarningRef.current = showSessionWarning;
  }, [showSessionWarning]);

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

    // Don't start session monitoring here - do it manually after login
  }, []); // Empty dependency array

  // Create separate functions to control session monitoring
  const startSessionMonitoring = () => {
    if (sessionMonitoringActive) {
      console.log('⚠️ Session monitoring already active');
      return;
    }

    console.log('🔄 Starting session monitoring');
    setSessionMonitoringActive(true);

    let timeoutId: NodeJS.Timeout;
    let isActive = true; // Local variable to track active state immediately

    const scheduleNextCheck = (delayMs: number) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkSession, Math.max(delayMs, 1000));
    };

    const checkSession = async () => {
      console.log(5555, 'CHECK SESSION!!!', !!authService.getSessionToken(), isActive);

      if (authService.getSessionToken() && isActive) {
        try {
          const status = await authService.checkSessionStatus();

          if (status) {
            if (status.shouldShowWarning && !showSessionWarningRef.current) {
              console.log('⚠️ AuthContext (555): Session warning triggered');
              setShowSessionWarning(true);
            }

            const timeUntilExpiry = status.timeUntilExpiryMs ?? 0;
            if (timeUntilExpiry <= 0) {
              console.log('🕐 AuthContext: Session expired');
              isActive = false;
              handleSessionExpired();
              return;
            }

            const timeUntilWarning = status.timeUntilWarningMs ?? 0;
            let nextCheckDelay: number;

            console.log('timeUntilWarning:', timeUntilWarning);
            console.log('showSessionWarning current value:', showSessionWarningRef.current);

            if (timeUntilWarning > 0) {
              nextCheckDelay = Math.floor(timeUntilWarning * 0.9);
              console.log(`📊 AuthContext (555): ${Math.round(timeUntilWarning / 1000)}s until warning, next check in ${Math.round(nextCheckDelay / 1000)}s (90% rule)`);

              if (showSessionWarningRef.current) {
                console.log('✅ Session extended detected - dismissing warning modal');
                setShowSessionWarning(false);
              }
            } else {
              nextCheckDelay = 5000;
              console.log(`🚨 AuthContext: Warning period active, next check in 5s`);
            }

            scheduleNextCheck(nextCheckDelay);
          }
        } catch (error) {
          console.error('AuthContext session monitoring error:', error);
          scheduleNextCheck(10000);
        }
      }
    };

    // Create cleanup function
    const cleanup = () => {
      console.log('🧹 Cleaning up session monitoring');
      clearTimeout(timeoutId);
      isActive = false;
      setSessionMonitoringActive(false);
      setSessionMonitoringCleanup(null);
    };

    // Store cleanup function
    setSessionMonitoringCleanup(() => cleanup);

    // Start first check
    checkSession();
  };

  const stopSessionMonitoring = () => {
    console.log('⏹️ Stopping session monitoring');

    // Call the cleanup function if it exists
    if (sessionMonitoringCleanup) {
      sessionMonitoringCleanup();
    } else {
      // Fallback - just update state
      setSessionMonitoringActive(false);
    }
  };

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

          // START session monitoring for restored session
          console.log('🔄 Starting session monitoring for restored session');
          startSessionMonitoring();

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

    // STOP session monitoring first
    stopSessionMonitoring();

    // STOP activity monitor
    try {
      const { activityMonitor } = await import('../utils/activityMonitor');
      activityMonitor.stopMonitoring();
      console.log('⏹️ Activity monitor stopped due to session expiration');
    } catch (error) {
      console.warn('Could not stop activity monitor:', error);
    }

    // Clear all session state
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

      // START session monitoring after successful login
      console.log('🔄 Starting session monitoring after successful login');
      startSessionMonitoring();

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