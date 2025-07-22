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