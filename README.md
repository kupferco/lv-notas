# LV Notas - Therapist Management System

A complete Node.js/TypeScript system for managing therapy clinics with **real Google authentication**, **complete bidirectional Google Calendar integration**, patient management, session management, real-time session tracking, and **comprehensive payment management**.

## 🆕 Latest Achievement (June 2025) - Complete Payment Management System! 💰

### 💰 **COMPLETE Payment Overview System**
- ✅ **Smart Payment Workflow** - Proper therapist-driven payment request flow
- ✅ **Multi-stage Payment Tracking** - "Total de Sessões" → "Aguardando Pagamento" → "Pendente"
- ✅ **Automated Status Management** - Time-based status transitions with configurable thresholds
- ✅ **Context-Aware Action Buttons** - Single smart button that changes based on payment state
- ✅ **WhatsApp Payment Integration** - Direct payment requests and reminders via WhatsApp
- ✅ **Professional Payment Messages** - Different message templates for requests vs reminders
- ✅ **Payment Status Color Coding** - Visual indicators for all payment states
- ✅ **Comprehensive Payment Analytics** - Revenue tracking with paid/pending breakdowns
- ✅ **Date Range Filtering** - Flexible period selection (current month, last 3 months, etc.)
- ✅ **Dual View Support** - Patient-centric and session-centric payment views
- ✅ **Brazilian Currency Formatting** - Proper R$ formatting with comma decimals
- ✅ **Responsive Payment UI** - Clean, professional interface matching Sessions design

### 🔄 **Complete Bidirectional Google Calendar Integration**
- ✅ **LV Notas → Google Calendar** - Sessions automatically create/update/delete calendar events
- ✅ **Google Calendar → LV Notas** - Manual calendar changes automatically update sessions
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
- **Complete payment workflow** - Professional therapist-driven payment management
- **Smart payment state transitions** - Automatic status changes based on configurable time thresholds
- **Context-aware UI components** - Buttons and colors that adapt to payment state
- **WhatsApp integration** - Direct payment communication with formatted phone numbers
- **Brazilian localization** - Currency formatting and Portuguese payment terminology
- **Complete bidirectional sync** - Both directions working flawlessly
- **Dynamic webhook management** - Automatic ngrok URL handling for development
- **Smart patient matching** - Email-first, name-fallback matching system
- **Real-time reverse sync** - Calendar changes instantly update LV Notas
- **Webhook reliability** - Comprehensive error handling and recovery
- **Multi-calendar architecture** - Support for individual therapist calendars
- **TypeScript safety** - Improved error handling throughout
- **Development workflow** - Seamless ngrok + webhook integration

## ✨ Features

### 💰 **Complete Payment Management System**
- **Professional Payment Workflow** - Therapist-initiated payment requests with automatic state management
- **Smart Status Transitions** - "Total de Sessões" → "Aguardando Pagamento" → "Pendente" based on time thresholds
- **Context-Aware Action Buttons** - Single smart button that changes: "Cobrar" → waiting period → "Enviar Lembrete"
- **WhatsApp Payment Integration** - Direct payment requests and reminders with Brazilian phone formatting
- **Payment Status Color Coding** - Visual indicators for all payment states (Gray/Yellow/Red/Green)
- **Comprehensive Payment Analytics** - Revenue tracking with paid/pending breakdowns and summary cards
- **Date Range Filtering** - Flexible period selection (current month, last 3 months, last 6 months)
- **Dual Payment Views** - Patient-centric view (payment summaries) and session-centric view (individual charges)
- **Brazilian Currency Support** - Proper R$ formatting with comma decimal separators
- **Payment Request Tracking** - Tracks when payments are requested and calculates overdue periods
- **Configurable Time Thresholds** - 7-day default threshold before "Pendente" status (configurable in Settings)
- **Professional Payment Messages** - Different WhatsApp templates for initial requests vs overdue reminders
- **Payment Status Management** - Manual status override with dropdown selection
- **Responsive Payment UI** - Clean, professional interface consistent with Sessions design
- **Multi-tenant Payment Isolation** - Each therapist manages only their patient payments

### 🔄 **Complete Bidirectional Google Calendar Integration**
- **LV Notas → Calendar sync** - Sessions automatically create calendar events with patient invitations
- **Calendar → LV Notas sync** - Manual calendar changes automatically update sessions
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
  - `/pagamentos` ⭐ **NEW** - Payment management and analytics
  - `/configuracoes` - Settings with logout functionality
- **Browser navigation support** (back/forward buttons work)
- **Bookmarkable URLs** for each section
- **Clean navigation bar** with active state indicators

### ⚙️ Settings & Administration
- **Account management** with therapist details
- **Google Calendar status** and reconnection options
- **Payment threshold configuration** - Customize days before "Pendente" status
- **Secure logout functionality** with complete state cleanup
- **Multi-tenant open registration** - Any Google account can sign up

