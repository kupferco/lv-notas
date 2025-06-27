# LV Notas - Therapist Management System

A complete Node.js/TypeScript system for managing therapy clinics with **real Google authentication**, **complete bidirectional Google Calendar integration**, patient management, session management, and real-time session tracking.

## 🆕 Latest Achievement (June 2025) - Complete Bidirectional Sync! 🎉

### 🔄 **COMPLETE Bidirectional Google Calendar Integration**
- ✅ **LV Notas → Google Calendar** - Sessions automatically create/update/delete calendar events
- ✅ **Google Calendar → LV Notas** - **NEW!** Manual calendar changes automatically update sessions
- ✅ **Real-time webhook sync** - Changes reflect instantly in both directions
- ✅ **Smart patient matching** - Finds patients by email OR name from calendar events
- ✅ **Automatic session creation** - Therapists can create sessions directly in Google Calendar
- ✅ **Dynamic webhook management** - Automatic ngrok URL updates and webhook re-registration
- ✅ **Multi-calendar support** - Each therapist uses their own Google Calendar
- ✅ **Comprehensive error handling** - Graceful handling of webhook failures and sync conflicts

### 📅 **Advanced Session Management System**
- ✅ **Complete Sessions CRUD** - Create, read, update, and cancel therapy sessions
- ✅ **Advanced filtering** - Filter sessions by status, patient, and date
- ✅ **Session status tracking** - Agendada, Compareceu, Cancelada
- ✅ **Native browser dropdowns** - Clean, consistent UI with native select elements
- ✅ **Real-time session updates** - Changes reflect immediately across the system
- ✅ **Calendar integration** - Sessions sync with Google Calendar events in both directions
- ✅ **Multi-therapist support** - Each therapist manages only their sessions
- ✅ **Portuguese interface** - Complete localization for Brazilian therapists

### 🔧 **Authentication & Session Management**
- ✅ **Fixed authentication persistence** - Users stay logged in after page refresh
- ✅ **Real Google Sign-In everywhere** - No more development mode bypasses
- ✅ **AuthContext integration** - Centralized authentication state management
- ✅ **Secure logout functionality** - Complete localStorage cleanup
- ✅ **Chrome account detection** - Automatic sign-in with existing Google sessions

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
- **Complete bidirectional sync** - Both directions working flawlessly
- **Dynamic webhook management** - Automatic ngrok URL handling for development
- **Smart patient matching** - Email-first, name-fallback matching system
- **Real-time reverse sync** - Calendar changes instantly update LV Notas
- **Webhook reliability** - Comprehensive error handling and recovery
- **Multi-calendar architecture** - Support for individual therapist calendars
- **TypeScript safety** - Improved error handling throughout
- **Development workflow** - Seamless ngrok + webhook integration

## ✨ Features

### 🔄 **Complete Bidirectional Google Calendar Integration**
- **LV Notas → Calendar sync** - Sessions automatically create calendar events with patient invitations
- **Calendar → LV Notas sync** - **NEW!** Manual calendar changes automatically update sessions
- **Session updates → Calendar updates** - Editing sessions updates calendar events (time, patient, details)
- **Session deletion → Calendar deletion** - Deleting sessions removes calendar events
- **Manual calendar events → Sessions** - Creating "Sessão - Patient Name" events in calendar creates LV Notas sessions
- **Real-time webhook notifications** - Changes sync instantly in both directions
- **Dynamic timezone handling** - Uses therapist's Google Calendar timezone settings
- **OAuth-based calendar access** - Uses therapist's own permissions for all calendar operations
- **Patient email invitations** - Automatic calendar invites with proper attendee management
- **Timezone accuracy** - Fixed 1-hour offset issues with proper local time handling
- **Multi-calendar support** - Each therapist uses their own selected Google Calendar
- **Comprehensive error handling** - Graceful handling of expired tokens and invalid data
- **Calendar event linking** - Sessions store Google Calendar event IDs for perfect sync
- **Smart patient matching** - Finds patients by email OR name when processing calendar events

### 📋 **Complete Session Management**
- **Session CRUD operations** - Full create, read, update, delete functionality
- **Advanced filtering system** - Filter by status (Agendada/Compareceu/Cancelada), patient, or date
- **Real-time status updates** - Sessions update immediately across all views
- **Calendar integration** - Sessions automatically sync with Google Calendar in both directions
- **Multi-therapist isolation** - Each therapist manages only their sessions
- **Native browser dropdowns** - Clean, consistent user interface
- **Portuguese localization** - Complete interface in Brazilian Portuguese

