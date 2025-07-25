// src/components/AuthDebug.tsx
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { 
  getCurrentUser, 
  getActivityStatus, 
  ensureValidGoogleToken,
  checkTokenHealth,
  trackActivity
} from '../config/firebase';

export const AuthDebug = () => {
  const [debugOutput, setDebugOutput] = useState<string>('Press a button to run debug tests...');
  const [isLoading, setIsLoading] = useState(false);

  const log = (message: string) => {
    console.log(message);
    setDebugOutput(prev => prev + '\n' + message);
  };

  const clearLog = () => {
    setDebugOutput('');
    console.clear();
  };

  const debugAuthState = async () => {
    setIsLoading(true);
    clearLog();
    log("🔍 === AUTHENTICATION DEBUG ===");
    
    try {
      // Check Firebase user
      const user = getCurrentUser();
      log(`Firebase User: ${user ? `${user.email} (${user.uid})` : "None"}`);
      
      // Check stored tokens
      const googleToken = localStorage.getItem("google_access_token");
      const calendarPermission = localStorage.getItem("calendar_permission_granted");
      const activityStatus = getActivityStatus();
      
      log(`Google Token: ${googleToken ? `${googleToken.substring(0, 20)}...` : "None"}`);
      log(`Calendar Permission: ${calendarPermission}`);
      log(`Last Activity: ${activityStatus.lastActivity ? activityStatus.lastActivity.toLocaleString() : "None"}`);
      
      if (activityStatus.daysSinceActivity !== null) {
        log(`Days Since Activity: ${activityStatus.daysSinceActivity.toFixed(2)}`);
        log(`Should Force Reauth: ${activityStatus.shouldForceReAuth}`);
      }
      
      // Test Firebase token
      if (user) {
        try {
          const fbToken = await user.getIdToken(false);
          const tokenPayload = JSON.parse(atob(fbToken.split('.')[1]));
          const expiresAt = new Date(tokenPayload.exp * 1000);
          log(`Firebase Token Expires: ${expiresAt.toLocaleString()}`);
          log(`Minutes Until FB Expiry: ${Math.round((expiresAt.getTime() - Date.now()) / 1000 / 60)}`);
        } catch (error) {
          log(`Firebase Token Error: ${error}`);
        }
      }
      
      // Test Google token
      if (googleToken) {
        try {
          const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${googleToken}`);
          if (response.ok) {
            const data = await response.json();
            log(`Google Token Valid - Expires in: ${data.expires_in} seconds`);
            log(`Google Token Scope: ${data.scope}`);
          } else {
            log(`Google Token Invalid - Status: ${response.status}`);
          }
        } catch (error) {
          log(`Google Token Test Error: ${error}`);
        }
      }
      
      log("🔍 === END DEBUG ===");
    } catch (error) {
      log(`Debug Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testTokenRefresh = async () => {
    setIsLoading(true);
    clearLog();
    log("🔄 === TESTING TOKEN REFRESH ===");
    
    try {
      const result = await ensureValidGoogleToken();
      log(`Token Refresh Result: ${result ? "Success" : "Failed/Null"}`);
      if (result) {
        log(`New Token: ${result.substring(0, 20)}...`);
      }
    } catch (error) {
      log(`Token Refresh Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const simulateOldActivity = (daysAgo: number = 11) => {
    clearLog();
    log(`🕒 Simulating activity from ${daysAgo} days ago...`);
    const oldTimestamp = Date.now() - (daysAgo * 24 * 60 * 60 * 1000);
    localStorage.setItem("last_activity_timestamp", oldTimestamp.toString());
    log(`New last activity: ${new Date(oldTimestamp).toLocaleString()}`);
    
    const activityStatus = getActivityStatus();
    log(`Should force reauth: ${activityStatus.shouldForceReAuth}`);
  };

  const resetActivity = () => {
    clearLog();
    log("🔄 Resetting activity to now...");
    trackActivity();
    const activityStatus = getActivityStatus();
    log(`Activity reset. Should force reauth: ${activityStatus.shouldForceReAuth}`);
  };

  // NEW TESTING FUNCTIONS
  const startInactivityTest = () => {
    clearLog();
    log("⏰ === STARTING 5-MINUTE INACTIVITY TEST ===");
    log("This will show you real-time countdown until forced re-auth");
    
    const checkInactivity = () => {
      const activityStatus = getActivityStatus();
      const minutesSince = activityStatus.daysSinceActivity ? activityStatus.daysSinceActivity * 24 * 60 : 0;
      const minutesRemaining = 5 - minutesSince;
      
      if (minutesRemaining > 0) {
        log(`⏱️ Time until forced re-auth: ${minutesRemaining.toFixed(1)} minutes`);
        setTimeout(checkInactivity, 10000); // Check every 10 seconds
      } else {
        log("🚨 INACTIVITY THRESHOLD REACHED! Next action should trigger re-authentication");
        log("Try clicking 'Check Auth State' or navigate to another page to test");
      }
    };
    
    // Set activity to 4.5 minutes ago so we can see the countdown
    const testTimestamp = Date.now() - (4.5 * 60 * 1000);
    localStorage.setItem("last_activity_timestamp", testTimestamp.toString());
    log("🕐 Set activity to 4.5 minutes ago");
    
    checkInactivity();
  };

  const startTokenRefreshTest = () => {
    clearLog();
    log("🔄 === STARTING TOKEN REFRESH MONITORING ===");
    log("This will show you token refresh activity every 30 seconds");
    
    let refreshCount = 0;
    const monitorTokens = async () => {
      refreshCount++;
      log(`--- Token Check #${refreshCount} (${new Date().toLocaleTimeString()}) ---`);
      
      try {
        const health = await checkTokenHealth();
        log(`Firebase Token: ${health.status}`);
        
        if (health.expiresAt) {
          const minutesUntilExpiry = (health.expiresAt.getTime() - Date.now()) / (1000 * 60);
          log(`Minutes until Firebase expiry: ${minutesUntilExpiry.toFixed(1)}`);
        }
        
        const googleToken = localStorage.getItem("google_access_token");
        if (googleToken) {
          try {
            const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${googleToken}`);
            if (response.ok) {
              const data = await response.json();
              log(`Google Token: Valid (${data.expires_in}s remaining)`);
            } else {
              log(`Google Token: Invalid (Status: ${response.status})`);
            }
          } catch (error) {
            log(`Google Token: Error checking (${error})`);
          }
        } else {
          log("Google Token: Not found");
        }
        
        // Continue monitoring for 10 minutes
        if (refreshCount < 20) {
          setTimeout(monitorTokens, 30000); // Check every 30 seconds
        } else {
          log("🏁 Token monitoring completed (10 minutes)");
        }
        
      } catch (error) {
        log(`❌ Token monitoring error: ${error}`);
      }
    };
    
    monitorTokens();
  };

  const testTokenHealth = async () => {
    setIsLoading(true);
    clearLog();
    log("🏥 === TESTING TOKEN HEALTH ===");
    
    try {
      const health = await checkTokenHealth();
      log(`Token Health Status: ${health.status}`);
      if (health.expiresAt) {
        log(`Expires At: ${health.expiresAt.toLocaleString()}`);
      }
      if (health.error) {
        log(`Health Check Error: ${health.error}`);
      }
    } catch (error) {
      log(`Health Check Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Simulate expired Google token
  const simulateExpiredGoogleToken = () => {
    clearLog();
    log("🧪 === SIMULATING EXPIRED GOOGLE TOKEN ===");
    
    // Store the current valid token (so we can restore it later)
    const currentToken = localStorage.getItem("google_access_token");
    if (currentToken) {
      localStorage.setItem("backup_google_token", currentToken);
      log("✅ Backed up current token");
    }
    
    // Set a fake expired token
    const expiredToken = "ya29.fake_expired_token_for_testing";
    localStorage.setItem("google_access_token", expiredToken);
    log("🕒 Set fake expired Google token");
    log("Now test 'Test Token Refresh' to see if it handles expired tokens gracefully");
  };

  // NEW: Simulate session resume after hours
  const simulateSessionResume = async () => {
    setIsLoading(true);
    clearLog();
    log("⏰ === SIMULATING SESSION RESUME AFTER HOURS ===");
    
    try {
      // Step 1: Check what happens with current tokens
      log("1. Testing current authentication state...");
      const user = getCurrentUser();
      if (!user) {
        log("❌ No Firebase user found - this would trigger re-authentication");
        setIsLoading(false);
        return;
      }
      
      // Step 2: Try to refresh Firebase token
      log("2. Testing Firebase token refresh...");
      try {
        const freshToken = await user.getIdToken(true); // Force refresh
        log("✅ Firebase token refresh successful");
        log(`New token starts with: ${freshToken.substring(0, 20)}...`);
      } catch (fbError) {
        log(`❌ Firebase token refresh failed: ${fbError}`);
      }
      
      // Step 3: Try to refresh Google token
      log("3. Testing Google token refresh...");
      try {
        const googleToken = await ensureValidGoogleToken();
        if (googleToken) {
          log("✅ Google token refresh/validation successful");
        } else {
          log("⚠️ Google token refresh returned null (graceful degradation)");
        }
      } catch (googleError: any) {
        log(`❌ Google token refresh failed: ${googleError.message}`);
      }
      
      // Step 4: Test activity tracking
      log("4. Testing activity tracking...");
      const activityStatus = getActivityStatus();
      log(`Last activity: ${activityStatus.lastActivity?.toLocaleString()}`);
      log(`Days since activity: ${activityStatus.daysSinceActivity?.toFixed(2)}`);
      log(`Should force reauth: ${activityStatus.shouldForceReAuth}`);
      
      log("✅ Session resume simulation completed");
      
    } catch (error) {
      log(`❌ Session resume test failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // NEW:

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 Authentication Debug Tools</Text>
      
      <View style={styles.buttonRow}>
        <Pressable 
          style={[styles.button, styles.primaryButton]} 
          onPress={debugAuthState}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Check Auth State</Text>
        </Pressable>
        
        <Pressable 
          style={[styles.button, styles.secondaryButton]} 
          onPress={testTokenRefresh}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Test Token Refresh</Text>
        </Pressable>
      </View>

      <View style={styles.buttonRow}>
        <Pressable 
          style={[styles.button, styles.warningButton]} 
          onPress={() => simulateOldActivity(11)}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Simulate 11 Days Ago</Text>
        </Pressable>
        
        <Pressable 
          style={[styles.button, styles.successButton]} 
          onPress={resetActivity}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Reset Activity</Text>
        </Pressable>
      </View>

      <View style={styles.buttonRow}>
        <Pressable 
          style={[styles.button, styles.infoButton]} 
          onPress={testTokenHealth}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Check Token Health</Text>
        </Pressable>
        
        <Pressable 
          style={[styles.button, styles.neutralButton]} 
          onPress={clearLog}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Clear Log</Text>
        </Pressable>
      </View>

      <View style={styles.buttonRow}>
        <Pressable 
          style={[styles.button, styles.testingButton]} 
          onPress={startInactivityTest}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Start 5min Inactivity Test</Text>
        </Pressable>
        
        <Pressable 
          style={[styles.button, styles.testingButton]} 
          onPress={startTokenRefreshTest}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Monitor Token Refresh</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.logContainer}>
        <Text style={styles.logText}>{debugOutput}</Text>
      </ScrollView>
      
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Running test...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  button: {
    flex: 1,
    padding: 12,
    margin: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#5856D6',
  },
  warningButton: {
    backgroundColor: '#FF9500',
  },
  successButton: {
    backgroundColor: '#34C759',
  },
  infoButton: {
    backgroundColor: '#5AC8FA',
  },
  neutralButton: {
    backgroundColor: '#8E8E93',
  },
  testingButton: {
    backgroundColor: '#FF6B35',
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  logContainer: {
    flex: 1,
    backgroundColor: 'black',
    borderRadius: 8,
    padding: 10,
    marginTop: 20,
  },
  logText: {
    color: '#00FF00',
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
  loadingOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 20,
    borderRadius: 10,
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
  },
});

export default AuthDebug;