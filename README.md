# LV-Notas - Universal Therapist Management System

A comprehensive system for managing therapy sessions with Google Calendar integration and automated patient check-ins.

## 🎉 Current Status: WORKING SYSTEM

✅ **Complete onboarding flow** with Portuguese interface  
✅ **Multi-tenant patient management** - each therapist sees only their data  
✅ **Real-time Google Calendar webhooks** working  
✅ **Patient add/management** via manual forms  
✅ **Check-in system** with friendly error handling  
✅ **Production-ready** authentication and security  

## 🏗️ Architecture Overview

- **Frontend**: Expo/React Native app with web support
- **Backend**: Node.js/TypeScript API with PostgreSQL
- **Authentication**: Firebase Auth + localStorage session management
- **Calendar Integration**: Google Calendar API with real-time webhooks
- **Security**: Multi-tenant with therapist-specific data isolation
- **Deployment**: Google Cloud Run + Firebase Hosting

## 📁 Project Structure

```
lv-notas/
├── 📱 Frontend (React Native/Expo)
│   ├── App.tsx                          # Main app component with routing logic
│   ├── src/
│   │   ├── components/
│   │   │   ├── CheckInForm.tsx          # Patient check-in interface
│   │   │   ├── TherapistOnboarding.tsx  # Complete onboarding flow
│   │   │   └── PatientManagement.tsx    # Add/manage patients
│   │   ├── services/
│   │   │   └── api.ts                   # API client with multi-tenant support
│   │   ├── config/
│   │   │   └── firebase.ts              # Firebase authentication setup
│   │   └── types/
│   │       └── index.ts                 # TypeScript type definitions
│   ├── package.json                     # Frontend dependencies
│   ├── .env.local                       # Frontend environment variables
│   └── firebase.json                    # Firebase hosting config
│
├── 🖥️ Backend (Node.js/TypeScript API)
│   └── clinic-api/
│       ├── src/
│       │   ├── server.ts                # Main server with authentication middleware
│       │   ├── config/
│       │   │   └── database.ts          # PostgreSQL connection pool
│       │   ├── routes/
│       │   │   ├── therapists.ts        # Therapist CRUD operations
│       │   │   ├── patients.ts          # Patient management (filtered by therapist)
│       │   │   ├── sessions.ts          # Session management
│       │   │   ├── checkin.ts           # Patient check-in endpoint
│       │   │   └── calendar-webhook.ts  # Google Calendar webhook handler
│       │   ├── services/
│       │   │   ├── google-calendar.ts   # Google Calendar API integration
│       │   │   └── session-sync.ts      # Calendar ↔ Database synchronization
│       │   └── types/
│       │       └── calendar.ts          # Calendar-specific types
│       ├── db/
│       │   ├── 001_initial_schema.sql   # Complete database schema
│       │   └── seed/
│       │       └── simple_seed.sql      # Basic test data
│       ├── scripts/
│       │   ├── start-local.sh           # Development startup script
│       │   └── start-dev.ts             # Ngrok tunnel + webhook setup
│       ├── package.json                 # Backend dependencies
│       ├── .env                         # Backend environment variables
│       ├── service-account-key.json     # Google service account credentials
│       └── tsconfig.json                # TypeScript configuration
│
├── 🗄️ Database (PostgreSQL)
│   ├── therapists                       # Therapist accounts + Google Calendar IDs
│   ├── patients                         # Patient info linked to therapists
│   ├── sessions                         # Therapy sessions ↔ calendar events
│   ├── check_ins                        # Patient attendance records
│   ├── calendar_events                  # Calendar change audit trail
│   └── calendar_webhooks                # Active webhook registrations
│
├── ☁️ Infrastructure
│   ├── Google Cloud Run                 # Backend API hosting
│   ├── Cloud SQL PostgreSQL             # Production database
│   ├── Firebase Hosting                 # Frontend hosting
│   ├── Google Calendar API              # Real-time webhook integration
│   └── Secret Manager                   # Secure credential storage
│
└── 📋 Configuration
    ├── README.md                        # This comprehensive guide
    ├── .gitignore                       # Git ignore patterns
    └── deployment configs               # Production deployment settings
```

### Key File Relationships

