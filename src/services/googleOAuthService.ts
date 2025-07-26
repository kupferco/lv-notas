// src/services/googleOAuthService.ts
// Dedicated service for Google OAuth token management and calendar access

interface GoogleTokenData {
  access_token: string;
  refresh_token?: string;
  expires_at: number; // timestamp
  token_type: string;
  scope?: string;
}

interface RefreshTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

export class GoogleOAuthService {
  private readonly STORAGE_KEY = 'google_token_data';
  private readonly PERMISSION_KEY = 'calendar_permission_granted';
  private readonly TOKEN_BUFFER_MS = 5 * 60 * 1000; // 5 minutes buffer before expiry

  /**
   * Store Google tokens with expiry information
   */
  storeTokens(accessToken: string, refreshToken?: string, expiresIn: number = 3600): void {
    const expiresAt = Date.now() + (expiresIn * 1000);
    
    const tokenData: GoogleTokenData = {
      access_token: accessToken,
      expires_at: expiresAt,
      token_type: 'Bearer'
    };

    if (refreshToken) {
      tokenData.refresh_token = refreshToken;
      console.log("✅ Stored Google tokens with refresh token");
    } else {
      console.log("⚠️ Stored Google tokens without refresh token");
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tokenData));
    localStorage.setItem(this.PERMISSION_KEY, 'true');
    
    console.log("✅ Google token data stored, expires at:", new Date(expiresAt).toISOString());
  }

  /**
   * Get stored token data
   */
  private getStoredTokenData(): GoogleTokenData | null {
    try {
      const storedData = localStorage.getItem(this.STORAGE_KEY);
      
      if (!storedData) {
        return null;
      }

      return JSON.parse(storedData);
    } catch (error) {
      console.error("❌ Error parsing stored token data:", error);
      this.clearTokens();
      return null;
    }
  }

  /**
   * Check if current access token is still valid (with buffer)
   */
  isTokenValid(): boolean {
    const tokenData = this.getStoredTokenData();
    
    if (!tokenData?.access_token) {
      return false;
    }

    const isValid = Date.now() < (tokenData.expires_at - this.TOKEN_BUFFER_MS);
    return isValid;
  }

  /**
   * Get the current access token (without refresh)
   */
  getCurrentAccessToken(): string | null {
    const tokenData = this.getStoredTokenData();
    return tokenData?.access_token || null;
  }

  /**
   * Test if we have calendar access with current token
   */
  async testCalendarAccess(accessToken?: string): Promise<boolean> {
    const token = accessToken || this.getCurrentAccessToken();
    
    if (!token) {
      return false;
    }

    try {
      console.log("🧪 Testing calendar access...");
      const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log("✅ Calendar access confirmed");
        return true;
      } else {
        console.log("❌ Calendar access denied:", response.status);
        return false;
      }
    } catch (error) {
      console.log("❌ Calendar access test failed:", error);
      return false;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<string | null> {
    const tokenData = this.getStoredTokenData();
    
    if (!tokenData?.refresh_token) {
      console.log("❌ No refresh token available");
      return null;
    }

    try {
      console.log("🔄 Refreshing Google access token...");
      
      // Note: We'll need the actual OAuth client ID here
      // For now, let's try with a generic refresh approach
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID || '', // We'll need this
          refresh_token: tokenData.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Token refresh failed:", response.status, errorText);
        return null;
      }

      const refreshResponse: RefreshTokenResponse = await response.json();
      
      // Store the new access token (keep existing refresh token)
      this.storeTokens(
        refreshResponse.access_token,
        tokenData.refresh_token, // Keep existing refresh token
        refreshResponse.expires_in
      );

      console.log("✅ Google access token refreshed successfully");
      return refreshResponse.access_token;
      
    } catch (error) {
      console.error("❌ Error refreshing Google access token:", error);
      return null;
    }
  }

  /**
   * Get a valid access token, refreshing if necessary
   */
  async getValidAccessToken(): Promise<string | null> {
    // First check if current token is still valid
    if (this.isTokenValid()) {
      const token = this.getCurrentAccessToken();
      console.log("✅ Current Google token is still valid");
      return token;
    }

    console.log("⏰ Google token expired or missing, checking for refresh...");

    // Try to refresh if we have a refresh token
    const tokenData = this.getStoredTokenData();
    if (tokenData?.refresh_token) {
      const refreshedToken = await this.refreshAccessToken();
      
      if (refreshedToken) {
        return refreshedToken;
      }
    } else {
      console.log("ℹ️ No refresh token available (Firebase limitation)");
    }

    // If refresh failed or no refresh token, clear tokens
    console.log("❌ Token refresh failed or unavailable - clearing tokens");
    this.clearTokens();
    return null;
  }

  /**
   * Clear all stored tokens
   */
  clearTokens(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.setItem(this.PERMISSION_KEY, 'false');
    console.log("🧹 Google tokens cleared");
  }

  /**
   * Check if user has granted calendar permissions
   */
  hasCalendarPermissions(): boolean {
    const permissionGranted = localStorage.getItem(this.PERMISSION_KEY);
    const hasTokens = !!this.getStoredTokenData();
    return permissionGranted === 'true' && hasTokens;
  }

  /**
   * Get token info for debugging
   */
  getTokenInfo(): { hasToken: boolean; hasRefreshToken: boolean; expiresAt: string | null; isValid: boolean } {
    const tokenData = this.getStoredTokenData();
    
    return {
      hasToken: !!tokenData?.access_token,
      hasRefreshToken: !!tokenData?.refresh_token,
      expiresAt: tokenData?.expires_at ? new Date(tokenData.expires_at).toISOString() : null,
      isValid: this.isTokenValid()
    };
  }

  /**
   * Migrate from old token storage format
   */
  migrateFromOldFormat(): void {
    try {
      // Check if we have old-format token storage
      const oldToken = localStorage.getItem("google_access_token");
      const newTokenData = localStorage.getItem(this.STORAGE_KEY);
      
      if (oldToken && !newTokenData) {
        console.log("🔄 Migrating old Google token storage format...");
        
        // Create new token data structure (without refresh token)
        this.storeTokens(oldToken, undefined, 3600); // Assume 1 hour validity
        
        // Remove old format
        localStorage.removeItem("google_access_token");
        
        console.log("✅ Token storage migrated to new format");
        console.log("⚠️ User will need to re-authenticate to get refresh token on next expiry");
      }
    } catch (error) {
      console.error("❌ Error migrating token storage:", error);
      // On error, clear everything
      localStorage.removeItem("google_access_token");
      this.clearTokens();
    }
  }
}

// Export singleton instance
export const googleOAuthService = new GoogleOAuthService();