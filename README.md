# LV-Notas - Universal Therapist Management System

A comprehensive system for managing therapy sessions with Google Calendar integration and automated patient check-ins.

## 🏗️ Architecture Overview

- **Frontend**: Expo/React Native app with web support
- **Backend**: Node.js/TypeScript API with PostgreSQL
- **Authentication**: Firebase Auth
- **Calendar Integration**: Google Calendar API with real-time webhooks
- **Security**: Google Cloud Secret Manager for sensitive data
- **Deployment**: Google Cloud Run + Firebase Hosting

## 🎯 Features

### Universal Therapist Onboarding
- **One-click setup**: Send any therapist a link to connect their Google Calendar
- **Automatic registration**: Creates therapist accounts automatically
- **Google Calendar sync**: Real-time bidirectional synchronization
- **Foolproof flow**: Designed for non-technical users

### Patient Management
- **Smart check-ins**: Patients can check in using unique URLs
- **Calendar integration**: Sessions automatically sync with Google Calendar
- **Real-time updates**: Webhook-driven session status updates

## 🚀 Quick Start

### 1. Prerequisites

- Node.js v18+
- PostgreSQL 14+
- Google Cloud Account with billing enabled
- Firebase project
- Google Calendar API access

### 2. Clone and Setup

```bash
git clone https://github.com/kupferco/lv-notas.git
cd lv-notas
```

### 3. Environment Setup

#### Frontend Environment (Root Directory)
Create `.env.local` in the root directory:

```bash
# Get the SAFE_PROXY_KEY from Google Cloud Secret Manager
echo "# Frontend environment variables
SAFE_PROXY_API_KEY=$(gcloud secrets versions access latest --secret="safe-proxy-key")
EXPO_PUBLIC_LOCAL_URL=http://localhost:3000
EXPO_PUBLIC_SAFE_PROXY_URL=https://clinic-api-141687742631.us-central1.run.app
EXPO_PUBLIC_AIRTABLE_BASE_ID=legacy_not_used
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=lv-notas.firebaseapp.com  
FIREBASE_PROJECT_ID=lv-notas" > .env.local
```

#### Backend Environment (clinic-api Directory)
Create `.env` in the `clinic-api` directory:

```bash
cd clinic-api
echo "# Local database (no charges)
POSTGRES_USER=your_postgres_user
POSTGRES_HOST=localhost
POSTGRES_DB=clinic_db
POSTGRES_PASSWORD=your_local_postgres_password
POSTGRES_PORT=5432

# Local development settings
NODE_ENV=development
PORT=3000
ALLOWED_ORIGINS=http://localhost:8081,http://localhost:19006

# Secrets from Google Cloud (auto-loaded by start-local.sh)
# SAFE_PROXY_KEY - from secret manager
# GOOGLE_CALENDAR_ID - from secret manager
# AIRTABLE_API_KEY - legacy, from secret manager

# Webhook URLs
WEBHOOK_URL_LOCAL=
WEBHOOK_URL_LIVE=https://clinic-api-141687742631.us-central1.run.app" > .env
```

### 4. Google Cloud Authentication

```bash
# Authenticate with Google Cloud
gcloud auth application-default login
gcloud config set project lv-notas

# Verify you can access secrets
gcloud secrets versions access latest --secret="safe-proxy-key"
gcloud secrets versions access latest --secret="google-calendar-id"
```

### 5. Database Setup

```bash
# Start PostgreSQL (if using Homebrew)
brew services start postgresql

# Check if database exists (if this succeeds, skip createdb)
psql -d clinic_db -c "SELECT 1;" > /dev/null 2>&1 && echo "Database exists" || echo "Need to create database"

# Only if database doesn't exist:
# createdb clinic_db

# Only if tables don't exist, run schema:
# psql -d clinic_db -f db/001_initial_schema.sql

# Optional: Add test data (only if tables are empty)
# psql -d clinic_db -f db/seed/001_insert_basic_data.sql

# Verify existing setup
psql -d clinic_db -c "\dt" # Should show your existing tables
```

### 6. Install Dependencies

```bash
# Frontend dependencies
npm install --legacy-peer-deps

# Backend dependencies
cd clinic-api
npm install
```