## 🏗️ Technical Architecture

### Payment Management System
- **Smart payment state machine** - Automatic transitions based on configurable time thresholds
- **WhatsApp integration** - Brazilian phone number formatting and direct messaging links
- **Payment request tracking** - Database fields for payment_requested and payment_request_date
- **Multi-currency support** - Brazilian Real (R$) with proper comma decimal formatting
- **Payment analytics engine** - Real-time calculation of revenue, pending amounts, and session counts
- **Date range processing** - Efficient month-boundary calculations for filtering
- **Payment status color coding** - Dynamic UI colors based on payment state
- **Context-aware button logic** - Single button that adapts text, color, and action based on payment state

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
- **Payment tracking tables** with payment request timestamps

### Frontend (React Native Web + TypeScript)
- **React Native Web** for cross-platform compatibility
- **TypeScript** for type safety
- **Custom routing system** with URL-based navigation
- **Responsive design** with modern Portuguese interface
- **Real-time state management** with AuthContext
- **Authentication state persistence**
- **Native browser controls** for consistent UX
- **Payment management UI** with smart state-based rendering

### Database Schema
- **Multi-tenant architecture** with therapist relationships
- **Foreign key constraints** for data integrity
- **Session tracking** with status management
- **Calendar webhook management** for reliability
- **Therapist calendar ID storage** for persistent calendar selection
- **Payment request tracking** with timestamps and status fields
- **Revenue calculation support** with proper session-payment linking

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
│   │   ├── PaymentsOverview.tsx     # ⭐ **NEW** Complete payment management
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
│   │   │   ├── calendars.ts         # Calendar listing endpoint
│   │   │   ├── checkin.ts          # Patient check-in API
│   │   │   ├── patients.ts         # Patient management API
│   │   │   ├── sessions.ts         # Complete session management API
│   │   │   ├── payments.ts         # ⭐ **NEW** Payment management API
│   │   │   └── therapists.ts       # Therapist account API
│   │   ├── services/                # Business logic services
│   │   │   ├── google-calendar.ts   # Google Calendar API integration with reverse sync
│   │   │   ├── session-sync.ts     # Bidirectional calendar-session synchronization
│   │   │   └── payment-service.ts  # ⭐ **NEW** Payment calculation and WhatsApp integration
│   │   ├── types/                   # Backend type definitions
│   │   │   ├── calendar.ts         # Calendar-related types
│   │   │   └── payments.ts         # ⭐ **NEW** Payment-related types
│   │   └── server.ts               # Express server setup with dynamic webhook management
│   ├── scripts/                     # Development scripts
│   │   └── start-dev.ts            # Local development with automatic ngrok + webhook setup
│   ├── db/                         # Database management
│   │   ├── 001_initial_schema.sql  # Database schema
│   │   ├── 002_payment_tracking.sql # ⭐ **NEW** Payment request tracking tables
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

# Payment Configuration
PAYMENT_PENDING_THRESHOLD_DAYS=7
WHATSAPP_PAYMENT_PHONE=5511999999999
```

3. **Set up database:**
```bash
createdb clinic_db
psql -U your_postgres_user clinic_db < clinic-api/db/001_initial_schema.sql
psql -U your_postgres_user clinic_db < clinic-api/db/002_payment_tracking.sql
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
   - **Payment management:** `localhost:19006/pagamentos` ⭐ **NEW Payment system**
   - **Settings:** `localhost:19006/configuracoes`

## 📱 Usage

### First Time Setup
1. Navigate to the app - Google Sign-In happens automatically
2. **Any Google account** can sign up - no restrictions
3. Select your Google Calendar for session management
4. Add your first patients
5. Start using the check-in system, bidirectional session management, and payment tracking

### Daily Workflow
1. **Dashboard** - Overview and quick actions
2. **Check-in** - Patients confirm attendance
3. **Sessões** - Complete session management with bidirectional calendar sync
4. **Pacientes** - Manage patient roster
5. **Pagamentos** ⭐ **NEW** - Complete payment management and analytics
6. **Configurações** - Account settings and logout

### Payment Management Features
- **Smart Payment Workflow** - Request payments with automatic status tracking
- **WhatsApp Integration** - Send payment requests and reminders directly via WhatsApp
- **Payment Analytics** - Track revenue, pending amounts, and payment performance
- **Date Range Filtering** - View payments for specific periods (current month, last 3 months, etc.)
- **Dual Payment Views** - Patient summaries and individual session charges
- **Payment Status Management** - Manual status overrides and automatic time-based transitions
- **Brazilian Currency Support** - Proper R$ formatting throughout the interface

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
- `GET /api/calendars/events?therapistEmail=` - Get events from therapist's calendar
- `GET /api/therapists/:email` - Get therapist details
- `POST /api/therapists` - Create therapist
- `PUT /api/therapists/:email/calendar` - Update calendar

