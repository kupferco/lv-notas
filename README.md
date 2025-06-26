# LV Notas - Therapist Management System

A complete Node.js/TypeScript system for managing therapy clinics with **real Google authentication**, Google Calendar integration, patient management, session management, and real-time session tracking.

## 🆕 Recent Improvements (June 2025)

### 📅 **Complete Session Management System**
- ✅ **Full Sessions CRUD** - Create, read, update, and cancel therapy sessions
- ✅ **Advanced filtering** - Filter sessions by status, patient, and date
- ✅ **Session status tracking** - Agendada, Compareceu, Cancelada
- ✅ **Native browser dropdowns** - Clean, consistent UI with native select elements
- ✅ **Real-time session updates** - Changes reflect immediately across the system
- ✅ **Calendar integration** - Sessions sync with Google Calendar events
- ✅ **Multi-therapist support** - Each therapist manages only their sessions
- ✅ **Portuguese interface** - Complete localization for Brazilian therapists

### 🔧 **Authentication & Session Management**
- ✅ **Fixed authentication persistence** - Users stay logged in after page refresh
- ✅ **Real Google Sign-In everywhere** - No more development mode bypasses
- ✅ **AuthContext integration** - Centralized authentication state management
- ✅ **Secure logout functionality** - Complete localStorage cleanup
- ✅ **Chrome account detection** - Automatic sign-in with existing Google sessions

### 🚀 **Complete Bidirectional Google Calendar Sync**
- ✅ **Session → Calendar sync** - Sessions automatically create calendar events with patient invitations
- ✅ **Session updates → Calendar updates** - Editing sessions updates calendar events (time, patient, details)
- ✅ **Session deletion → Calendar deletion** - Deleting sessions removes calendar events
- ✅ **Dynamic timezone handling** - Uses therapist's Google Calendar timezone settings
- ✅ **OAuth-based calendar access** - Uses therapist's own permissions for all calendar operations
- ✅ **Patient email invitations** - Automatic calendar invites with proper attendee management
- ✅ **Timezone accuracy** - Fixed 1-hour offset issues with proper local time handling
- ✅ **Multi-calendar support** - Each therapist uses their own selected Google Calendar
- ✅ **Comprehensive error handling** - Graceful handling of expired tokens and invalid data
- ✅ **Calendar event linking** - Sessions store Google Calendar event IDs for perfect sync
- 🚧 **Calendar → Session sync** - Webhook foundation ready for reverse sync (future enhancement)

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
- **Enhanced database queries** - Proper field selection for complete data
- **CORS configuration** - Support for all CRUD operations (GET, POST, PUT, DELETE)
- **Type safety improvements** - Better TypeScript integration throughout
- **Native UI elements** - Consistent browser-native form controls

## ✨ Features

### 📋 **Complete Session Management**
- **Session CRUD operations** - Full create, read, update, delete functionality
- **Advanced filtering system** - Filter by status (Agendada/Compareceu/Cancelada), patient, or date
- **Real-time status updates** - Sessions update immediately across all views
- **Calendar integration** - Sessions automatically sync with Google Calendar
- **Multi-therapist isolation** - Each therapist manages only their sessions
- **Native browser dropdowns** - Clean, consistent user interface
- **Portuguese localization** - Complete interface in Brazilian Portuguese

### 🔐 **Production-Ready Google Authentication**
- **Real Google Sign-In** for both development and production
- **Firebase Authentication** with persistent sessions
- **Multi-tenant registration** - Any therapist can sign up with Google account
- **Secure token management** with automatic refresh
- **No development mode bypasses** - Always uses real authentication

### 📅 **Advanced Google Calendar Integration**
- **Bidirectional sync foundation** - Infrastructure for calendar ↔ sessions synchronization
- **OAuth + Service Account hybrid** - OAuth for user operations, service account for webhooks
- **Automatic event creation** - Sessions create calendar events with patient invitations
- **Calendar selection persistence** - Therapists choose and maintain their calendar preference
- **Multi-calendar support** - Each therapist uses their own Google Calendar
- **Real-time webhook integration** for automatic session creation from calendar events
- **Session status tracking** (scheduled, attended, cancelled) with calendar sync
- **Patient email invitations** - Automatic calendar invites sent to patients

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
  - `/sessoes` - **NEW** Session management
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
- **Complete session management** with CRUD operations

### Frontend (React Native Web + TypeScript)
- **React Native Web** for cross-platform compatibility
- **TypeScript** for type safety
- **Custom routing system** with URL-based navigation
- **Responsive design** with modern Portuguese interface
- **Real-time state management** with AuthContext
- **Authentication state persistence**
- **Native browser controls** for consistent UX

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
│   │   ├── Sessions.tsx             # **NEW** Complete session management
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
│   │   │   ├── sessions.ts         # **NEW** Complete session management API
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
   - **Session management:** `localhost:19006/sessoes` ⭐ **NEW**
   - **Patient management:** `localhost:19006/pacientes`
   - **Settings:** `localhost:19006/configuracoes`