### 🔐 **Production-Ready Google Authentication**
- **Real Google Sign-In** for both development and production
- **Firebase Authentication** with persistent sessions
- **Multi-tenant registration** - Any therapist can sign up with Google account
- **Secure token management** with automatic refresh
- **No development mode bypasses** - Always uses real authentication

### 👥 Patient Management
- **Multi-tenant patient system** - therapists manage only their patients
- **Manual patient addition** with form validation
- **Calendar import** functionality for reverse sync
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
  - `/sessoes` - Session management
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

### Bidirectional Sync System
- **Webhook-based reverse sync** - Google Calendar changes trigger LV Notas updates
- **Service account + OAuth hybrid** - Service account for webhooks, OAuth for user operations
- **Smart event detection** - Identifies therapy sessions by "Sessão - Patient Name" pattern
- **Patient matching algorithms** - Email-first, name-fallback matching system
- **Dynamic webhook management** - Automatic URL updates for development with ngrok
- **Multi-calendar webhook support** - Individual webhooks per therapist calendar

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
- **Real-time webhooks** for bidirectional calendar synchronization
- **CORS protection** with PUT method support
- **Rate limiting** and security headers
- **Multi-calendar support** with per-therapist calendar selection
- **Complete session management** with CRUD operations
- **Dynamic webhook URL management** for development workflow

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
│   │   ├── Sessions.tsx             # Complete session management
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
│   │   │   ├── calendar-webhook.ts  # Google Calendar webhook handler with reverse sync
│   │   │   ├── calendar-events.ts   # Calendar events with therapist filtering
│   │   │   ├── calendars.ts         # Calendar listing endpoint
│   │   │   ├── checkin.ts          # Patient check-in API
│   │   │   ├── patients.ts         # Patient management API
│   │   │   ├── sessions.ts         # Complete session management API
│   │   │   └── therapists.ts       # Therapist account API
│   │   ├── services/                # Business logic services
│   │   │   ├── google-calendar.ts   # Google Calendar API integration with reverse sync
│   │   │   └── session-sync.ts     # Bidirectional calendar-session synchronization
│   │   ├── types/                   # Backend type definitions
│   │   │   └── calendar.ts         # Calendar-related types
│   │   └── server.ts               # Express server setup with dynamic webhook management
│   ├── scripts/                     # Development scripts
│   │   └── start-dev.ts            # Local development with automatic ngrok + webhook setup
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

# Google Calendar Integration (will be set by start-dev.ts)
GOOGLE_CALENDAR_ID=your_therapist_calendar_id
WEBHOOK_URL=https://your-ngrok-url.ngrok-free.app
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

1. **Start backend with automatic ngrok + webhook setup:**
```bash
cd clinic-api/scripts && ./start-local.sh
```

This automatically:
- Loads secrets from Google Cloud Secret Manager
- Creates fresh ngrok tunnel
- Updates webhook URL dynamically
- Registers webhook with Google Calendar
- Starts development server

2. **Start frontend:**
```bash
npm start
# Press 'w' for web
```

3. **Access the application:**
   - **New therapist onboarding:** `localhost:19006/` (automatic)
   - **Main application:** `localhost:19006/` (after onboarding)
   - **Session management:** `localhost:19006/sessoes` ⭐ **With bidirectional sync**
   - **Patient management:** `localhost:19006/pacientes`
   - **Settings:** `localhost:19006/configuracoes`

## 📱 Usage

### First Time Setup
1. Navigate to the app - Google Sign-In happens automatically
2. **Any Google account** can sign up - no restrictions
3. Select your Google Calendar for session management
4. Add your first patients
5. Start using the check-in system and bidirectional session management

### Daily Workflow
1. **Dashboard** - Overview and quick actions
2. **Check-in** - Patients confirm attendance
3. **Sessões** ⭐ **NEW** - Complete session management with bidirectional calendar sync
4. **Pacientes** - Manage patient roster
5. **Configurações** - Account settings and logout

