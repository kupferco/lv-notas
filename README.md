# LV Notas - Therapist Management System

A complete Node.js/TypeScript system for managing therapy clinics with **real Google authentication**, Google Calendar integration, patient management, and real-time session tracking.

## ✨ Features

### 🔐 **NEW: Real Google Authentication**
- **Complete Google Sign-In integration** with Chrome account detection
- **Development mode** with mock authentication for testing
- **Production mode** with real Firebase authentication
- **Persistent sessions** with localStorage and Firebase tokens
- **Secure sign-out** with proper state cleanup
- **Multi-tenant support** - each therapist sees only their data

### 📅 Google Calendar Integration
- **Real-time webhook integration** for automatic session creation
- **Calendar selection during onboarding** - therapists choose which calendar to use
- **Persistent calendar selection** - no re-selection required
- **Automatic event synchronization** - calendar events create therapy sessions
- **Session status tracking** (scheduled, attended, cancelled)

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
- **Development mode indicators**

## 🏗️ Technical Architecture

### Authentication System
- **Firebase Authentication** for production with Google Sign-In
- **Mock authentication** for development with localStorage
- **Automatic environment detection** (localhost vs production)
- **Persistent authentication state** across page refreshes
- **Secure token management** with automatic refresh

### Backend (Node.js + TypeScript)
- **Express.js** REST API with type-safe routes
- **PostgreSQL** database with proper foreign key relationships
- **Google Calendar API** integration with service account
- **Firebase Authentication verification** for secure access
- **Real-time webhooks** for calendar synchronization
- **CORS protection** with PUT method support
- **Rate limiting** and security headers

### Frontend (React Native Web + TypeScript)
- **React Native Web** for cross-platform compatibility
- **TypeScript** for type safety
- **Custom routing system** with URL-based navigation
- **Responsive design** with modern Portuguese interface
- **Real-time state management**
- **Authentication state persistence**

### Database Schema
- **Multi-tenant architecture** with therapist relationships
- **Foreign key constraints** for data integrity
- **Session tracking** with status management
- **Calendar webhook management** for reliability

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
```bash
# Backend (.env)
POSTGRES_USER=your_postgres_user
POSTGRES_HOST=localhost  
POSTGRES_DB=clinic_db
POSTGRES_PASSWORD=your_postgres_password
POSTGRES_PORT=5432
SAFE_PROXY_KEY=your_secure_api_key
GOOGLE_CALENDAR_ID=your_default_calendar_id

# Frontend (.env)
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
SAFE_PROXY_API_KEY=your_secure_api_key
EXPO_PUBLIC_SAFE_PROXY_URL=your_backend_url
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
   - Add localhost to authorized domains
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
1. Navigate to the app - authentication happens automatically
2. **Development:** Mock user created automatically
3. **Production:** Google Sign-In popup appears
4. Select your Google Calendar for session management
5. Add your first patients
6. Start using the check-in system

### Daily Workflow
1. **Dashboard** - Overview and quick actions
2. **Check-in** - Patients confirm attendance
3. **Pacientes** - Manage patient roster
4. **Configurações** - Account settings and logout

### Authentication Features
- **Automatic sign-in detection** - uses existing Chrome/Google sessions
- **Persistent sessions** - stays logged in across browser sessions
- **Secure logout** - clears all authentication data
- **Calendar persistence** - remembers calendar selection
- **Development mode** - works offline with mock authentication

### Calendar Integration
- Create events in your selected Google Calendar
- Events automatically become therapy sessions
- Patients can check-in using their unique links
- Session statuses update in real-time

## 🔧 API Endpoints

### Authentication Required
- `GET /api/patients` - Get therapist's patients
- `POST /api/patients` - Create new patient
- `GET /api/sessions/:patientId` - Get patient sessions
- `POST /api/checkin` - Submit patient check-in
- `GET /api/calendars` - List Google Calendars
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

### Development Mode (localhost)
- **Mock authentication** - automatic test user creation
- **localStorage persistence** - sessions persist across refreshes
- **No Firebase required** - works completely offline
- **Debug logging** - detailed console output
- **CORS bypass** - simplified development setup

### Production Mode
- **Real Firebase Authentication** - Google Sign-In popup
- **Firebase token management** - secure token refresh
- **Production security** - all authentication checks enabled
- **Error handling** - user-friendly error messages
- **Performance optimized** - minimal logging

## 📝 Authentication Enhancement Summary

### ✅ What Was Implemented
1. **Real Google Sign-In** - Complete Firebase integration
2. **Chrome account detection** - Uses existing Google sessions
3. **Persistent authentication** - localStorage + Firebase tokens
4. **Secure logout** - Complete state cleanup
5. **Calendar selection persistence** - No re-selection required
6. **Development mode** - Mock authentication for testing
7. **Production ready** - Real authentication for deployment

### 🎯 Key Benefits
- **Seamless user experience** - Automatic authentication detection
- **Production security** - Enterprise-grade Firebase authentication
- **Developer friendly** - Works offline with mock authentication
- **Persistent sessions** - Users stay logged in
- **Multi-tenant safe** - Each therapist sees only their data

## 📄 License

This project is proprietary software for LV Notas therapy practice management.

---

**Built with ❤️ for modern therapy practice management**

*Now featuring real Google authentication for seamless, secure access!*