## 📱 Usage

### First Time Setup
1. Navigate to the app - Google Sign-In happens automatically
2. **Any Google account** can sign up - no restrictions
3. Select your Google Calendar for session management
4. Add your first patients
5. Start using the check-in system and session management

### Daily Workflow
1. **Dashboard** - Overview and quick actions
2. **Check-in** - Patients confirm attendance
3. **Sessões** ⭐ **NEW** - Complete session management with filtering and CRUD operations
4. **Pacientes** - Manage patient roster
5. **Configurações** - Account settings and logout

### Session Management Features
- **Create new sessions** manually with patient, date, time, and status
- **Filter sessions** by status (Agendada/Compareceu/Cancelada), patient, or date
- **Edit existing sessions** - modify patient, date, time, or status
- **Cancel sessions** with confirmation dialogs
- **View session details** including Google Calendar event IDs
- **Real-time updates** - changes reflect immediately

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
- `GET /api/sessions?therapistEmail=` - **NEW** Get therapist's sessions
- `POST /api/sessions` - **NEW** Create new session
- `PUT /api/sessions/:id` - **NEW** Update session
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
- **sessions** - Therapy sessions from calendar events AND manual creation
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

## 📝 Latest Enhancement Summary

### ✅ Complete Session Management + Bidirectional Google Calendar Sync
1. **Complete CRUD operations** - Create, read, update, delete sessions with full calendar sync
2. **Bidirectional Google Calendar integration** - Sessions ↔ Calendar events in real-time
3. **Dynamic timezone handling** - Uses therapist's Google Calendar timezone automatically
4. **Advanced filtering** - Status, patient, and date filters with native browser dropdowns
5. **Real-time updates** - Changes reflect immediately in both LV Notas and Google Calendar
6. **Patient email invitations** - Automatic calendar invites with attendee management
7. **OAuth-based calendar operations** - Uses therapist's own permissions for all calendar access
8. **Multi-therapist isolation** - Secure data separation with individual calendar management
9. **Portuguese localization** - Complete Brazilian Portuguese interface with proper error messages
10. **Comprehensive error handling** - Token expiration, invalid data, and permission errors handled gracefully
11. **Timezone accuracy** - Fixed offset issues with proper local time interpretation
12. **Type-safe API** - Full TypeScript integration with proper error propagation
13. **Foreign key management** - Proper deletion cascade for sessions, check-ins, and calendar events
14. **Responsive design** - Works across all screen sizes with native form controls

### 🔗 **Complete Google Calendar Integration Achievements**
1. **Bidirectional calendar sync** - Sessions ↔ Calendar events with full CRUD operations
2. **Dynamic timezone handling** - Uses therapist's Google Calendar timezone automatically
3. **OAuth + Service Account hybrid** - OAuth for user operations, service account for webhooks
4. **Automatic calendar event creation** - Sessions create events with patient invitations
5. **Real-time calendar updates** - Session edits update calendar events immediately
6. **Calendar event deletion** - Deleting sessions removes calendar events
7. **Patient invitation system** - Patients receive email invitations automatically
8. **Calendar selection persistence** - Therapists maintain their calendar preference
9. **Token expiration handling** - Graceful degradation when OAuth tokens expire
10. **Multi-calendar support** - Each therapist uses their own Google Calendar
11. **Timezone accuracy fixes** - Resolved 1-hour offset issues with proper local time handling
12. **Comprehensive error handling** - Invalid emails, permissions, and auth errors handled
13. **Calendar event ID tracking** - Perfect sync between sessions and calendar events
14. **Foreign key constraint handling** - Proper deletion of related check-ins and events

### 🎯 Key Benefits
- **Complete workflow coverage** - From patient onboarding to session management
- **Production security** - Enterprise-grade Firebase authentication
- **Developer friendly** - Real authentication even in development
- **Persistent sessions** - Users stay logged in across page refreshes
- **Multi-tenant safe** - Each therapist sees only their data
- **Calendar flexibility** - Support for multiple Google Calendars
- **Centralized state** - Single source of truth for authentication
- **Native UI experience** - Consistent browser-native form controls

## 📄 License

This project is proprietary software for LV Notas therapy practice management.

---

**Built with ❤️ for modern therapy practice management**

*Now featuring complete session management with real Google authentication, persistent sessions, and multi-calendar support for seamless, secure practice management!*