### Bidirectional Sync Features
- **Create sessions in LV Notas** → Automatically creates calendar events with patient invitations
- **Create events in Google Calendar** → Automatically creates LV Notas sessions (use "Sessão - Patient Name" format)
- **Edit sessions in LV Notas** → Updates calendar events
- **Edit events in Google Calendar** → Updates LV Notas sessions
- **Delete sessions in LV Notas** → Removes calendar events
- **Delete events in Google Calendar** → Removes LV Notas sessions
- **Real-time updates** - Changes reflect immediately in both systems
- **Smart patient matching** - Finds patients by email or name

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
- Events automatically become therapy sessions (reverse sync)
- Patients can check-in using their unique links
- Session statuses update in real-time
- **Calendar selection persists** - No need to re-select calendar
- **Bidirectional sync** - Changes work in both directions

## 🔧 API Endpoints

### Authentication Required
- `GET /api/patients?therapistEmail=` - Get therapist's patients
- `POST /api/patients` - Create new patient
- `GET /api/sessions?therapistEmail=` - Get therapist's sessions
- `POST /api/sessions` - Create new session
- `PUT /api/sessions/:id` - Update session
- `GET /api/sessions/:patientId?therapistEmail=` - Get patient sessions
- `POST /api/checkin` - Submit patient check-in
- `GET /api/calendars` - List Google Calendars
- `GET /api/calendar-events?therapistEmail=` - Get events from therapist's calendar
- `GET /api/therapists/:email` - Get therapist details
- `POST /api/therapists` - Create therapist
- `PUT /api/therapists/:email/calendar` - Update calendar

### Webhooks & Development
- `POST /api/calendar-webhook` - Google Calendar notifications (bidirectional sync)
- `POST /api/setup-webhook` - Register webhook with current ngrok URL
- `POST /api/update-webhook-url` - Dynamically update webhook URL
- `GET /api/debug-webhook` - Check webhook status
- `GET /api/verify-calendar` - Test calendar access

## 🗄️ Database Schema

### Core Tables
- **therapists** - Therapist accounts with Google Calendar IDs
- **patients** - Patient records linked to therapists
- **sessions** - Therapy sessions with bidirectional calendar sync
- **check_ins** - Patient attendance records
- **calendar_webhooks** - Active webhook subscriptions for reverse sync

## 🔐 Security Features

- **Firebase Authentication** with Google Sign-In
- **API key validation** for all requests
- **Multi-tenant data isolation** 
- **Rate limiting** on API endpoints
- **CORS protection** with PUT method support
- **SQL injection prevention** with parameterized queries
- **Secure token management** with automatic refresh
- **Webhook validation** for calendar notifications

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
- Webhooks: Stable production URLs (no ngrok)

### Environment Configuration
- Production Firebase Authentication with real Google Sign-In
- Real Google Calendar API integration with webhook support
- Secure environment variable management
- SSL/TLS encryption for all endpoints

## 🔄 Development vs Production

### ✅ Updated Authentication Behavior
- **Both Development and Production** now use real Google Sign-In
- **No more mock authentication** - Always requires real Google account
- **Consistent behavior** - Same authentication flow everywhere
- **Real API calls** - No development mode skipping

### Development Mode Features
- **Automatic ngrok tunnel management** - Fresh URLs on every restart
- **Dynamic webhook registration** - Automatic URL updates
- **Debug logging** - Detailed console output for troubleshooting
- **Hot reload support** - Changes reflect immediately

### Production Mode Features
- **Real Firebase Authentication** - Full Google Sign-In integration
- **Production security** - All authentication checks enabled
- **Performance optimized** - Minimal logging
- **Error handling** - User-friendly error messages
- **Stable webhook URLs** - No ngrok dependency

## 📝 Latest Enhancement Summary

### ✅ Complete Bidirectional Google Calendar Sync Achievement! 🎉

1. **Complete reverse sync implementation** - Google Calendar → LV Notas working flawlessly
2. **Dynamic webhook management** - Automatic ngrok URL handling for seamless development
3. **Smart patient matching** - Email-first, name-fallback algorithms for robust patient detection
4. **Real-time bidirectional updates** - Changes sync instantly in both directions
5. **Webhook reliability system** - Comprehensive error handling and automatic recovery
6. **Multi-calendar architecture** - Support for individual therapist calendars
7. **Development workflow optimization** - Seamless ngrok + webhook integration
8. **TypeScript safety improvements** - Better error handling throughout the application
9. **Portuguese localization** - Complete Brazilian Portuguese interface with proper error messages
10. **Production-ready architecture** - Scalable webhook system for multiple therapists

