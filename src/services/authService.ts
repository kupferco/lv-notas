// src/services/authService.ts
// Enhanced authentication service supporting both Firebase and credential auth

export interface User {
    uid: any;
    id: string;
    email: string;
    displayName: string;
    permissions: string[];
    sessionId?: string;
}

export interface LoginResponse {
    message: string;
    user: User;
    sessionToken: string;
    sessionId: string;
    permissions: string[];
    expiresIn: string;
}

export interface SessionStatus {
    status: string;
    timeUntilWarningMs: number;
    timeUntilExpiryMs: number;
    warningTimeoutMinutes: number;
    inactiveTimeoutMinutes: number;
    shouldShowWarning: boolean;
}

export interface SessionConfiguration {
    defaultInactiveTimeoutMinutes: number;
    defaultWarningTimeoutMinutes: number;
    activeSessionCount: number;
    currentSessionInactiveTimeout: number | null;
    currentSessionWarningTimeout: number | null;
}

export type LogoutReason = 'manual' | 'session_timeout' | 'token_expired' | 'forced';

export class AuthService {
    private sessionToken: string | null = null;
    private sessionCheckInterval: NodeJS.Timeout | null = null;
    private warningCallback: (() => void) | null = null;
    private expiredCallback: ((reason: LogoutReason) => void) | null = null;

    constructor() {
        // Load existing session token from localStorage
        this.sessionToken = localStorage.getItem('session_token');

        // Start session monitoring if we have a token
        if (this.sessionToken) {
            this.startSessionMonitoring();
        }
    }

    /**
     * Login with email and password
     */
    async login(email: string, password: string): Promise<LoginResponse> {
        try {
            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': process.env.SAFE_PROXY_API_KEY || '',
                },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Login failed');
            }

            const loginData: LoginResponse = await response.json();

            // Store session token
            this.sessionToken = loginData.sessionToken;
            localStorage.setItem('session_token', loginData.sessionToken);
            localStorage.setItem('user_data', JSON.stringify(loginData.user));

            // Start session monitoring
            this.startSessionMonitoring();

