// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { getCurrentUser, onAuthStateChange, isDevelopment, getGoogleAccessToken, checkAuthState } from '../config/firebase';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  googleAccessToken: string | null;
  hasValidTokens: boolean;
}

interface AuthContextType extends AuthState {
  refreshAuth: () => Promise<void>;
  signOut: () => Promise<void>;
  forceRefresh: () => Promise<void>; // Add this for post-onboarding refresh
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    googleAccessToken: null,
    hasValidTokens: false,
  });

  const checkTokensValidity = (user: User | null, accessToken: string | null): boolean => {
    // Always require both Firebase user and Google access token
    console.log("🔍 Checking tokens validity:", {
      hasUser: !!user,
      hasAccessToken: !!accessToken,
      userEmail: user?.email
    });
    return !!(user && accessToken);
  };

  const updateAuthState = (user: User | null) => {
    const googleAccessToken = getGoogleAccessToken();
    const hasValidTokens = checkTokensValidity(user, googleAccessToken);

    console.log('🔐 Auth state updated:', {
      userEmail: user?.email || 'none',
      hasGoogleToken: !!googleAccessToken,
      hasValidTokens,
      isDevelopment
    });

    setAuthState({
      user,
      isAuthenticated: !!user,
      isLoading: false,
      googleAccessToken,
      hasValidTokens,
    });
  };

  const refreshAuth = async (): Promise<void> => {
    console.log('🔄 Refreshing auth state...');
    setAuthState(prev => ({ ...prev, isLoading: true }));

    try {
      // Always check Firebase auth state (no development mode special handling)
      console.log("🔥 Checking Firebase auth state");
      const currentUser = await checkAuthState();
      console.log("🔥 Got current user from checkAuthState:", currentUser?.email || 'none');
      updateAuthState(currentUser);
    } catch (error) {
      console.error('❌ Error refreshing auth:', error);
      updateAuthState(null);
    }
  };

  // New method for forcing a complete refresh (useful after onboarding)
  const forceRefresh = async (): Promise<void> => {
    console.log('⚡ Force refreshing auth state...');
    setAuthState(prev => ({ ...prev, isLoading: true }));

    try {
      // Try multiple methods to get the current user
      console.log("🔥 Force checking Firebase auth state");
      const currentUser = await checkAuthState();

      if (!currentUser) {
        // If checkAuthState fails, try getCurrentUser
        console.log("🔄 Trying getCurrentUser as fallback");
        const fallbackUser = await getCurrentUser();
        console.log("🔄 Fallback user:", fallbackUser?.email || 'none');
        updateAuthState(fallbackUser);
      } else {
        console.log("✅ Force refresh got user:", currentUser.email);
        updateAuthState(currentUser);
      }
    } catch (error) {
      console.error('❌ Error in force refresh:', error);
      updateAuthState(null);
    }
  };

  useEffect(() => {
    console.log('🚀 AuthProvider initializing...');

    // Always check auth state immediately on mount
    refreshAuth();

    // Set up auth state listener
    console.log("🔔 Setting up Firebase auth state listener");
    const unsubscribe = onAuthStateChange((user) => {
      console.log('🔔 Firebase auth state changed:', user?.email || 'signed out');
      updateAuthState(user);
    });

    return unsubscribe;
  }, []); // ← Keep empty dependency array and simplify the callback

  const handleSignOut = async (): Promise<void> => {
    console.log('🚪 AuthContext handling sign out...');
    try {
      // Import signOutUser dynamically to avoid circular dependencies
      const { signOutUser } = await import('../config/firebase');
      await signOutUser();

      // Immediately update auth state to signed out
      updateAuthState(null);
      console.log('✅ AuthContext sign out completed');
    } catch (error) {
      console.error('❌ Error in AuthContext sign out:', error);
      throw error;
    }
  };

  const contextValue: AuthContextType = {
    ...authState,
    refreshAuth,
    forceRefresh, // Add the new method
    signOut: handleSignOut,
  };

  console.log("🎨 AuthProvider rendering with state:", {
    isLoading: authState.isLoading,
    isAuthenticated: authState.isAuthenticated,
    hasValidTokens: authState.hasValidTokens,
    userEmail: authState.user?.email
  });

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
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