### 🔗 **Complete Bidirectional Integration Achievements**
1. **LV Notas → Calendar sync** - Sessions create/update/delete calendar events with patient invitations
2. **Calendar → LV Notas sync** - Manual calendar events create/update/delete LV Notas sessions
3. **Dynamic webhook management** - Automatic ngrok URL updates for development
4. **Smart patient matching** - Finds patients by email OR name from calendar events
5. **Real-time synchronization** - Changes reflect immediately in both systems
6. **Multi-therapist support** - Individual calendar management per therapist
7. **Comprehensive error handling** - Graceful degradation for all sync scenarios
8. **Development optimization** - Seamless webhook setup with automatic URL management

### 🎯 Key Benefits
- **Complete workflow coverage** - From patient onboarding to bidirectional session management
- **Production security** - Enterprise-grade Firebase authentication
- **Developer friendly** - Automatic webhook management even in development
- **Persistent sessions** - Users stay logged in across page refreshes
- **Multi-tenant safe** - Each therapist sees only their data
- **Calendar flexibility** - Support for multiple Google Calendars
- **Bidirectional sync** - Changes work seamlessly in both directions
- **Real-time updates** - Instant synchronization between systems

## 🗺️ Development Roadmap

### ✅ **Completed Features**
- **Complete bidirectional Google Calendar sync** - Sessions ↔ Calendar events with real-time webhooks
- **Authentication system** - Firebase Google Sign-In with persistent sessions
- **Session management** - Full CRUD with filtering and status tracking
- **Patient management** - Complete patient records with multi-tenant isolation
- **Dynamic webhook management** - Automatic ngrok URL handling for development

### 🚧 **Next Priority: Enhanced Therapist Onboarding**
**Goal**: Seamless transition for therapists with existing calendar appointments

**Key Features to Implement:**
- **📅 Calendar Import Wizard** - Import existing appointments from therapist's calendar
- **👥 Bulk Patient Creation** - Easy patient record creation from calendar events
- **🔗 Appointment Linking** - Connect imported calendar events to patient records
- **🔄 Recurring Session Detection** - Identify and manage repeating appointments
- **📊 Dual Date System** - Configure both historical therapy start and LV Notas billing start dates
- **💰 Billing Preferences** - Configure invoicing cycles (per session, weekly, monthly)
- **🎯 Smart Patient Matching** - Match calendar attendees to patient records

**Critical Date Distinction:**
- **Historical Therapy Start Date** (optional) - When therapist first started seeing the patient
- **LV Notas Billing Start Date** (required) - When to begin counting sessions for billing in LV Notas

### 🚀 **Phase 2: Brazilian Payment Integration (PIX + NFP)**
**Goal**: Complete payment automation for Brazilian therapy practices

**Planned Features:**
- **📱 WhatsApp Payment Requests** - Click-to-chat links with PIX payment details
- **🏦 Open Banking Integration** - Real-time payment monitoring via Brazilian Open Banking
- **⚡ PIX Payment Tracking** - Automatic detection and matching of PIX payments to sessions
- **📋 Nota Fiscal Paulista** - Automatic tax invoice generation for São Paulo therapists
- **💰 Payment Dashboard** - Real-time payment status (paid/pending) for all patients
- **📊 Financial Analytics** - Revenue tracking and expense categorization
- **🔄 Automated Reconciliation** - Payments automatically matched to sessions

### 🎯 **Phase 3: Advanced Practice Management**
**Goal**: Complete therapy practice automation

**Future Features:**
- **📈 Analytics Dashboard** - Session attendance, patient progress, revenue insights
- **🔔 Automated Reminders** - WhatsApp/SMS appointment reminders
- **📝 Session Notes** - Secure note-taking with LGPD compliance
- **📊 Progress Tracking** - Patient outcome measurements and therapy goals
- **👥 Multi-therapist Clinics** - Clinic-wide management for group practices
- **📱 Patient Mobile App** - Self-service booking and payment for patients

### 🔧 **Technical Debt & Improvements**
- **🔒 Enhanced Security** - Additional authentication layers and data encryption
- **⚡ Performance Optimization** - Database indexing and query optimization  
- **🌐 Internationalization** - Support for multiple languages and regions
- **📱 Mobile App** - Native iOS/Android applications
- **🧪 Testing Coverage** - Comprehensive unit and integration testing

## 📄 License

This project is proprietary software for LV Notas therapy practice management.

---

**Built with ❤️ for modern therapy practice management**

*Now featuring COMPLETE bidirectional Google Calendar sync with Brazilian payment integration roadmap for the ultimate therapy practice management experience!* 🚀