            return loginData;
        } catch (error: any) {
            console.error('Login error:', error);
            throw error;
        }
    }

    /**
     * Register new user account
     */
    async register(email: string, password: string, displayName: string, invitationToken?: string): Promise<any> {
        try {
            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': process.env.SAFE_PROXY_API_KEY || '',
                },
                body: JSON.stringify({ email, password, displayName, invitationToken }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Registration failed');
            }

            return await response.json();
        } catch (error: any) {
            console.error('Registration error:', error);
            throw error;
        }
    }

    /**
     * Request password reset
     */
    async forgotPassword(email: string): Promise<string> {
        try {
            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/auth/forgot-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': process.env.SAFE_PROXY_API_KEY || '',
                },
                body: JSON.stringify({ email }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Password reset request failed');
            }

            const data = await response.json();
            return data.resetToken; // TODO: Remove in production, send via email
        } catch (error: any) {
            console.error('Forgot password error:', error);
            throw error;
        }
    }

    /**
     * Reset password with token
     */
    async resetPassword(token: string, newPassword: string): Promise<void> {
        try {
            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/auth/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': process.env.SAFE_PROXY_API_KEY || '',
                },
                body: JSON.stringify({ token, newPassword }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Password reset failed');
            }
        } catch (error: any) {
            console.error('Reset password error:', error);
            throw error;
        }
    }

    /**
     * Get current user information
     */
    async getCurrentUser(): Promise<User | null> {
        if (!this.sessionToken) {
            return null;
        }

        try {
            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/auth/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.sessionToken}`,
                    'X-API-Key': process.env.SAFE_PROXY_API_KEY || '',
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // Session expired - delegate to AuthContext for unified handling
                    if (this.expiredCallback) {
                        this.expiredCallback('token_expired');
                    }
                    return null;
                }
                throw new Error('Failed to get current user');
            }

            const data = await response.json();
            return data.user;
        } catch (error: any) {
            console.error('Get current user error:', error);
            if (error.message.includes('SESSION_EXPIRED')) {
                // Delegate to AuthContext for unified handling
                if (this.expiredCallback) {
                    this.expiredCallback('token_expired');
                }
            }
            return null;
        }
    }

    /**
     * Logout user - ONLY handles the API call, cleanup is delegated to AuthContext
     */
    async logout(): Promise<void> {
        try {
            if (this.sessionToken) {
                await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.sessionToken}`,
                        'X-API-Key': process.env.SAFE_PROXY_API_KEY || '',
                    },
                });
            }
        } catch (error) {
            console.error('Logout API call error:', error);
        }
        // NOTE: We don't call clearSession() here anymore - that's handled by AuthContext
    }

    /**
     * Extend current session
     */
    async extendSession(): Promise<boolean> {
        if (!this.sessionToken) {
            return false;
        }

        try {
            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/auth/extend-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': process.env.SAFE_PROXY_API_KEY || '',
                },
                body: JSON.stringify({ sessionToken: this.sessionToken }),
            });

            if (!response.ok) {
                const error = await response.json();
                if (error.code === 'SESSION_EXPIRED') {
                    // Delegate to AuthContext for unified handling
                    if (this.expiredCallback) {
                        this.expiredCallback('session_timeout');
                    }
                }
                return false;
            }

            console.log('✅ Session extended successfully');
            return true;
        } catch (error: any) {
            console.error('Extend session error:', error);
            return false;
        }
    }

    /**
     * Check session status
     */
    async checkSessionStatus(): Promise<SessionStatus | null> {
        if (!this.sessionToken) {
            return null;
        }

        try {
            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/auth/session-status`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.sessionToken}`,
                    'X-API-Key': process.env.SAFE_PROXY_API_KEY || '',
                },
            });

            if (!response.ok) {
                const error = await response.json();
                if (error.code === 'SESSION_EXPIRED') {
                    // Delegate to AuthContext for unified handling
                    if (this.expiredCallback) {
                        this.expiredCallback('session_timeout');
                    }
                }
                return null;
            }

            return await response.json();
        } catch (error: any) {
            console.error('Check session status error:', error);
            return null;
        }
    }

    /**
     * Start monitoring session status
     */
    private startSessionMonitoring(): void {
        // Clear any existing interval
        if (this.sessionCheckInterval) {
            clearInterval(this.sessionCheckInterval);
        }

        // Check session status every 30 seconds
        this.sessionCheckInterval = setInterval(async () => {
            const status = await this.checkSessionStatus();

            if (!status) {
                return; // Session already handled in checkSessionStatus
            }

            // Show warning if approaching timeout
            if (status.shouldShowWarning && this.warningCallback) {
                console.log('⚠️ Session timeout warning triggered');
                this.warningCallback();
            }

            // Handle session expiry
            if (status.timeUntilExpiryMs <= 0) {
                console.log('🕐 Session expired in monitoring loop');
                // Delegate to AuthContext for unified handling
                if (this.expiredCallback) {
                    this.expiredCallback('session_timeout');
                }
            }
        }, 30000); // Check every 30 seconds
    }

    /**
     * Stop session monitoring
     */
    private stopSessionMonitoring(): void {
        if (this.sessionCheckInterval) {
            clearInterval(this.sessionCheckInterval);
            this.sessionCheckInterval = null;
        }
    }

    /**
     * Clear session data - ONLY called by AuthContext after unified logout
     */
    clearSessionData(): void {
        console.log('🧹 AuthService clearing session data only (called from AuthContext)');
        this.sessionToken = null;
        localStorage.removeItem('session_token');
        localStorage.removeItem('user_data');
        this.stopSessionMonitoring();
    }

    /**
     * Set callback for session warning
     */
    setWarningCallback(callback: () => void): void {
        this.warningCallback = callback;
    }

    /**
     * Set callback for session expiry - NOW includes logout reason
     */
    setExpiredCallback(callback: (reason: LogoutReason) => void): void {
        this.expiredCallback = callback;
    }

    /**
     * Check if user is logged in
     */
    isLoggedIn(): boolean {
        return !!this.sessionToken;
    }

    /**
     * Get session token for API calls
     */
    getSessionToken(): string | null {
        return this.sessionToken;
    }

    /**
     * Get stored user data
     */
    getStoredUser(): User | null {
        const userData = localStorage.getItem('user_data');
        if (userData) {
            try {
                return JSON.parse(userData);
            } catch (error) {
                console.error('Error parsing stored user data:', error);
                localStorage.removeItem('user_data');
            }
        }
        return null;
    }

    /**
   * Get current session configuration from database
   */
    async getSessionConfiguration(): Promise<SessionConfiguration> {
        try {
            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/auth/session-config`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.sessionToken}`,
                    'X-API-Key': process.env.SAFE_PROXY_API_KEY || '',
                },
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to fetch session configuration');
            }

            return await response.json();
        } catch (error: any) {
            console.error('Get session configuration error:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const authService = new AuthService();