# Environment Variable Configuration Guide

## 🔐 Environment Variable Architecture

LV Notas uses a **multi-layer environment variable system** for security and flexibility:

### Frontend Environment Variables

**Two different methods are used based on security requirements:**

#### 1. **Public Variables** (Safe to expose in client bundle)
- **Method**: `process.env.EXPO_PUBLIC_*` 
- **Usage**: Configuration that can be publicly visible
- **Examples**: API URLs, Firebase project config, feature flags

#### 2. **Secret Variables** (Secured via react-native-dotenv)
- **Method**: `import { VARIABLE } from '@env'`
- **Usage**: Variables that should not be easily visible in production
- **Examples**: API keys (though see security note below)

### Backend Environment Variables

**Three different storage methods:**

#### 1. **Local Development** (`.env` file)
```bash
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password
SAFE_PROXY_KEY=your_api_key
```

#### 2. **Firebase Functions Config** (Production)
```bash
firebase functions:config:set hosting.safe_proxy_api_key="your_key"
```

#### 3. **Google Secret Manager** (Enterprise)
```bash
gcloud secrets create safe-proxy-key --data-file="key.txt"
```

## 📁 Environment Configuration Files

### Frontend (`.env.local`)
```bash
# Public variables (process.env.EXPO_PUBLIC_*)
EXPO_PUBLIC_LOCAL_URL=http://localhost:3000
EXPO_PUBLIC_SAFE_PROXY_URL=https://clinic-api-141687742631.us-central1.run.app
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=lv-notas.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=lv-notas

# Secret variables (import from '@env')
SAFE_PROXY_API_KEY=your_secret_api_key
```

### Backend (`.env`)
```bash
# Database configuration
POSTGRES_USER=your_postgres_user
POSTGRES_HOST=localhost
POSTGRES_DB=clinic_db
POSTGRES_PASSWORD=your_postgres_password
POSTGRES_PORT=5432

# API keys and secrets
SAFE_PROXY_KEY=your_secure_api_key
GOOGLE_CALENDAR_ID=your_calendar_id

# Environment detection
NODE_ENV=development
```

## 🔧 Implementation Details

### Frontend Access Patterns

**Public variables (config.ts):**
```typescript
export const config = {
  apiUrl: process.env.EXPO_PUBLIC_SAFE_PROXY_URL,
  firebaseConfig: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID
  }
};
```

**Secret variables (api.ts):**
```typescript
import { SAFE_PROXY_API_KEY } from '@env';

const API_KEY = SAFE_PROXY_API_KEY;
```

### Backend Access Patterns

**Development:**
```typescript
const apiKey = process.env.SAFE_PROXY_KEY;
```

**Production (Firebase Config):**
```bash
const apiKey = functions.config().hosting.safe_proxy_api_key;
```

## 🚨 Security Considerations

### ⚠️ **CRITICAL SECURITY ISSUE**

**The current architecture has a fundamental security flaw**: API keys sent from frontend to backend are **visible in browser network tabs** and can be extracted from the JavaScript bundle.

#### Current (Insecure) Flow:
```
Frontend Bundle → Browser → Network Tab → API Key Exposed
```

#### Recommended Secure Architecture:

**Option 1: Remove Frontend API Key (Recommended)**
```typescript
// Frontend sends only user credentials
headers: {
  "Authorization": `Bearer ${firebaseToken}`,
  "X-Calendar-Token": googleAccessToken  // User token, not secret
}

// Backend validates user and uses server secrets
const isValidUser = await admin.auth().verifyIdToken(firebaseToken);
const serverSecret = process.env.SAFE_PROXY_KEY; // Never leaves server
```

**Option 2: Use Proper JWT Claims**
```typescript
// Add custom claims to Firebase tokens
await admin.auth().setCustomUserClaims(uid, { role: 'therapist' });

// Validate permissions on backend without API keys
const token = await admin.auth().verifyIdToken(firebaseToken);
if (token.role !== 'therapist') throw new Error('Unauthorized');
```

## 🛠️ Configuration Setup

### 1. Frontend Setup
```bash
# Create .env.local file
cp .env.example .env.local

# Edit with your values
nano .env.local
```

### 2. Backend Setup
```bash
# Local development
cp clinic-api/.env.example clinic-api/.env
nano clinic-api/.env

# Production (Firebase)
firebase functions:config:set hosting.safe_proxy_api_key="your_key"
firebase deploy --only functions
```

### 3. Babel Configuration
Ensure `babel.config.js` includes dotenv plugin:
```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module:react-native-dotenv'], // Enables @env imports
    ]
  };
};
```

### 4. TypeScript Configuration
Add type definitions in `env.d.ts`:
```typescript
declare module '@env' {
  export const SAFE_PROXY_API_KEY: string;
}
```

## 🔍 Troubleshooting

### Environment Variable Not Loading
1. **Check the prefix**: Use `EXPO_PUBLIC_` for public variables
2. **Restart metro**: `npx expo start --clear`
3. **Verify import method**: Use `import { VAR } from '@env'` for secrets
4. **Check babel config**: Ensure `module:react-native-dotenv` is configured

### Production Header Issues
- **Google Cloud Run filters headers**: Don't use headers with "google" in the name
- **Use generic names**: `x-calendar-token` instead of `x-google-access-token`
- **Check CORS**: Ensure custom headers are in `allowedHeaders`

### Security Best Practices
1. **Never send server secrets to frontend**
2. **Use Firebase tokens for authentication**
3. **Keep API keys on backend only**
4. **Validate user permissions server-side**
5. **Use HTTPS for all communications**

## 📚 Additional Resources

- [Expo Environment Variables Documentation](https://docs.expo.dev/guides/environment-variables/)
- [Firebase Security Best Practices](https://firebase.google.com/docs/rules/security)
- [Google Cloud Secret Manager](https://cloud.google.com/secret-manager/docs)
- [React Native Dotenv Configuration](https://github.com/goatandsheep/react-native-dotenv)