### 7. Service Account Setup

```bash
# Download Google service account key (in clinic-api directory)
gcloud iam service-accounts keys create service-account-key.json \
    --iam-account=lv-notas-service-account@lv-notas.iam.gserviceaccount.com
```

## 🏃‍♂️ Development

### Start Development Environment

#### Backend (Terminal 1)
```bash
cd clinic-api/scripts
./start-local.sh
```

This script:
- Loads secrets from Google Cloud Secret Manager
- Updates `.env` with current secrets
- Starts the API server with ngrok tunnel
- Automatically sets up Google Calendar webhooks

#### Frontend (Terminal 2)
```bash
# From root directory
npm start
# Then press 'w' to open in web browser
```

### Development URLs

- **API Server**: http://localhost:3000
- **Frontend**: http://localhost:19006
- **Patient Check-in**: http://localhost:19006
- **Therapist Onboarding**: http://localhost:19006?setup=true

## 🎯 Therapist Onboarding Flow

### For Any New Therapist

1. **Send them this link**: `https://lv-notas.web.app?setup=true`
2. **They click "Get Started with Google"**
3. **Google sign-in popup appears** - they authenticate
4. **System automatically**:
   - Creates therapist account
   - Links their Google Calendar
   - Sets up real-time sync
5. **Success page shows** with their patient check-in URL

### What Happens Automatically

- ✅ Therapist account created in database
- ✅ Google Calendar permissions granted
- ✅ Real-time webhook synchronization established
- ✅ Calendar events ↔ Sessions bidirectional sync
- ✅ Patient check-in system activated

## 🔐 Security Architecture

### Secret Management
- **Sensitive data**: Stored in Google Cloud Secret Manager
- **Local development**: Secrets loaded automatically by scripts
- **Production**: Secrets injected via environment variables
- **Firebase**: Handles user authentication and authorization

### API Security
- **Firebase tokens**: Required for all API calls in production
- **API keys**: Validates client applications
- **CORS**: Configured for specific domains only
- **Rate limiting**: Prevents abuse

## 📦 Database Schema

### Core Tables
- `therapists` - Therapist accounts and Google Calendar IDs
- `patients` - Patient information and contact details
- `sessions` - Therapy sessions linked to calendar events
- `check_ins` - Patient attendance records
- `calendar_events` - Audit trail of calendar changes
- `calendar_webhooks` - Active webhook registrations

### Key Relationships
```sql
therapists.google_calendar_id → Google Calendar
sessions.google_calendar_event_id → Google Calendar Event
sessions.patient_id → patients.id
sessions.therapist_id → therapists.id
check_ins.session_id → sessions.id
```

## 🌐 API Endpoints

### Authentication Required
- `GET /api/patients` - List all patients
- `GET /api/sessions/:patientId` - Get patient sessions
- `POST /api/checkin` - Register patient check-in
- `GET /api/therapists` - List therapists
- `POST /api/therapists` - Create new therapist
- `GET /api/therapists/by-email/:email` - Find therapist by email

### Webhooks (No Auth)
- `POST /api/calendar-webhook` - Google Calendar change notifications

### Utility
- `GET /api/test` - Health check
- `POST /api/setup-webhook` - Manually create calendar webhook

## 🔄 Calendar Integration

### Bidirectional Sync
- **Calendar → Database**: Webhooks detect changes and update sessions
- **Database → Calendar**: Check-ins create calendar events
- **Real-time**: Changes appear immediately in both systems

### Event Matching
- **Sessions** matched by `google_calendar_event_id`
- **Therapists** matched by `google_calendar_id`
- **Patients** matched by email address in calendar attendees

### Supported Operations
- ✅ **New events** → Create sessions
- ✅ **Updated events** → Update session details
- ✅ **Cancelled events** → Mark sessions as cancelled
- ✅ **Check-ins** → Create calendar events

## 🚀 Deployment

