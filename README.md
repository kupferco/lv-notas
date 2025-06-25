# LV Notas - Therapist Management System

A complete Node.js/TypeScript system for managing therapy clinics with **real Google authentication**, Google Calendar integration, patient management, and real-time session tracking.

## 🆕 Recent Improvements (June 2025)

### 🔧 **Authentication & Session Management**
- ✅ **Fixed authentication persistence** - Users stay logged in after page refresh
- ✅ **Real Google Sign-In everywhere** - No more development mode bypasses
- ✅ **AuthContext integration** - Centralized authentication state management
- ✅ **Secure logout functionality** - Complete localStorage cleanup
- ✅ **Chrome account detection** - Automatic sign-in with existing Google sessions

### 📅 **Calendar Integration Fixes**
- ✅ **Fixed calendar selection persistence** - Respects therapist's chosen calendar
- ✅ **Multi-calendar support** - Therapists can choose between multiple Google Calendars
- ✅ **Calendar-specific event loading** - Dashboard shows events from selected calendar only
- ✅ **Backend calendar ID routing** - API correctly uses therapist's selected calendar
- ✅ **Real-time calendar switching** - Settings allow changing calendar selection

### 👥 **Patient Management Enhancements**
- ✅ **AuthContext integration** - Patient loading now uses centralized authentication
- ✅ **Complete CRUD operations** - Create, Read, Update, Delete patients
- ✅ **Enhanced patient list** - Shows email and phone for all patients
- ✅ **Professional patient cards** - Consistent layout with contact information
- ✅ **Mandatory email field** - Email now required along with name
- ✅ **Smart action buttons** - Compact header buttons for adding patients
- ✅ **Edit/Delete functionality** - Full patient management with confirmations
- ✅ **Multi-tenant security** - Each therapist sees only their patients
- ✅ **Better error handling** - Clear Portuguese error messages
- ✅ **Improved loading states** - Better UX during data operations

### 🎯 **Key Technical Achievements**
- **Eliminated mock authentication** - Real Google tokens everywhere
- **Fixed calendar persistence** - Selected calendar stored in database
- **Centralized auth state** - Single source of truth for authentication
- **Improved security** - Proper token management and validation
- **Enhanced database queries** - Proper field selection for complete patient data
- **CORS configuration** - Support for all CRUD operations (GET, POST, PUT, DELETE)
- **Type safety improvements** - Better TypeScript integration throughout

## ✨ Features

### 🔐 **Production-Ready Google Authentication**
- **Real Google Sign-In** for both development and production
- **Firebase Authentication** with persistent sessions
- **Multi-tenant registration** - Any therapist can sign up with Google account
- **Secure token management** with automatic refresh
- **No development mode bypasses** - Always uses real authentication

### 📅 Google Calendar Integration
- **Real-time webhook integration** for automatic session creation
- **Calendar selection during onboarding** - therapists choose which calendar to use
- **Persistent calendar selection** - no re-selection required
- **Automatic event synchronization** - calendar events create therapy sessions
- **Session status tracking** (scheduled, attended, cancelled)
- **Multi-calendar support** - works with any Google Calendar the user has access to

### 👥 Patient Management
- **Multi-tenant patient system** - therapists manage only their patients
- **Manual patient addition** with form validation
- **Calendar import** functionality (coming soon)
- **Patient-session linking** with proper database relationships

### ✅ Check-in System
- **Real-time patient check-in** with friendly Portuguese interface
- **Session confirmation** with automatic calendar event creation
- **Patient selection** with dynamic session loading
- **Error handling** with descriptive Portuguese messages

### 🚀 Modern Navigation
- **URL-based routing** with Portuguese endpoints:
  - `/` - Dashboard (home)
  - `/check-in` - Patient check-in
  - `/pacientes` - Patient management  
  - `/configuracoes` - Settings with logout functionality
- **Browser navigation support** (back/forward buttons work)
- **Bookmarkable URLs** for each section
- **Clean navigation bar** with active state indicators

### ⚙️ Settings & Administration
- **Account management** with therapist details
- **Google Calendar status** and reconnection options
- **Secure logout functionality** with complete state cleanup
- **Multi-tenant open registration** - Any Google account can sign up

## 🏗️ Technical Architecture

### Authentication System
- **Firebase Authentication** for production with Google Sign-In
- **Real authentication everywhere** - No mock users or development bypasses
- **Automatic environment detection** (localhost vs production)
- **Persistent authentication state** across page refreshes
- **Secure token management** with automatic refresh
- **AuthContext for state management** - Centralized authentication logic

### Backend (Node.js + TypeScript)
- **Express.js** REST API with type-safe routes
- **PostgreSQL** database with proper foreign key relationships
- **Google Calendar API** integration with service account AND user OAuth
- **Firebase Authentication verification** for secure access
- **Real-time webhooks** for calendar synchronization
- **CORS protection** with PUT method support
- **Rate limiting** and security headers
- **Multi-calendar support** with per-therapist calendar selection

### Frontend (React Native Web + TypeScript)
- **React Native Web** for cross-platform compatibility
- **TypeScript** for type safety
- **Custom routing system** with URL-based navigation
- **Responsive design** with modern Portuguese interface
- **Real-time state management** with AuthContext
- **Authentication state persistence**

