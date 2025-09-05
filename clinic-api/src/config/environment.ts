// src/config/environment.ts

export class EnvironmentConfig {
  static getApiBaseUrl(): string {
    if (process.env.NODE_ENV === 'development') {
      return process.env.WEBHOOK_URL_LOCAL || 'http://localhost:3000';
    }

    return process.env.WEBHOOK_URL_LIVE || 'https://clinic-api-141687742631.us-central1.run.app';
  }

  static getInternalApiKey(): string {
    return process.env.SAFE_PROXY_KEY || '';
  }

  static isProduction(): boolean {
    return process.env.NODE_ENV === 'production' &&
      !process.env.WEBHOOK_URL_LOCAL;
  }

  static isDevelopment(): boolean {
    return !this.isProduction();
  }

  static getCurrentWebhookUrl(): string {
    return process.env.WEBHOOK_URL || process.env.WEBHOOK_URL_LOCAL || process.env.WEBHOOK_URL_LIVE || '';
  }
}