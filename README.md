# Notas LV Project

## Project Overview
A check-in application for managing patient sessions using Expo and a custom secure proxy server.

## Prerequisites
- Node.js (version 18+)
- npm or yarn
- Google Cloud Account
- Airtable Account

## Local Development Setup

### 1. Environment Variables
Create `.env.local` in the project root:

EXPO_PUBLIC_AIRTABLE_BASE_ID=your_airtable_base_id
CLIENT_API_KEY=your_local_proxy_api_key
Copy
### 2. Google Cloud Secret Manager Setup
1. Create a secret for the proxy API key:
   ```bash
   gcloud secrets create client-api-key \
     --replication-policy="automatic"

   echo -n "your_proxy_api_key" | gcloud secrets versions add client-api-key --data-file=-

Grant necessary IAM permissions to access the secret

3. Project Structure

safe-proxy/: Custom proxy server to secure API access
Frontend: Expo application
Secrets managed via Google Cloud Secret Manager

4. Development Workflow

- Start development server:
```bash
npm start
```

### Deployment

- Frontend: Firebase Hosting
- Backend Proxy: Google Cloud Run (safe-proxy)
- Secrets: Google Cloud Secret Manager

### Security Considerations

- Sensitive keys are stored in Google Cloud Secret Manager
- Client-side build only includes EXPO_PUBLIC_ prefixed variables
- Custom proxy server adds an extra layer of security

### Troubleshooting

- Ensure all environment variables are correctly set
- Verify Google Cloud configurations
- Check IAM permissions for secret access

## Local Proxy Server
To run the local proxy server:

```bash
cd safe-proxy
npm install
node server.js
```

## Deployment Commands

- Deploy proxy server to Google Cloud Run
- Deploy frontend to Firebase Hosting

```bash
npm run deploy
```