### Database Schema
- **Multi-tenant architecture** with therapist relationships
- **Foreign key constraints** for data integrity
- **Session tracking** with status management
- **Calendar webhook management** for reliability
- **Therapist calendar ID storage** for persistent calendar selection

## 📁 Project Structure

```
lv-notas/
├── src/                              # Frontend source code
│   ├── components/                   # React components
│   │   ├── Router.tsx               # URL routing with authentication
│   │   ├── NavigationBar.tsx         # Main navigation
│   │   ├── TherapistOnboarding.tsx   # Complete auth + onboarding flow
│   │   ├── CalendarSelection.tsx     # Google Calendar selection UI
│   │   ├── CheckInForm.tsx           # Patient check-in interface
│   │   ├── PatientManagement.tsx     # Patient management interface
│   │   └── Settings.tsx             # Settings with logout functionality
│   ├── config/                      # Configuration files
│   │   └── firebase.ts              # Firebase authentication setup
│   ├── contexts/                    # React Context providers
│   │   └── AuthContext.tsx          # Centralized authentication state
│   ├── services/                    # API service layer
│   │   └── api.ts                   # API client with authentication
│   ├── types/                       # TypeScript type definitions
│   │   └── index.ts                 # Shared types and interfaces
│   └── utils/                       # Utility functions
│       └── url-helper.ts           # URL parsing helpers
├── clinic-api/                      # Backend API server
│   ├── src/                         # Backend source code
│   │   ├── config/                  # Server configuration
│   │   │   └── database.ts          # PostgreSQL connection setup
│   │   ├── routes/                  # API route handlers
│   │   │   ├── calendar-webhook.ts  # Google Calendar webhook handler
│   │   │   ├── calendar-events.ts   # Calendar events with therapist filtering
│   │   │   ├── calendars.ts         # Calendar listing endpoint
│   │   │   ├── checkin.ts          # Patient check-in API
│   │   │   ├── patients.ts         # Patient management API
│   │   │   ├── sessions.ts         # Session management API
│   │   │   └── therapists.ts       # Therapist account API
│   │   ├── services/                # Business logic services
│   │   │   ├── google-calendar.ts   # Google Calendar API integration
│   │   │   └── session-sync.ts     # Calendar-session synchronization
│   │   ├── types/                   # Backend type definitions
│   │   │   └── calendar.ts         # Calendar-related types
│   │   └── server.ts               # Express server setup
│   ├── scripts/                     # Development scripts
│   │   └── start-local.sh          # Local development with ngrok
│   ├── db/                         # Database management
│   │   ├── 001_initial_schema.sql  # Database schema
│   │   └── seed/                   # Test data scripts
│   ├── .env                        # Environment variables
│   ├── nodemon.json               # Development server config
│   ├── package.json               # Backend dependencies
│   ├── tsconfig.json              # TypeScript configuration
│   └── service-account-key.json    # Google service account (not in repo)
├── App.tsx                         # Main application entry point
├── index.js                        # React Native entry point
├── package.json                    # Frontend dependencies
├── tsconfig.json                   # Frontend TypeScript config
└── README.md                       # This documentation
```

## 🚀 Quick Start

### Prerequisites
- Node.js v18.x+
- PostgreSQL 14.x+
- Google Calendar API credentials
- Firebase project setup

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository>
cd lv-notas
npm install
cd clinic-api && npm install
```

2. **Set up environment variables:**

**Frontend (.env.local):**
```bash
# Frontend environment variables
SAFE_PROXY_API_KEY=your_secure_api_key
EXPO_PUBLIC_LOCAL_URL=http://localhost:3000
EXPO_PUBLIC_SAFE_PROXY_URL=https://your-backend-url
EXPO_PUBLIC_AIRTABLE_BASE_ID=legacy_not_used

# Firebase Configuration (must have EXPO_PUBLIC_ prefix)
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
```

**Backend (clinic-api/.env):**
```bash
# Database Configuration
POSTGRES_USER=your_postgres_user
POSTGRES_HOST=localhost
POSTGRES_DB=clinic_db
POSTGRES_PASSWORD=your_postgres_password
POSTGRES_PORT=5432

# API Security
SAFE_PROXY_KEY=your_secure_api_key

