// src/components/auth/AuthDebug.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';
import { googleOAuthService } from '../../services/googleOAuthService';

export const AuthDebug = () => {
  const [sessionStatus, setSessionStatus] = useState<any>(null);
  const [sessionConfig, setSessionConfig] = useState<any>(null);
  const [googleTokenInfo, setGoogleTokenInfo] = useState<any>(null);
  const [firebaseTokenInfo, setFirebaseTokenInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true); // Start with auto-refresh enabled
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const { user } = useAuth();

  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second for live countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getFirebaseTokenInfo = async () => {
    try {
      const currentUser = user;
      if (!currentUser) {
        return {
          hasUser: false,
          isSignedIn: false,
          error: 'No user signed in'
        };
      }

      let tokenData: any = {
        hasUser: true,
        isSignedIn: true,
        email: currentUser.email,
        uid: currentUser.uid,
        emailVerified: (currentUser as any).emailVerified || false,
        hasIdToken: false,
        tokenExpired: true,
        tokenClaims: null
      };

      try {
        const firebaseUser = currentUser as any;
        
        if (typeof firebaseUser.getIdToken === 'function') {
          const idToken = await firebaseUser.getIdToken(false);
          tokenData.hasIdToken = true;
          
          if (typeof firebaseUser.getIdTokenResult === 'function') {
            const tokenResult = await firebaseUser.getIdTokenResult(false);
            
            tokenData.tokenExpired = false;
            tokenData.expirationTime = tokenResult.expirationTime;
            tokenData.issuedAtTime = tokenResult.issuedAtTime;
            tokenData.authTime = tokenResult.authTime;
            tokenData.signInProvider = tokenResult.signInProvider;
            
            const now = new Date();
            const expiration = new Date(tokenResult.expirationTime);
            tokenData.timeUntilExpiry = expiration.getTime() - now.getTime();
            tokenData.tokenExpired = tokenData.timeUntilExpiry <= 0;
          } else {
            tokenData.tokenError = 'getIdTokenResult method not available';
          }
        } else {
          tokenData.tokenError = 'getIdToken method not available (not a Firebase user)';
        }
        
      } catch (tokenError: any) {
        console.warn('Could not get Firebase ID token:', tokenError);
        tokenData.tokenError = tokenError?.message || 'Unknown token error';
      }

      return tokenData;
    } catch (error: any) {
      console.error('Error getting Firebase token info:', error);
      return {
        hasUser: false,
        isSignedIn: false,
        error: error?.message || 'Unknown error'
      };
    }
  };

  const refreshStatus = async () => {
    setIsLoading(true);
    setLastRefreshTime(new Date());
    
    try {
      // Always try to get session configuration first
      try {
        console.log('🔍 AuthDebug: Fetching session configuration...');
        const config = await authService.getSessionConfiguration();
        setSessionConfig(config);
        console.log('⚙️ Session Configuration:', config);
      } catch (configError: any) {
        console.warn('⚠️ AuthDebug: Could not fetch session configuration:', configError);
        setSessionConfig({ error: configError?.message || 'Could not fetch configuration' });
      }

      // Only check session status if we have a session token
      if (authService.getSessionToken()) {
        try {
          console.log('🔍 AuthDebug: Checking session status...');
          const status = await authService.checkSessionStatus();
          setSessionStatus(status);
          console.log('📊 Session Status:', status);
        } catch (sessionError: any) {
          console.warn('⚠️ AuthDebug: Session status check failed:', sessionError);
          setSessionStatus({ error: sessionError?.message || 'Session check failed' });
        }
      } else {
        console.log('⚠️ AuthDebug: No session token found, skipping session check');
        setSessionStatus({ error: 'No session token found' });
      }

      // Get Firebase and Google token info
      const firebaseInfo = await getFirebaseTokenInfo();
      setFirebaseTokenInfo(firebaseInfo);
      
      const tokenInfo = googleOAuthService.getTokenInfo();
      setGoogleTokenInfo(tokenInfo);
      
    } catch (error: any) {
      console.error('AuthDebug: Error refreshing status (non-critical):', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh and initial load
  useEffect(() => {
    // Load token info immediately
    const tokenInfo = googleOAuthService.getTokenInfo();
    setGoogleTokenInfo(tokenInfo);
    
    getFirebaseTokenInfo().then(firebaseInfo => {
      setFirebaseTokenInfo(firebaseInfo);
    });
    
    // Do initial refresh
    refreshStatus();
    
    // Set up auto-refresh if enabled - EVERY SECOND for real-time countdown
    if (autoRefresh) {
      console.log('🔄 AuthDebug: Auto-refresh enabled, starting session monitoring every second...');
      const interval = setInterval(refreshStatus, 1000); // Changed from 10000 to 1000
      return () => {
        console.log('⏸️ AuthDebug: Auto-refresh disabled, stopping session monitoring');
        clearInterval(interval);
      };
    }
  }, [autoRefresh]);

  const formatTimeRemaining = (milliseconds: number): string => {
    if (milliseconds <= 0) return '⚠️ EXPIRED';
    
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    return `${hours}h ${remainingMinutes}m`;
  };

  const getConfigurationMode = (sessionMinutes: number, warningMinutes: number): string => {
    if (sessionMinutes === 2 && warningMinutes === 1) {
      return '⚡ RAPID TESTING MODE';
    } else if (sessionMinutes === 1 && warningMinutes === 1) {
      return '⚡ RAPID TESTING MODE (1min)'; // Legacy support
    } else if (sessionMinutes === 30 && warningMinutes === 2) {
      return '🛠️ DEVELOPMENT MODE';
    } else if (sessionMinutes === 60 && warningMinutes === 5) {
      return '🚀 PRODUCTION MODE';
    } else if (sessionMinutes === 120 && warningMinutes === 10) {
      return '⏰ EXTENDED MODE';
    } else {
      return '🎛️ CUSTOM MODE';
    }
  };

  const getConfigurationExplanation = () => {
    if (!sessionStatus || sessionStatus.error || !sessionConfig || sessionConfig.error) {
      return '';
    }
    
    if (sessionStatus.inactiveTimeoutMinutes !== sessionConfig.defaultInactiveTimeoutMinutes) {
      return `⚠️ Your current session was created with old settings (${sessionStatus.inactiveTimeoutMinutes} min). New sessions will use ${sessionConfig.defaultInactiveTimeoutMinutes} min.`;
    }
    
    return `✅ Session using current database configuration.`;
  };

  const getAccurateTimingInfo = () => {
    if (!sessionStatus || sessionStatus.error) return null;
    
    const now = currentTime;
    const sessionDurationMs = sessionStatus.inactiveTimeoutMinutes * 60 * 1000;
    const timeRemainingMs = sessionStatus.timeUntilExpiryMs;
    
    // Calculate when session actually started
    const sessionStartTime = new Date(now.getTime() - sessionDurationMs + timeRemainingMs);
    
    // Calculate when warning should have started
    const warningDurationMs = sessionStatus.warningTimeoutMinutes * 60 * 1000;
    const warningStartTime = new Date(sessionStartTime.getTime() + sessionDurationMs - warningDurationMs);
    
    // Calculate when session will expire
    const sessionExpireTime = new Date(sessionStartTime.getTime() + sessionDurationMs);
    
    return {
      sessionStartTime,
      warningStartTime,
      sessionExpireTime,
      warningActive: now >= warningStartTime && now < sessionExpireTime,
      sessionExpired: now >= sessionExpireTime
    };
  };

  const resetSessionTimer = async () => {
    setIsLoading(true);
    try {
      const success = await authService.extendSession();
      if (success) {
        console.log('✅ Session timer reset');
        await refreshStatus();
      } else {
        console.log('❌ Failed to reset session timer');
      }
    } catch (error) {
      console.error('Error resetting session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const expireSessionNow = () => {
    console.log('💥 Forcing session expiration');
    authService.clearSessionData();
    window.location.reload();
  };

  const timingInfo = getAccurateTimingInfo();

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔧 Session Debug</Text>
      
      {/* Control Buttons - MOVED TO TOP */}
      <View style={styles.buttonContainer}>
        <Pressable 
          style={[styles.button, autoRefresh ? styles.warningButton : styles.primaryButton]} 
          onPress={() => setAutoRefresh(!autoRefresh)}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {autoRefresh ? '⏸️ Stop Monitoring' : '▶️ Start Monitoring'}
          </Text>
        </Pressable>

        <Pressable 
          style={[styles.button, styles.primaryButton]} 
          onPress={refreshStatus}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>📊 Refresh Status</Text>
        </Pressable>

        <Pressable 
          style={[styles.button, styles.successButton]} 
          onPress={resetSessionTimer}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>⏰ Reset Timer</Text>
        </Pressable>

        <Pressable 
          style={[styles.button, styles.dangerButton]} 
          onPress={expireSessionNow}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>💥 Expire Session</Text>
        </Pressable>
      </View>
      
      {/* Safe Mode Status */}
      <View style={styles.statusCard}>
        <Text style={styles.cardTitle}>🛡️ Debug Status</Text>
        <Text style={styles.statusText}>
          Auto-refresh: {autoRefresh ? '✅ ENABLED (monitoring every second)' : '❌ DISABLED'}
        </Text>
        <Text style={styles.statusText}>
          Current Time: {currentTime.toLocaleTimeString()}
        </Text>
        <Text style={styles.statusText}>
          User: {user?.email || 'Not logged in'}
        </Text>
        <Text style={styles.statusText}>
          Session Token: {authService.getSessionToken() ? '✅ Present' : '❌ Missing'}
        </Text>
        {lastRefreshTime && (
          <Text style={styles.statusText}>
            Last Refresh: {lastRefreshTime.toLocaleTimeString()}
          </Text>
        )}
        <Text style={styles.statusText}>
          Activity Monitor: Check console for activity logs
        </Text>
      </View>

      {/* Session Token Status - Most Important */}
      <View style={styles.statusCard}>
        <Text style={styles.cardTitle}>🔧 App Session Token (Primary)</Text>
        <Text style={styles.statusText}>
          Has Session Token: {authService.getSessionToken() ? '✅' : '❌'}
        </Text>
        {authService.getSessionToken() && (
          <Text style={styles.statusText}>
            Token: {authService.getSessionToken()?.substring(0, 20)}...
          </Text>
        )}
        
        {/* Session Timer - This is what matters for your app */}
        {sessionStatus && !sessionStatus.error && (
          <>
            <Text style={[
              styles.timerText,
              sessionStatus.timeUntilExpiryMs <= 0 ? styles.expiredText : 
              sessionStatus.shouldShowWarning ? styles.warningText : styles.validText
            ]}>
              🕐 Session Expires In: {formatTimeRemaining(sessionStatus.timeUntilExpiryMs)}
            </Text>
            <Text style={[
              styles.timerText,
              sessionStatus.timeUntilWarningMs <= 0 ? styles.warningText : styles.validText
            ]}>
              ⚠️ Warning Shows In: {formatTimeRemaining(sessionStatus.timeUntilWarningMs)}
            </Text>
            {sessionStatus.shouldShowWarning && (
              <Text style={styles.alertText}>🚨 SESSION WARNING SHOULD BE ACTIVE</Text>
            )}
            {timingInfo?.warningActive && (
              <Text style={styles.alertText}>
                🚨 WARNING ACTIVE: Started {Math.floor((currentTime.getTime() - timingInfo.warningStartTime.getTime()) / 1000)}s ago
              </Text>
            )}
            <Text style={styles.statusText}>
              Current Session Duration: {sessionStatus.inactiveTimeoutMinutes} minutes
            </Text>
            <Text style={styles.statusText}>
              Current Warning Time: {sessionStatus.warningTimeoutMinutes} minutes before expiry
            </Text>
          </>
        )}
        
        {sessionStatus && sessionStatus.error && (
          <>
            <Text style={styles.expiredText}>
              ❌ Status: {sessionStatus.error}
            </Text>
            <Text style={styles.statusText}>
              Cannot get session timing information
            </Text>
            {sessionStatus.error.includes('No session token') && (
              <Text style={styles.statusText}>
                🔧 Fix: You need to log in to create a session token.
              </Text>
            )}
          </>
        )}
      </View>

      {/* Control Buttons - REMOVED FROM HERE, MOVED TO TOP */}

      {/* Database Session Configuration */}
      {sessionConfig && !sessionConfig.error && (
        <View style={styles.statusCard}>
          <Text style={styles.cardTitle}>⚙️ Database Session Configuration</Text>
          <Text style={[styles.modeText, styles.primaryText]}>
            {getConfigurationMode(sessionConfig.defaultInactiveTimeoutMinutes, sessionConfig.defaultWarningTimeoutMinutes)}
          </Text>
          <Text style={styles.configText}>
            Default Session Duration: {formatDuration(sessionConfig.defaultInactiveTimeoutMinutes)}
          </Text>
          <Text style={styles.configText}>
            Default Warning Time: {formatDuration(sessionConfig.defaultWarningTimeoutMinutes)}
          </Text>
          <Text style={styles.configText}>
            Active Sessions: {sessionConfig.activeSessionCount}
          </Text>
          {/* Remove confusing "Most Common Session Config" display */}
          <Text style={styles.configText}>
            Check Interval: 1 second (real-time)
          </Text>
          
          {/* Configuration Explanation */}
          {getConfigurationExplanation() && (
            <Text style={[
              styles.instructionText,
              getConfigurationExplanation().includes('⚠️') ? styles.warningText : styles.validText
            ]}>
              {getConfigurationExplanation()}
            </Text>
          )}
        </View>
      )}

      {/* Session Configuration Error */}
      {sessionConfig && sessionConfig.error && (
        <View style={styles.statusCard}>
          <Text style={styles.cardTitle}>❌ Session Configuration Error</Text>
          <Text style={styles.expiredText}>
            {sessionConfig.error}
          </Text>
          <Text style={styles.statusText}>
            This usually means the session configuration endpoint is not working.
          </Text>
          <Text style={styles.statusText}>
            Check that the backend /api/auth/session-config endpoint is implemented.
          </Text>
        </View>
      )}

      {/* Session Timer Details */}
      {timingInfo && (
        <View style={styles.statusCard}>
          <Text style={styles.cardTitle}>⏱️ Session Timer Details</Text>
          <Text style={styles.statusText}>
            Session Started: {timingInfo.sessionStartTime.toLocaleTimeString()}
          </Text>
          <Text style={styles.statusText}>
            Warning Starts: {timingInfo.warningStartTime.toLocaleTimeString()}
          </Text>
          <Text style={styles.statusText}>
            Session Expires: {timingInfo.sessionExpireTime.toLocaleTimeString()}
          </Text>
          <Text style={styles.statusText}>
            Last Activity: Updated on each API call
          </Text>
          <Text style={[
            styles.statusText,
            timingInfo.warningActive ? styles.warningText : 
            timingInfo.sessionExpired ? styles.expiredText : styles.validText
          ]}>
            Status: {timingInfo.sessionExpired ? '🔴 EXPIRED' : 
                    timingInfo.warningActive ? '🟡 WARNING ACTIVE' : '🟢 ACTIVE'}
          </Text>
        </View>
      )}

      {/* Firebase Token Status */}
      {firebaseTokenInfo && (
        <View style={styles.statusCard}>
          <Text style={styles.cardTitle}>🔥 Firebase Authentication</Text>
          <Text style={styles.statusText}>
            User Signed In: {firebaseTokenInfo.isSignedIn ? '✅' : '❌'}
          </Text>
          {firebaseTokenInfo.email && (
            <Text style={styles.statusText}>
              Email: {firebaseTokenInfo.email}
            </Text>
          )}
          {firebaseTokenInfo.uid && (
            <Text style={styles.statusText}>
              UID: {firebaseTokenInfo.uid.substring(0, 8)}...
            </Text>
          )}
          <Text style={styles.statusText}>
            Email Verified: {firebaseTokenInfo.emailVerified ? '✅' : '❌'}
          </Text>
          <Text style={styles.statusText}>
            Has ID Token: {firebaseTokenInfo.hasIdToken ? '✅' : '❌'}
          </Text>
          <Text style={[
            styles.statusText,
            firebaseTokenInfo.tokenExpired ? styles.expiredText : styles.validText
          ]}>
            Token Status: {firebaseTokenInfo.tokenExpired ? '🔴 EXPIRED' : '🟢 VALID'}
          </Text>
          {firebaseTokenInfo.timeUntilExpiry && (
            <Text style={[
              styles.statusText,
              firebaseTokenInfo.tokenExpired ? styles.expiredText : 
              firebaseTokenInfo.timeUntilExpiry < 300000 ? styles.warningText : styles.validText
            ]}>
              Token Expires In: {formatTimeRemaining(firebaseTokenInfo.timeUntilExpiry)}
            </Text>
          )}
          {firebaseTokenInfo.signInProvider && (
            <Text style={styles.statusText}>
              Sign-in Provider: {firebaseTokenInfo.signInProvider}
            </Text>
          )}
          {firebaseTokenInfo.authTime && (
            <Text style={styles.statusText}>
              Auth Time: {new Date(firebaseTokenInfo.authTime).toLocaleString()}
            </Text>
          )}
          {firebaseTokenInfo.tokenError && (
            <Text style={styles.expiredText}>
              Token Error: {firebaseTokenInfo.tokenError}
            </Text>
          )}
          {firebaseTokenInfo.error && (
            <Text style={styles.expiredText}>
              Firebase Error: {firebaseTokenInfo.error}
            </Text>
          )}
        </View>
      )}

      {/* Google Token Status */}
      {googleTokenInfo && (
        <View style={styles.statusCard}>
          <Text style={styles.cardTitle}>📱 Google Calendar Token</Text>
          <Text style={styles.statusText}>
            Has Token: {googleTokenInfo.hasToken ? '✅' : '❌'}
          </Text>
          <Text style={styles.statusText}>
            Has Refresh Token: {googleTokenInfo.hasRefreshToken ? '✅' : '❌'}
          </Text>
          <Text style={styles.statusText}>
            Valid: {googleTokenInfo.isValid ? '✅' : '❌'}
          </Text>
          {googleTokenInfo.expiresAt && (
            <Text style={styles.statusText}>
              Expires: {new Date(googleTokenInfo.expiresAt).toLocaleString()}
            </Text>
          )}
        </View>
      )}

      {/* Action Buttons - REMOVED FROM HERE, MOVED TO TOP */}

      {/* Session Configuration Instructions */}
      <View style={styles.instructionCard}>
        <Text style={styles.cardTitle}>💡 Change Session Configuration</Text>
        <Text style={styles.instructionText}>
          To change session timeouts, use the database configuration tool:
        </Text>
        <Text style={styles.codeText}>
          ./db/session-config.sh
        </Text>
        <Text style={styles.instructionText}>
          Available modes: Rapid Testing (1min), Development (30min), Production (1hr), Extended (2hr), Custom
        </Text>
        <Text style={styles.instructionText}>
          Note: Changes only apply to NEW sessions. Current sessions keep their original timeouts.
        </Text>
      </View>

      {/* Debug Info */}
      <View style={styles.debugCard}>
        <Text style={styles.cardTitle}>🐛 Debug Info</Text>
        <ScrollView style={styles.debugScroll}>
          <Text style={styles.debugText}>
            Session Status: {sessionStatus ? JSON.stringify(sessionStatus, null, 2) : 'Not loaded'}
          </Text>
          <Text style={styles.debugText}>
            Session Config: {sessionConfig ? JSON.stringify(sessionConfig, null, 2) : 'Not loaded'}
          </Text>
          <Text style={styles.debugText}>
            Firebase Token: {firebaseTokenInfo ? JSON.stringify(firebaseTokenInfo, null, 2) : 'Not loaded'}
          </Text>
          <Text style={styles.debugText}>
            Google Token: {googleTokenInfo ? JSON.stringify(googleTokenInfo, null, 2) : 'Loading...'}
          </Text>
        </ScrollView>
      </View>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Updating...</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    margin: 16,
    textAlign: 'center',
    color: '#333',
  },
  statusCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionCard: {
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  debugCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    minHeight: 200,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  statusText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#666',
  },
  configText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#007AFF',
    fontWeight: '500',
  },
  modeText: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#E3F2FD',
  },
  primaryText: {
    color: '#1976D2',
  },
  instructionText: {
    fontSize: 14,
    marginBottom: 6,
    color: '#333',
    lineHeight: 20,
  },
  codeText: {
    fontSize: 14,
    marginBottom: 8,
    color: '#D63384',
    fontFamily: 'monospace',
    backgroundColor: '#F8F9FA',
    padding: 8,
    borderRadius: 4,
  },
  timerText: {
    fontSize: 16,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  validText: {
    color: '#34C759',
  },
  warningText: {
    color: '#FF9500',
  },
  expiredText: {
    color: '#FF3B30',
  },
  alertText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FFE5E5',
    borderRadius: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 6, // Reduced gap for 4 buttons
  },
  button: {
    flex: 1,
    padding: 10, // Reduced padding for 4 buttons
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  successButton: {
    backgroundColor: '#34C759',
  },
  warningButton: {
    backgroundColor: '#FF9500',
  },
  dangerButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  debugScroll: {
    maxHeight: 150,
  },
  debugText: {
    color: '#00FF00',
    fontFamily: 'monospace',
    fontSize: 10,
    lineHeight: 14,
  },
  loadingOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -75 }, { translateY: -25 }],
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 20,
    borderRadius: 10,
    width: 150,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 14,
  },
});