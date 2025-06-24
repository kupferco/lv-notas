# LV Notas - Therapist Management System

A complete Node.js/TypeScript system for managing therapy clinics with Google Calendar integration, patient management, and real-time session tracking.

## ✨ Features

### 🔐 Authentication & Onboarding
- **Universal therapist onboarding** with Portuguese interface
- **Google Calendar integration** with calendar selection during setup
- **Multi-tenant support** - each therapist sees only their data
- **Persistent sessions** with localStorage
- **Development mode** with mock authentication

### 📅 Google Calendar Integration
- **Real-time webhook integration** for automatic session creation
- **Calendar selection** during onboarding - therapists choose which calendar to use
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
  - `/configuracoes` - Settings
- **Browser navigation support** (back/forward buttons work)
- **Bookmarkable URLs** for each section
- **Clean navigation bar** with active state indicators

### ⚙️ Settings & Administration
- **Account management** with therapist details
- **Google Calendar status** and reconnection
- **Data export** capabilities (coming soon)
- **Secure logout** functionality

## 🏗️ Technical Architecture

### Backend (Node.js + TypeScript)
- **Express.js** REST API with type-safe routes
- **PostgreSQL** database with proper foreign key relationships
- **Google Calendar API** integration with service account
- **Firebase Authentication** for secure access
- **Real-time webhooks** for calendar synchronization
- **Rate limiting** and CORS protection

### Frontend (React Native Web + TypeScript)
- **React Native Web** for cross-platform compatibility
- **TypeScript** for type safety
- **Custom routing system** with URL-based navigation
- **Responsive design** with modern Portuguese interface
- **Real-time state management**

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
│   │   ├── AppNavigation.tsx         # Main app navigation (deprecated)
│   │   ├── CalendarSelection.tsx     # Google Calendar selection UI
│   │   ├── CheckInForm.tsx           # Patient check-in interface
│   │   ├── NavigationBar.tsx         # URL-based navigation bar
│   │   ├── PatientManagement.tsx     # Patient management interface
│   │   ├── Router.tsx               # URL routing component
│   │   ├── Settings.tsx             # Settings and account management
│   │   └── TherapistOnboarding.tsx  # Complete onboarding flow
│   ├── config/                      # Configuration files
│   │   └── firebase.ts              # Firebase authentication setup
│   ├── services/                    # API service layer
│   │   └── api.ts                   # API client with all endpoints
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

### Key Components

#### Frontend Components
- **`Router.tsx`** - URL-based routing with Portuguese endpoints
- **`NavigationBar.tsx`** - Navigation with active state management
- **`TherapistOnboarding.tsx`** - Complete onboarding with calendar selection
- **`CalendarSelection.tsx`** - Google Calendar picker interface
- **`PatientManagement.tsx`** - Multi-tenant patient management
- **`CheckInForm.tsx`** - Real-time patient check-in system
- **`Settings.tsx`** - Account management and logout

#### Backend Routes
- **`therapists.ts`** - Account creation and management
- **`patients.ts`** - Multi-tenant patient operations
- **`calendars.ts`** - Google Calendar integration
- **`sessions.ts`** - Session management from calendar events
- **`checkin.ts`** - Patient attendance tracking
- **`calendar-webhook.ts`** - Real-time calendar synchronization

#### Services
- **`google-calendar.ts`** - Google Calendar API wrapper
- **`session-sync.ts`** - Calendar event to session conversion
- **`api.ts`** - Frontend API client with authentication

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

# Frontend
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
   - **New therapist onboarding:** `localhost:19006/?setup=true`
   - **Main application:** `localhost:19006/`
   - **Patient management:** `localhost:19006/pacientes`
   - **Settings:** `localhost:19006/configuracoes`

## 📱 Usage

### First Time Setup
1. Go to `/?setup=true` for therapist onboarding
2. Authenticate with Google (mock auth in development)
3. Select your Google Calendar for session management
4. Add your first patients
5. Start using the check-in system

### Daily Workflow
1. **Dashboard** - Overview of sessions and statistics
2. **Check-in** - Patients confirm attendance
3. **Pacientes** - Manage patient roster
4. **Configurações** - Account and calendar settings

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

- **Firebase Authentication** with Google sign-in
- **API key validation** for all requests
- **Multi-tenant data isolation** 
- **Rate limiting** on API endpoints
- **CORS protection** with allowlist
- **SQL injection prevention** with parameterized queries

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
- File Storage: Google Cloud Storage for credentials

### Environment Configuration
- Production Firebase Authentication
- Real Google Calendar API integration
- Secure environment variable management
- SSL/TLS encryption for all endpoints

## 🔄 Development Features

- **Hot reload** for both frontend and backend
- **Mock authentication** for local development
- **Automatic ngrok tunnels** for webhook testing
- **Database management scripts** for easy setup
- **TypeScript** for compile-time error catching
- **Comprehensive logging** for debugging

## 📝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is proprietary software for LV Notas therapy practice management.

---

**Built with ❤️ for modern therapy practice management**