```
🔄 Data Flow:
App.tsx → CheckInForm.tsx → api.ts → patients.ts → database.ts → PostgreSQL
                                  ↓
TherapistOnboarding.tsx → PatientManagement.tsx → therapists.ts

🔗 Calendar Integration:
Google Calendar → calendar-webhook.ts → session-sync.ts → sessions table
                                    ↓
                           calendar_events table (audit)

🔐 Authentication:
firebase.ts → server.ts authenticateRequest → all API routes
localStorage → getCurrentTherapistEmail() → API headers
```

## 🎯 Current Features

### Universal Therapist Onboarding
- **One-click setup**: `/?setup=true` for new therapists
- **Automatic registration**: Creates therapist accounts automatically
- **Google Calendar sync**: Real-time bidirectional synchronization
- **Portuguese interface**: All text properly translated

### Patient Management  
- **Manual patient addition**: Simple form interface
- **Direct therapist association**: Patients linked via `therapist_id`
- **Add patient navigation**: `/?addPatient=true` for existing therapists
- **Friendly error messages**: "Nenhum paciente encontrado" instead of technical errors

### Multi-tenant Security
- **Therapist isolation**: Each therapist sees only their data
- **API authentication**: All endpoints require therapist validation
- **Session persistence**: localStorage maintains login across refreshes

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
echo "# Database connection
POSTGRES_USER=dankupfer
POSTGRES_HOST=localhost
POSTGRES_DB=clinic_db
POSTGRES_PASSWORD=
POSTGRES_PORT=5432

# Development settings
NODE_ENV=development
PORT=3000
ALLOWED_ORIGINS=http://localhost:8081,http://localhost:19006

# Google Cloud secrets (auto-loaded by start-local.sh)
# SAFE_PROXY_KEY - from secret manager
# GOOGLE_CALENDAR_ID - from secret manager
# AIRTABLE_API_KEY - legacy, from secret manager

# Webhook URLs (set automatically by start-local.sh)
WEBHOOK_URL_LOCAL=
WEBHOOK_URL_LIVE=https://clinic-api-141687742631.us-central1.run.app" > .env
```

### 4. Google Cloud Authentication

```bash
# Authenticate with Google Cloud
gcloud auth application-default login
gcloud config set project lv-notas

# Verify secret access
gcloud secrets versions access latest --secret="safe-proxy-key"
gcloud secrets versions access latest --secret="google-calendar-id"
```

### 5. Database Setup

```bash
# Start PostgreSQL
brew services start postgresql

# Create database (if doesn't exist)
createdb clinic_db

# Apply schema
psql -d clinic_db -f clinic-api/db/001_initial_schema.sql

# Add basic seed data (optional)
psql -d clinic_db -f clinic-api/db/seed/simple_seed.sql

# Verify setup
psql -d clinic_db -c "\dt"
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
- **New Therapist Onboarding**: http://localhost:19006/?setup=true
- **Add Patients (Existing Therapist)**: http://localhost:19006/?addPatient=true
- **Normal Check-in**: http://localhost:19006

## 🎯 User Flows

### New Therapist Onboarding
1. Visit `http://localhost:19006/?setup=true`
2. Click "Começar com Google" 
3. Complete authentication (simulated in development)
4. Click "Adicionar Primeiro Paciente"
5. Choose "Adicionar Manualmente" or "Importar do Calendário"
6. Add patient details and submit
7. Automatically redirected to check-in form

### Existing Therapist - Add Patient
1. From check-in form, click "+ Adicionar Novo Paciente"
2. Redirected to `/?addPatient=true`
3. Goes directly to patient management (no re-authentication)
4. Add patient and return to check-in form

### Patient Check-in
1. Therapist shares `https://lv-notas.web.app` with patient
2. Patient selects their name from dropdown
3. Selects session time
4. Clicks "Confirmar Presença"
5. Success confirmation displayed

## 📦 Database Schema

### Current Tables
- **therapists** - Therapist accounts with Google Calendar integration
- **patients** - Patient information linked to therapists via `therapist_id`
- **sessions** - Therapy sessions (linked to calendar events)
- **check_ins** - Patient attendance records
- **calendar_events** - Audit trail of calendar changes
- **calendar_webhooks** - Active webhook registrations

### Key Relationships
```sql
patients.therapist_id → therapists.id
sessions.patient_id → patients.id
sessions.therapist_id → therapists.id
check_ins.session_id → sessions.id
```

## 🌐 API Endpoints

