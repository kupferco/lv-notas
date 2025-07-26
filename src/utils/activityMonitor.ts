// src/utils/activityMonitor.ts
import { authService } from '../services/authService';

class ActivityMonitor {
  private lastActivityTime: number = Date.now();
  private throttleTimeout: NodeJS.Timeout | null = null;
  private isListening: boolean = false;
  private resetThrottleMs: number = 10000; // 10 seconds between resets
  private warningActive: boolean = false; // NEW: Track warning state

  private async resetSessionActivity(): Promise<void> {
    try {
      // DON'T reset session if warning is active - user should make conscious choice
      if (this.warningActive) {
        console.log('⚠️ Session warning active - ignoring automatic activity reset');
        return;
      }

      // Only reset if we have a valid session token
      if (authService.getSessionToken()) {
        console.log('🔄 User activity detected - extending session timer');
        const success = await authService.extendSession();
        if (success) {
          this.lastActivityTime = Date.now();
          console.log('✅ Session timer extended successfully');
        } else {
          console.log('❌ Failed to extend session timer');
        }
      } else {
        console.log('⚠️ No session token - skipping activity reset');
      }
    } catch (error) {
      console.error('Error resetting session activity:', error);
    }
  }

  private handleActivity = (event: Event): void => {
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivityTime;
    
    // IGNORE activity during warning period
    if (this.warningActive) {
      console.log(`🚫 Ignoring ${event.type} during warning period`);
      return;
    }
    
    // Only log meaningful activities (not every mousemove)
    const meaningfulEvents = ['click', 'keypress', 'touchstart'];
    const shouldLog = meaningfulEvents.includes(event.type);
    
    if (shouldLog) {
      console.log(`🎯 Meaningful activity detected: ${event.type}`);
    }
    
    // Throttle to avoid too many API calls
    if (timeSinceLastActivity < this.resetThrottleMs) {
      if (shouldLog) {
        console.log(`⏳ Throttled: Last reset was ${Math.round(timeSinceLastActivity/1000)}s ago (min ${this.resetThrottleMs/1000}s)`);
      }
      return;
    }

    // Clear any existing timeout
    if (this.throttleTimeout) {
      clearTimeout(this.throttleTimeout);
    }

    // Immediate reset for meaningful activities (but only if no warning)
    if (meaningfulEvents.includes(event.type)) {
      this.resetSessionActivity();
    } else {
      // Small delay for other activities to batch them
      this.throttleTimeout = setTimeout(() => {
        this.resetSessionActivity();
      }, 1000);
    }
  };

  // NEW: Methods to control activity monitoring during warning
  public setWarningActive(active: boolean): void {
    this.warningActive = active;
    console.log(`🚨 Session warning ${active ? 'ACTIVATED' : 'DEACTIVATED'} - activity monitoring ${active ? 'PAUSED' : 'RESUMED'}`);
    
    if (active) {
      // Clear any pending resets when warning becomes active
      if (this.throttleTimeout) {
        clearTimeout(this.throttleTimeout);
        this.throttleTimeout = null;
      }
    }
  }

  public isWarningActive(): boolean {
    return this.warningActive;
  }

  public startMonitoring(): void {
    if (this.isListening) {
      console.log('⚠️ Activity monitoring already running');
      return;
    }

    console.log('🔄 Starting global activity monitoring for session management');

    // List of events that indicate user activity
    const activityEvents = [
      'click',        // Most important
      'keypress',     // Typing
      'touchstart',   // Mobile touch
      'mousedown',    // Mouse clicks
      'scroll',       // Scrolling (but can be false positive)
      'mousemove'     // Mouse movement (but can be false positive)
    ];

    // Add event listeners with proper options
    activityEvents.forEach(event => {
      document.addEventListener(event, this.handleActivity, {
        capture: true,
        passive: true  // For better performance
      });
    });

    this.isListening = true;
    console.log('✅ Activity monitoring started');
  }

  public stopMonitoring(): void {
    if (!this.isListening) {
      return;
    }

    console.log('⏸️ Stopping global activity monitoring');

    const activityEvents = [
      'click',
      'keypress',
      'touchstart',
      'mousedown',
      'scroll',
      'mousemove'
    ];

    // Remove event listeners
    activityEvents.forEach(event => {
      document.removeEventListener(event, this.handleActivity, true);
    });

    // Clear any pending timeout
    if (this.throttleTimeout) {
      clearTimeout(this.throttleTimeout);
      this.throttleTimeout = null;
    }

    this.isListening = false;
    console.log('✅ Activity monitoring stopped');
  }

  public forceReset(): Promise<void> {
    console.log('🔄 Forcing session reset');
    return this.resetSessionActivity();
  }

  public getLastActivityTime(): number {
    return this.lastActivityTime;
  }

  public isMonitoring(): boolean {
    return this.isListening;
  }

  public getStatus(): string {
    const timeSinceLastReset = Date.now() - this.lastActivityTime;
    return `Monitoring: ${this.isListening ? 'ON' : 'OFF'}, Warning: ${this.warningActive ? 'ACTIVE' : 'INACTIVE'}, Last reset: ${Math.round(timeSinceLastReset/1000)}s ago`;
  }
}

// Export a singleton instance
export const activityMonitor = new ActivityMonitor();

// Export a hook-like function for React components
export const useActivityMonitor = () => {
  const startMonitoring = () => activityMonitor.startMonitoring();
  const stopMonitoring = () => activityMonitor.stopMonitoring();
  const forceReset = () => activityMonitor.forceReset();
  const setWarningActive = (active: boolean) => activityMonitor.setWarningActive(active);
  
  return {
    startMonitoring,
    stopMonitoring,
    forceReset,
    setWarningActive,
    lastActivity: activityMonitor.getLastActivityTime(),
    isMonitoring: activityMonitor.isMonitoring(),
    isWarningActive: activityMonitor.isWarningActive(),
    status: activityMonitor.getStatus()
  };
};

// Simple setup function for App.tsx
export const setupGlobalActivityMonitoring = (): (() => void) => {
  // Small delay to ensure DOM is ready
  setTimeout(() => {
    activityMonitor.startMonitoring();
  }, 1000);
  
  // Return cleanup function
  return () => activityMonitor.stopMonitoring();
};