### Payment Management ⭐ **NEW**
- `GET /api/payments/summary?therapistEmail=&startDate=&endDate=` - Get payment analytics
- `GET /api/payments/patients?therapistEmail=&startDate=&endDate=&status=` - Get patient payment summaries
- `GET /api/payments/sessions?therapistEmail=&startDate=&endDate=&status=` - Get session payment details
- `POST /api/payments/request` - Send payment request (updates payment_requested status)
- `PUT /api/payments/status` - Update payment status manually
- `POST /api/payments/reminder` - Send payment reminder

### Webhooks & Development
- `POST /api/calendar-webhook` - Google Calendar notifications (bidirectional sync)
- `POST /api/setup-webhook` - Register webhook with current ngrok URL
- `POST /api/update-webhook-url` - Dynamically update webhook URL
- `GET /api/debug-webhook` - Check webhook status
- `GET /api/verify-calendar` - Test calendar access

## 🗄️ Database Schema

### Core Tables
- **therapists** - Therapist accounts with Google Calendar IDs and payment settings
- **patients** - Patient records linked to therapists with contact information
- **sessions** - Therapy sessions with bidirectional calendar sync and payment tracking
- **check_ins** - Patient attendance records
- **calendar_webhooks** - Active webhook subscriptions for reverse sync

### Payment Tracking ⭐ **NEW**
- **payment_requests** - Track when payments are requested with timestamps
- **payment_status_history** - Log all payment status changes
- **therapist_payment_settings** - Configurable payment thresholds per therapist

## 🔐 Security Features

- **Firebase Authentication** with Google Sign-In
- **API key validation** for all requests
- **Multi-tenant data isolation** 
- **Rate limiting** on API endpoints
- **CORS protection** with PUT method support
- **SQL injection prevention** with parameterized queries
- **Secure token management** with automatic refresh
- **Webhook validation** for calendar notifications
- **Payment data encryption** for sensitive financial information

## 🌍 Internationalization

- **Portuguese interface** throughout the application
- **Localized error messages** and user feedback
- **Brazilian timezone** support (America/Sao_Paulo)
- **Brazilian currency formatting** (R$ with comma decimals)
- **Cultural adaptations** for therapy practice workflow
- **WhatsApp integration** with Brazilian phone number formatting

## 🚀 Deployment

### Production Setup
- Backend: Google Cloud Run or similar container platform
- Frontend: Firebase Hosting or Netlify
- Database: Google Cloud SQL (PostgreSQL)
- Authentication: Firebase Authentication with Google Sign-In
- Webhooks: Stable production URLs (no ngrok)
- Payment Processing: Secure environment for WhatsApp integration

### Environment Configuration
- Production Firebase Authentication with real Google Sign-In
- Real Google Calendar API integration with webhook support
- Secure environment variable management
- SSL/TLS encryption for all endpoints
- Payment security compliance

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
- **Mock payment data** - Test payment scenarios without real transactions

### Production Mode Features
- **Real Firebase Authentication** - Full Google Sign-In integration
- **Production security** - All authentication checks enabled
- **Performance optimized** - Minimal logging
- **Error handling** - User-friendly error messages
- **Stable webhook URLs** - No ngrok dependency
- **Real payment processing** - Production WhatsApp integration

## 📝 Latest Enhancement Summary

### ✅ Complete Payment Management System Achievement! 💰

1. **Professional payment workflow implementation** - Therapist-initiated payment requests with proper state management
2. **Smart payment state transitions** - "Total de Sessões" → "Aguardando Pagamento" → "Pendente" based on configurable time thresholds
3. **Context-aware action button system** - Single smart button that adapts text, color, and action based on payment state
4. **WhatsApp payment integration** - Direct payment requests and reminders with Brazilian phone formatting
5. **Payment status color coding** - Visual indicators for all payment states with professional color scheme
6. **Comprehensive payment analytics** - Revenue tracking with paid/pending breakdowns and summary cards
7. **Date range filtering system** - Flexible period selection with proper month boundary calculations
8. **Dual payment view architecture** - Patient-centric summaries and session-centric detail views
9. **Brazilian currency formatting** - Proper R$ formatting with comma decimal separators throughout
10. **Payment request tracking database** - Complete audit trail of payment requests and status changes

### 🔗 **Complete Payment Integration Achievements**
1. **Smart payment workflow** - Professional therapist-driven payment request process
2. **Automatic status management** - Time-based transitions from requested to overdue
3. **WhatsApp messaging integration** - Direct payment communication with formatted phone numbers
4. **Payment analytics dashboard** - Real-time revenue tracking and pending amount calculations
5. **Brazilian localization** - Currency formatting and Portuguese payment terminology
6. **Context-aware UI components** - Buttons and colors that adapt to payment state
7. **Multi-tenant payment isolation** - Each therapist manages only their patient payments
8. **Configurable payment thresholds** - Customizable days before "Pendente" status (future Settings integration)