### Google Cloud Secrets Setup
```bash
# Create required secrets
gcloud secrets create safe-proxy-key --replication-policy="automatic"
gcloud secrets create google-calendar-id --replication-policy="automatic"
gcloud secrets create postgres-password --replication-policy="automatic"

# Add secret values
echo -n "your_proxy_api_key" | gcloud secrets versions add safe-proxy-key --data-file=-
echo -n "your_calendar_id" | gcloud secrets versions add google-calendar-id --data-file=-
echo -n "your_postgres_password" | gcloud secrets versions add postgres-password --data-file=-
```

### Backend Deployment
```bash
cd clinic-api
npm run deploy
```

### Frontend Deployment
```bash
# From root directory
npm run build
firebase deploy
```

## 🛠️ Useful Scripts

### Database Management
```bash
# Start/stop Cloud SQL instance (cost saving)
npm run db:start
npm run db:stop
npm run db:status

# Local database operations
psql -d clinic_db -c "SELECT * FROM therapists;"
psql -d clinic_db -c "SELECT * FROM patients;"
psql -d clinic_db -c "SELECT * FROM sessions;"
```

### Webhook Management
```bash
# Clean up all webhooks
npx tsx clinic-api/scripts/cleanup-webhooks.ts

# Start development with automatic webhook setup
cd clinic-api/scripts && ./start-local.sh
```

## 🐛 Troubleshooting

### Common Issues

#### "WEBHOOK_URL_LOCAL is not set"
**Solution**: Use the start script which handles this automatically:
```bash
cd clinic-api/scripts && ./start-local.sh
```

#### "Cannot find module 'react'"
**Solution**: Install dependencies with legacy peer deps:
```bash
npm install --legacy-peer-deps
```

#### "Google Calendar API permission denied"
**Solution**: Check service account permissions:
```bash
gcloud projects get-iam-policy lv-notas | grep lv-notas-service-account
```

#### "Database connection failed"
**Solution**: Ensure PostgreSQL is running:
```bash
brew services start postgresql
psql -d clinic_db -c "SELECT 1;"
```

#### TypeScript errors in VS Code
**Solution**: Reload the TypeScript language service:
- Press `Cmd+Shift+P`
- Type "TypeScript: Reload Project"

### Environment Verification

Test your setup:

```bash
# Backend health check
curl http://localhost:3000/api/test

# Check secret access
gcloud secrets versions access latest --secret="safe-proxy-key"

# Database connectivity
psql -d clinic_db -c "SELECT count(*) FROM therapists;"

# Frontend build
npm run build
```

## 📋 Next Time Setup Checklist

When returning to this project after time away:

1. **Authenticate Google Cloud**:
   ```bash
   gcloud auth application-default login
   gcloud config set project lv-notas
   ```

2. **Check/Start PostgreSQL**:
   ```bash
   brew services start postgresql
   psql -d clinic_db -c "SELECT 1;" # Verify database exists
   ```

3. **Create environment files** (if missing):
   - Root: `.env.local` (see Frontend Environment section above)
   - Backend: `clinic-api/.env` (see Backend Environment section above)

4. **Download service account key** (if missing):
   ```bash
   cd clinic-api
   # Only if service-account-key.json doesn't exist:
   gcloud iam service-accounts keys create service-account-key.json \
       --iam-account=lv-notas-service-account@lv-notas.iam.gserviceaccount.com
   ```

4. **Start development**:
   ```bash
   # Terminal 1: Backend
   cd clinic-api/scripts && ./start-local.sh
   
   # Terminal 2: Frontend  
   npm start
   ```

5. **Test the flows**:
   - Normal check-in: http://localhost:19006
   - Therapist onboarding: http://localhost:19006?setup=true

## 🎉 Success Criteria

Your system is working correctly when:

- ✅ Backend starts without errors on port 3000
- ✅ Frontend loads at http://localhost:19006
- ✅ Onboarding flow accessible at `?setup=true`
- ✅ Google Calendar webhook created automatically
- ✅ Database queries return test data
- ✅ No TypeScript compilation errors

## 🤝 Contributing

When making changes:

1. **Test both environments**: Local development and production
2. **Update secrets**: Use Google Cloud Secret Manager for sensitive data
3. **Database changes**: Add migration scripts to `db/` directory
4. **Update this README**: Keep environment setup instructions current

## 📝 License

Private project for LV-Notas therapy clinic management.

---

**Need help?** Share this README with Claude AI for instant setup assistance!