### Authentication Required
- `GET /api/patients?therapistEmail=email` - List therapist's patients
- `GET /api/sessions/:patientId?therapistEmail=email` - Get patient sessions
- `POST /api/checkin` - Register patient check-in
- `GET /api/therapists/by-email/:email` - Find therapist by email
- `POST /api/therapists` - Create new therapist
- `POST /api/patients` - Create new patient

### Webhooks (No Auth)
- `POST /api/calendar-webhook` - Google Calendar change notifications

### Utility
- `GET /api/test` - Health check
- `POST /api/setup-webhook` - Manually create calendar webhook

## 🔄 Calendar Integration

### Current Implementation
- **Webhook setup**: Automatic during server startup
- **Event matching**: By `google_calendar_event_id`
- **Real-time sync**: Changes appear immediately
- **Bidirectional**: Calendar ↔ Database synchronization

### Supported Operations
- ✅ **New events** → Create sessions
- ✅ **Updated events** → Update session details  
- ✅ **Cancelled events** → Mark sessions as cancelled
- ✅ **Check-ins** → Create calendar events

## 🔐 Security Architecture

### Multi-tenant Isolation
- **Patient data**: Filtered by `therapist_id` in all queries
- **Session management**: localStorage-based therapist persistence
- **API security**: All endpoints validate therapist access

### Authentication Flow
- **Development**: Mock authentication with timestamp-based emails
- **Production**: Firebase Authentication with Google sign-in
- **API Key**: Required for all API calls
- **CORS**: Configured for specific domains only

## 🚀 Deployment

### Production URLs
- **Frontend**: https://lv-notas.web.app
- **Backend**: https://clinic-api-141687742631.us-central1.run.app
- **Database**: Cloud SQL PostgreSQL instance

### Deploy Commands
```bash
# Backend
cd clinic-api && npm run deploy

# Frontend  
npm run deploy
```

## 🛠️ Useful Scripts

### Database Management
```bash
# Start/stop Cloud SQL instance
npm run db:start
npm run db:stop
npm run db:status

# Local database queries
psql -d clinic_db -c "SELECT * FROM therapists ORDER BY created_at DESC;"
psql -d clinic_db -c "SELECT * FROM patients WHERE therapist_id = X;"
```

### Development Helpers
```bash
# Clean webhook setup
npx tsx clinic-api/scripts/cleanup-webhooks.ts

# Start with automatic setup
cd clinic-api/scripts && ./start-local.sh
```

## 🐛 Troubleshooting

### Common Issues

#### "No therapist email available"
**Solution**: Ensure localStorage has therapist email or go through onboarding again

#### "Failed to load resource: 404" in console
**Status**: Expected behavior when checking for existing therapists - doesn't affect functionality

#### "Unauthorized - Invalid API Key"  
**Solution**: Check `.env` files have correct `SAFE_PROXY_KEY`

#### TypeScript import errors
**Solution**: Reload TypeScript service in VS Code (Cmd+Shift+P → "TypeScript: Reload Project")

### Environment Verification
```bash
# Check backend health
curl http://localhost:3000/api/test

# Check database connection
psql -d clinic_db -c "SELECT count(*) FROM therapists;"

# Verify Google Cloud access
gcloud secrets versions access latest --secret="safe-proxy-key"
```

## 📋 Next Development Phase

### Immediate Tasks
- [ ] **Calendar Selection UI**: Allow therapist to choose which Google Calendar to connect
- [ ] **Calendar Import**: Implement automatic patient detection from recurring events
- [ ] **Session Management**: Create/edit sessions directly in the UI
- [ ] **Better Error Handling**: More comprehensive error states

### Future Enhancements
- [ ] **Email Notifications**: Send check-in confirmations
- [ ] **Reporting Dashboard**: Session statistics and analytics
- [ ] **Mobile App**: Native iOS/Android versions
- [ ] **Multi-language Support**: Beyond Portuguese

## 🎉 Ready for Production

The system is now production-ready with:
- ✅ Complete onboarding flow
- ✅ Multi-tenant security
- ✅ Patient management
- ✅ Real-time calendar sync
- ✅ Portuguese interface
- ✅ Error handling

**For your mother**: She can visit `https://lv-notas.web.app` and complete the full onboarding process to start managing her therapy practice immediately.

## 🤝 Contributing

When making changes:
1. Test both development and production environments
2. Update database schema with migration scripts
3. Maintain Portuguese language consistency
4. Update this README with new features

---

**Need help?** This README contains all setup instructions for quickly getting back into development after time away from the project.