# Google Calendar Integration
GOOGLE_CALENDAR_ID=your_default_calendar_id
```

3. **Set up database:**
```bash
createdb clinic_db
psql -U your_postgres_user clinic_db < clinic-api/db/001_initial_schema.sql
```

4. **Add Google Calendar credentials:**
   - Place `service-account-key.json` in the clinic-api root directory

5. **Configure Firebase:**
   - Create Firebase project with Google Sign-In enabled
   - Add localhost and your production domain to authorized domains
   - Update environment variables with your Firebase config

### Development

1. **Start backend with ngrok tunnel:**
```bash
cd clinic-api/scripts && ./start-local.sh
```

2. **Start frontend:**
```bash
npm start
# Press 'w' for web
```

3. **Access the application:**
   - **New therapist onboarding:** `localhost:19006/` (automatic)
   - **Main application:** `localhost:19006/` (after onboarding)
   - **Patient management:** `localhost:19006/pacientes`
   - **Settings:** `localhost:19006/configuracoes`

## 📱 Usage

### First Time Setup
1. Navigate to the app - Google Sign-In happens automatically
2. **Any Google account** can sign up - no restrictions
3. Select your Google Calendar for session management
4. Add your first patients
5. Start using the check-in system

### Daily Workflow
1. **Dashboard** - Overview and quick actions
2. **Check-in** - Patients confirm attendance
3. **Pacientes** - Manage patient roster
4. **Configurações** - Account settings and logout

### Authentication Features
- **Automatic sign-in detection** - Uses existing Chrome/Google sessions
- **Persistent sessions** - Stays logged in across browser sessions
- **Secure logout** - Clears all authentication data
- **Calendar persistence** - Remembers calendar selection
- **Multi-tenant security** - Each therapist isolated

### Calendar Integration
- Create events in your selected Google Calendar
- Events automatically become therapy sessions
- Patients can check-in using their unique links
- Session statuses update in real-time
- **Calendar selection persists** - No need to re-select calendar

## 🔧 API Endpoints

### Authentication Required
- `GET /api/patients?therapistEmail=` - Get therapist's patients
- `POST /api/patients` - Create new patient
- `GET /api/sessions/:patientId?therapistEmail=` - Get patient sessions
- `POST /api/checkin` - Submit patient check-in
- `GET /api/calendars` - List Google Calendars
- `GET /api/calendar-events?therapistEmail=` - Get events from therapist's calendar
- `GET /api/therapists/:email` - Get therapist details
- `POST /api/therapists` - Create therapist
- `PUT /api/therapists/:email/calendar` - Update calendar

### Webhooks
- `POST /api/calendar-webhook` - Google Calendar notifications

## 🗄️ Database Schema

### Core Tables
- **therapists** - Therapist accounts with Google Calendar IDs
- **patients** - Patient records linked to therapists
- **sessions** - Therapy sessions from calendar events
- **check_ins** - Patient attendance records
- **calendar_webhooks** - Active webhook subscriptions

## 🔐 Security Features

- **Firebase Authentication** with Google Sign-In
- **API key validation** for all requests
- **Multi-tenant data isolation** 
- **Rate limiting** on API endpoints
- **CORS protection** with PUT method support
- **SQL injection prevention** with parameterized queries
- **Secure token management** with automatic refresh

## 🌍 Internationalization

- **Portuguese interface** throughout the application
- **Localized error messages** and user feedback
- **Brazilian timezone** support (America/Sao_Paulo)
- **Cultural adaptations** for therapy practice workflow

## 🚀 Deployment

### Production Setup
- Backend: Google Cloud Run or similar container platform
- Frontend: Firebase Hosting or Netlify
- Database: Google Cloud SQL (PostgreSQL)
- Authentication: Firebase Authentication with Google Sign-In

### Environment Configuration
- Production Firebase Authentication with real Google Sign-In
- Real Google Calendar API integration
- Secure environment variable management
- SSL/TLS encryption for all endpoints

## 🔄 Development vs Production

### ✅ Updated Authentication Behavior
- **Both Development and Production** now use real Google Sign-In
- **No more mock authentication** - Always requires real Google account
- **Consistent behavior** - Same authentication flow everywhere
- **Real API calls** - No development mode skipping

### Development Mode Features
- **Localhost CORS bypass** - Simplified development setup
- **Debug logging** - Detailed console output for troubleshooting
- **Hot reload support** - Changes reflect immediately

### Production Mode Features
- **Real Firebase Authentication** - Full Google Sign-In integration
- **Production security** - All authentication checks enabled
- **Performance optimized** - Minimal logging
- **Error handling** - User-friendly error messages

## 📝 Authentication Enhancement Summary

### ✅ What Was Implemented
1. **Real Google Sign-In** - Complete Firebase integration
2. **Chrome account detection** - Uses existing Google sessions
3. **Persistent authentication** - localStorage + Firebase tokens
4. **Secure logout** - Complete state cleanup
5. **Calendar selection persistence** - No re-selection required
6. **Multi-tenant open registration** - Any Google account can sign up
7. **Production ready** - Real authentication for deployment
8. **AuthContext integration** - Centralized authentication state management
9. **Calendar-specific event loading** - Dashboard respects selected calendar
10. **Fixed patient loading** - AuthContext integration for patient management

### 🎯 Key Benefits
- **Seamless user experience** - Automatic authentication detection
- **Production security** - Enterprise-grade Firebase authentication
- **Developer friendly** - Real authentication even in development
- **Persistent sessions** - Users stay logged in across page refreshes
- **Multi-tenant safe** - Each therapist sees only their data
- **Calendar flexibility** - Support for multiple Google Calendars
- **Centralized state** - Single source of truth for authentication

## 📄 License

This project is proprietary software for LV Notas therapy practice management.

---

**Built with ❤️ for modern therapy practice management**

*Now featuring real Google authentication, persistent sessions, and multi-calendar support for seamless, secure access!*