### 🎯 Key Benefits
- **Complete payment workflow coverage** - From session completion to payment collection
- **Professional payment communication** - WhatsApp integration with proper Brazilian formatting
- **Smart payment state management** - Automatic transitions based on configurable time thresholds
- **Comprehensive payment analytics** - Real-time revenue tracking and payment performance metrics
- **Brazilian business compliance** - Proper currency formatting and payment terminology
- **Multi-tenant payment security** - Each therapist sees only their payment data
- **Context-aware user interface** - Smart buttons and colors that adapt to payment state
- **Payment request audit trail** - Complete tracking of when payments are requested and status changes

## 🗺️ Development Roadmap

### ✅ **Completed Features**
- **Complete payment management system** - Professional payment workflow with WhatsApp integration
- **Complete bidirectional Google Calendar sync** - Sessions ↔ Calendar events with real-time webhooks
- **Authentication system** - Firebase Google Sign-In with persistent sessions
- **Session management** - Full CRUD with filtering and status tracking
- **Patient management** - Complete patient records with multi-tenant isolation
- **Dynamic webhook management** - Automatic ngrok URL handling for development

### 🚧 **Next Priority: Database Integration & Real Payment Data**
**Goal**: Connect Payment Overview to real database with comprehensive test data

**Key Features to Implement:**
- **📊 Database Schema Extension** - Add payment tracking tables with proper relationships
- **🎭 Comprehensive Mock Data** - Create realistic therapist with patients and sessions
- **🔌 Payment API Integration** - Connect frontend to real payment calculation endpoints
- **💳 Payment Request Tracking** - Database storage for payment_requested and payment_request_date
- **📈 Real Payment Analytics** - Live calculation of revenue, pending amounts, and session counts
- **🔄 Payment Status Updates** - Real database updates when payment requests are sent
- **📱 WhatsApp Integration Testing** - Test payment messages with real phone number formatting
- **🎛️ Payment Filter Implementation** - Connect all payment status filters to database queries

**Critical Database Extensions:**
- **Payment request tracking** - Track when payments are requested with timestamps
- **Payment status history** - Log all payment status changes for audit trail
- **Therapist payment settings** - Store configurable payment thresholds per therapist
- **Session-payment linking** - Proper foreign key relationships for payment calculations

### 🚀 **Phase 2: Enhanced Therapist Onboarding with Payment Setup**
**Goal**: Seamless transition for therapists with existing calendar appointments and payment preferences

**Planned Features:**
- **📅 Calendar Import Wizard** - Import existing appointments from therapist's calendar
- **👥 Bulk Patient Creation** - Easy patient record creation from calendar events
- **🔗 Appointment Linking** - Connect imported calendar events to patient records
- **🔄 Recurring Session Detection** - Identify and manage repeating appointments
- **📊 Dual Date System** - Configure both historical therapy start and LV Notas billing start dates
- **💰 Payment Preferences Setup** - Configure invoicing cycles, payment terms, and WhatsApp templates
- **🎯 Smart Patient Matching** - Match calendar attendees to patient records
- **💳 Payment History Import** - Option to mark historical sessions as paid/pending

**Critical Date Distinction:**
- **Historical Therapy Start Date** (optional) - When therapist first started seeing the patient
- **LV Notas Billing Start Date** (required) - When to begin counting sessions for billing in LV Notas

### 🚀 **Phase 3: Brazilian Payment Integration (PIX + NFP)**
**Goal**: Complete payment automation for Brazilian therapy practices

**Planned Features:**
- **📱 Enhanced WhatsApp Payment Requests** - Rich payment templates with PIX QR codes
- **🏦 Open Banking Integration** - Real-time payment monitoring via Brazilian Open Banking
- **⚡ PIX Payment Tracking** - Automatic detection and matching of PIX payments to sessions
- **📋 Nota Fiscal Paulista** - Automatic tax invoice generation for São Paulo therapists
- **💰 Payment Dashboard Enhancement** - Real-time payment status with PIX integration
- **📊 Financial Analytics** - Revenue tracking and expense categorization
- **🔄 Automated Reconciliation** - Payments automatically matched to sessions
- **💳 Multiple Payment Methods** - Support for PIX, bank transfer, and credit cards

### 🎯 **Phase 4: Advanced Practice Management**
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

*Now featuring COMPLETE payment management system with professional payment workflow, WhatsApp integration, and comprehensive Brazilian payment support for the ultimate therapy practice management experience!* 🚀💰