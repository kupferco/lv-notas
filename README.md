# LV Notas - Complete Therapy Practice Management System

A comprehensive Node.js/TypeScript system for managing therapy clinics with **real Google authentication**, **complete bidirectional Google Calendar integration**, **dual-mode payment system**, **multiple view types**, **automated WhatsApp payment communication**, and **revolutionary auto check-in functionality**.

## 🎉 Latest Achievement (July 2025) - COMPLETE Auto Check-in System! ⚡🚀

### 🎯 **Revolutionary Auto Check-in System (NEW!)**
- ✅ **Manual Mode** - Traditional workflow: manually mark each session as "compareceu" for billing
- ✅ **Auto Check-in Mode** - Revolutionary efficiency: past scheduled sessions automatically included in billing
- ✅ **Interactive Toggle** - Switch between modes instantly via settings with full UI adaptation
- ✅ **Smart Session Logic** - Past "agendada" sessions treated as attended; delete if patient didn't show
- ✅ **Complete Backend Integration** - Full auto check-in logic across all payment endpoints
- ✅ **Dynamic Data Updates** - Summary cards, patient lists, and session views all adapt to selected mode
- ✅ **Workflow Transformation** - Saves hours of manual check-in work for busy therapists

### 🎯 **Enhanced Dual-Mode Payment System**
- ✅ **Simple Mode** - Beginner-friendly with 2 statuses: "Pago" and "Pendente"
- ✅ **Advanced Mode** - Power users with 4 granular statuses: "Não Cobrado", "Aguardando", "Pendente", "Pago"
- ✅ **Mode-Aware Interface** - Entire UI adapts based on current mode including auto check-in
- ✅ **Smart Status Filtering** - Filter options change automatically per mode
- ✅ **Interactive Mode Switching** - Beautiful toggle buttons in header for instant mode changes
- ✅ **Granular Data Preservation** - Backend maintains full detail regardless of frontend mode

### 📋 **Advanced Dual View System**
- ✅ **Card View** - Rich, detailed cards with full information and action buttons
- ✅ **List View** - Compact table format for efficient data scanning
- ✅ **Mode Combinations** - 6 total combinations: Simple+Card+Manual, Simple+List+Auto, etc.
- ✅ **Interactive View Toggles** - Switch between views instantly via header toggles
- ✅ **Consistent Functionality** - Same features across all view combinations
- ✅ **Smart Navigation** - Easy switching between views with mode preservation

### 📱 **Enhanced WhatsApp Payment Automation**
- ✅ **Professional Payment Requests** - Auto-generated invoice messages with patient details
- ✅ **Friendly Payment Reminders** - Gentle follow-up messages for overdue payments
- ✅ **Smart Phone Handling** - Brazilian phone number formatting with country code
- ✅ **One-Click WhatsApp** - Opens WhatsApp with pre-written messages
- ✅ **Auto Check-in Integration** - Payment requests include automatically detected sessions
- ✅ **Confirmation Dialogs** - Prevents accidental sends with patient detail preview
- ✅ **Real Patient Data** - Uses actual patient names, amounts, and session counts

### 💰 **Complete Payment Management System**
- ✅ **Session-Level Payment Status Changes** - Direct status management on individual sessions
- ✅ **Interactive Status Dropdowns** - Click session status to change payment state instantly
- ✅ **Smart Patient Status Priority** - Patient status reflects highest priority session status
- ✅ **5-Card Revenue Breakdown** - Complete overview: Total, Pago, Não Cobrado, Aguardando, Pendente
- ✅ **Auto Check-in Revenue Calculation** - Revenue automatically includes past scheduled sessions
- ✅ **Patient Detail Navigation** - "Ver Detalhes" button switches to session view with patient filter
- ✅ **Real Database Integration** - Connected to PostgreSQL with payment tracking tables
- ✅ **Advanced Filtering System** - Filter by date range, payment status, and individual patients
- ✅ **Dynamic Summary Cards** - Revenue totals update based on selected filters in real-time
- ✅ **Brazilian Currency Formatting** - Proper R$ formatting with comma decimals throughout

### 🎨 **Professional UI/UX Enhancements**
- ✅ **Interactive Mode Toggles** - Beautiful toggle switches in header for all modes
- ✅ **Auto Check-in Indicators** - Visual indicators showing when auto check-in is active
- ✅ **Smart Back Navigation** - "← Pacientes" button to return from session to patient view
- ✅ **Export Button** - Demo-ready "📊 Exportar" button for future functionality
- ✅ **Responsive Summary Cards** - Cards distribute evenly across screen width
- ✅ **Clean Status Dropdowns** - Simplified session status pickers without visual clutter
- ✅ **Professional Settings Page** - Complete configuration center with all toggle options

### 🔄 **Complete Bidirectional Google Calendar Integration**
- ✅ **LV Notas → Google Calendar** - Sessions automatically create/update/delete calendar events
- ✅ **Google Calendar → LV Notas** - Manual calendar changes automatically update sessions
- ✅ **Real-time webhook sync** - Changes reflect instantly in both directions
- ✅ **Smart patient matching** - Finds patients by email OR name from calendar events
- ✅ **Dynamic webhook management** - Automatic ngrok URL updates for development

### 📅 **Advanced Session Management**
- ✅ **Complete Sessions CRUD** - Create, read, update, and cancel therapy sessions
- ✅ **Auto Check-in Logic** - Past scheduled sessions automatically considered for billing
- ✅ **Advanced filtering** - Filter by status, patient, and date
- ✅ **Session status tracking** - Agendada, Compareceu, Cancelada, Cobrança Automática
- ✅ **Real-time updates** - Changes reflect immediately across the system
- ✅ **Calendar integration** - Sessions sync with Google Calendar in both directions

### 🔐 **Production-Ready Authentication**
- ✅ **Real Google Sign-In** for both development and production
- ✅ **Firebase Authentication** with persistent sessions
- ✅ **Multi-tenant security** - Each therapist sees only their data
- ✅ **AuthContext integration** - Centralized authentication state management

## ✨ Key Features

### ⚡ **Revolutionary Auto Check-in System**
- **Manual Mode**: Traditional workflow where therapists manually mark each session as "compareceu" for billing
- **Auto Check-in Mode**: Revolutionary efficiency where past scheduled sessions are automatically included in billing calculations
- **Smart Session Detection**: Past "agendada" sessions (date < now) automatically treated as attended
- **Workflow Transformation**: Instead of marking attendance, simply delete sessions if patients didn't show up
- **Complete Integration**: Auto check-in logic works across all views (summary cards, patient lists, session details)
- **Interactive Switching**: Toggle between modes instantly via settings with full UI adaptation

### 🎯 **Enhanced Dual-Mode Payment System**
- **Simple Mode (Beginners)**: Only "Pago" and "Pendente" statuses for straightforward payment tracking
- **Advanced Mode (Power Users)**: Full 4-status system with "Não Cobrado", "Aguardando", "Pendente", "Pago"
- **Smart Interface Adaptation**: Summary cards, filters, and dropdowns automatically adjust to current mode
- **Auto Check-in Integration**: Both modes work seamlessly with auto check-in functionality
- **Mode Preservation**: Backend maintains granular data regardless of frontend display mode
- **Interactive Mode Switching**: Beautiful toggle buttons in header for instant mode changes

### 📱 **Enhanced WhatsApp Integration**
- **Professional Messages**: Auto-generated payment requests with patient details, amounts, and session counts
- **Auto Check-in Aware**: Payment calculations include automatically detected sessions
- **Brazilian Phone Support**: Proper formatting with country code (+55) and area code handling
- **Message Templates**: Separate templates for initial invoices vs. friendly reminders
- **One-Click Sending**: Opens WhatsApp with pre-written message ready to send
- **User Confirmation**: Preview dialogs prevent accidental sends and show message content

### 📋 **Advanced Dual View System**
- **Card View**: Rich, detailed cards with full patient information, payment history, and action buttons
- **List View**: Compact table format showing more data per screen for efficient scanning
- **Consistent Functionality**: Same features available in both views (filtering, status changes, navigation)
- **Smart Layout**: Cards distribute evenly across screen width, lists optimize for data density
- **Interactive Toggles**: Switch between views instantly via header controls

### 💰 **Complete Payment Management**
- **Session-Level Control** - Change payment status directly on individual sessions
- **Auto Check-in Revenue** - Revenue calculations automatically include past scheduled sessions
- **Smart Patient Status** - Patient status automatically reflects session priority hierarchy
- **5-Card Revenue Dashboard** - Complete breakdown of revenue by payment status
- **Advanced Filtering** - Filter by patient, status, date range with real-time updates
- **Smart Navigation** - Seamless flow from patient overview to session details
- **Brazilian Currency Support** - Proper R$ formatting throughout the interface

### 🔄 **Bidirectional Calendar Sync**
- **Real-time synchronization** between LV Notas and Google Calendar
- **Smart patient matching** by email and name
- **Automatic session creation** from calendar events
- **Dynamic webhook management** for development workflow

### 📅 **Advanced Session Management**
- ✅ **Complete Sessions CRUD** - Create, read, update, and cancel therapy sessions
- ✅ **Auto Check-in Logic** - Past scheduled sessions automatically included in billing
- ✅ **Advanced filtering** - Filter by status, patient, and date
- ✅ **Session status tracking** - Agendada, Compareceu, Cancelada, Cobrança Automática
- ✅ **Real-time updates** - Changes reflect immediately across the system
- ✅ **Calendar integration** - Sessions sync with Google Calendar in both directions

### 👥 **Enhanced Patient Management**
- ✅ **Complete Patient Intake Form** - Comprehensive patient data collection with 12+ fields
- ✅ **Brazilian Phone Number Formatting** - Automatic (11) 99999-9999 formatting and validation
- ✅ **Emergency Contact System** - Store emergency contact names and phone numbers
- ✅ **Session Pricing Management** - Individual patient pricing with R$ currency formatting
- ✅ **Therapy Timeline Tracking** - Track therapy start dates and LV Notas billing start dates
- ✅ **Address & Demographics** - Complete patient demographics with address storage
- ✅ **Notes & Observations** - Multi-line notes field for therapist observations
- ✅ **Type-Safe Form Handling** - Unified types with EventCardStack import wizard
- ✅ **Enhanced Validation** - Email validation, phone formatting, and required field checking
- ✅ **Consistent Data Model** - sessionPrice in cents, unified field naming across app

### 🚀 **Smart Patient-Grouped Calendar Import**
- ✅ **Intelligent Event Grouping** - Groups hundreds of recurring sessions by unique patient names
- ✅ **One Card Per Patient** - Shows ~20 patient cards instead of 300+ individual event cards  
- ✅ **Smart Patient Detection** - Extracts patient names from various event title formats
- ✅ **Session Frequency Analysis** - Automatically detects weekly/biweekly/monthly patterns
- ✅ **Non-Tech-Savvy Friendly** - Perfect for therapists who aren't computer experts
- ✅ **Email-Free Operation** - Works with title-only events (no attendees required)
- ✅ **Realistic Test Data Generator** - Script creates authentic therapy calendar scenarios
- ✅ **Progress Feedback** - Real-time progress indicators during import process

### 🚀 **Modern Navigation**
- **URL-based routing** with Portuguese endpoints:
  - `/` - Dashboard (home)
  - `/check-in` - Patient check-in
  - `/sessoes` - Session management
  - `/pacientes` - Patient management
  - `/pagamentos` - **Complete payment management and analytics with auto check-in**
  - `/configuracoes` - **Enhanced settings with auto check-in toggle and mode controls**
- **Browser navigation support** (back/forward buttons)
- **Bookmarkable URLs** for each section
- **Clean navigation bar** with active state indicators

## 🏗️ Technical Architecture

### Auto Check-in System Architecture
- **Settings-driven modes** - `src/contexts/SettingsContext.tsx` controls auto check-in behavior
- **Backend logic adaptation** - SQL queries automatically include past scheduled sessions when enabled
- **Type safety** - TypeScript ensures auto check-in consistency across all components
- **Real-time switching** - Mode changes immediately affect all payment calculations

### Enhanced Dual-Mode System Architecture
- **Config-driven modes** - Settings context controls entire system behavior including auto check-in
- **Frontend adaptation** - UI components automatically adjust based on current mode and auto check-in state
- **Backend consistency** - Database maintains full granular data regardless of frontend mode
- **Interactive controls** - Beautiful toggle switches for instant mode changes

### WhatsApp Integration Architecture
- **Professional messaging service** - `src/services/whatsapp.ts` handles message generation
- **Auto check-in aware** - Payment calculations include automatically detected sessions
- **Phone number formatting** - Brazilian phone number standards with country codes
- **Template system** - Separate templates for invoices vs. reminders
- **URL generation** - Creates proper wa.me links that open WhatsApp directly

### Payment System Architecture
- **PostgreSQL database** with comprehensive payment tracking tables
- **Auto check-in SQL logic** - Dynamic queries that include past scheduled sessions when enabled
- **Session-level payment status** stored and calculated in real-time
- **Multi-tenant isolation** with proper foreign key relationships
- **Payment state machine** with automatic status transitions
- **Brazilian payment method support** (PIX, bank transfer, cash, credit card)

### Frontend Architecture
- **React Native Web** with TypeScript for type safety
- **Settings Context** - Centralized state management for all modes (payment, view, auto check-in)
- **Interactive toggle components** - Beautiful, reusable toggle switches
- **Dual-mode component system** - Components adapt to Simple/Advanced modes
- **Dual-view rendering** - Card/List views for same data
- **Real-time state management** with React Context
- **Responsive design** optimized for Brazilian therapy practices

### Backend Architecture
- **Express.js REST API** with type-safe routes
- **Auto check-in endpoints** - All payment endpoints support auto check-in parameter
- **PostgreSQL** with proper foreign key relationships including phone numbers
- **Google Calendar API** integration with OAuth
- **Firebase Authentication** verification
- **Real-time webhooks** for bidirectional sync
- **WhatsApp-ready patient data** with phone number support

## 📁 Project Structure

```
lv-notas/
├── src/                              # Frontend source code
│   ├── components/                   # React components
│   │   ├── common/                   # Shared components
│   │   │   ├── ToggleSwitch.tsx      # ⚡ Reusable toggle switch component
│   │   │   └── ModeHeader.tsx        # ⚡ Interactive header with mode toggles
│   │   ├── payments/                 # 💰 Payment management components
│   │   │   ├── PaymentsOverview.tsx  # Main dashboard with auto check-in support
│   │   │   ├── PaymentFilters.tsx    # Mode-aware filter system
│   │   │   ├── PatientPaymentCard.tsx # Patient cards with WhatsApp buttons
│   │   │   ├── PatientPaymentList.tsx # Patient list view
│   │   │   ├── SessionPaymentCard.tsx # Session cards with status dropdowns
│   │   │   ├── SessionPaymentList.tsx # Session list view
│   │   │   ├── PaymentSummaryCards.tsx # 5-card revenue (mode-adaptive)
│   │   │   ├── PaymentStatusBadge.tsx # Status indicators
│   │   │   └── PaymentActionButton.tsx # WhatsApp action buttons
│   │   ├── Sessions.tsx              # Session management
│   │   ├── PatientManagement.tsx     # Patient management
│   │   └── Settings.tsx              # ⚡ Enhanced settings with auto check-in toggle
│   ├── contexts/                     # React Context providers
│   │   ├── AuthContext.tsx           # Authentication state
│   │   └── SettingsContext.tsx       # ⚡ Complete settings state (payment, view, auto check-in)
│   ├── services/                     # API service layer
│   │   ├── api.ts                    # ⚡ API client with auto check-in support
│   │   └── whatsapp.ts               # WhatsApp message service
│   ├── config/                       # Configuration
│   │   ├── config.ts                 # Main app configuration
│   │   └── paymentsMode.ts           # Payment mode configuration and templates
│   └── types/                        # TypeScript type definitions
│       └── payments.ts               # Payment-specific types and interfaces
├── clinic-api/                       # Backend API server
│   ├── src/                          # Backend source code
│   │   ├── routes/                   # API route handlers
│   │   │   ├── payments.ts           # ⚡ Payment API with auto check-in logic
│   │   │   ├── sessions.ts           # Session management API
│   │   │   ├── patients.ts           # Patient API with phone support
│   │   │   └── calendar-webhook.ts   # Bidirectional calendar sync
│   │   └── config/                   # Server configuration
│   │       └── database.ts           # PostgreSQL connection
│   └── db/                           # Database management
│       ├── complete_schema.sql       # Complete schema with phone numbers
│       ├── manage_db.sh             # Database management script
│       └── seed/                     # Comprehensive test data
└── README.md                         # This documentation
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

2. **Set up database with payment tracking:**
```bash
cd clinic-api/db
./manage_db.sh fresh-comprehensive
```

This creates:
- Complete database schema with payment tables and phone numbers
- 20 patients with diverse pricing (R$ 120-250) and phone numbers
- 200+ sessions spanning 6 months
- Realistic payment scenarios for testing all mode combinations including auto check-in

3. **Configure environment variables:**

**Backend (clinic-api/.env):**
```bash
POSTGRES_USER=dankupfer
POSTGRES_HOST=localhost
POSTGRES_DB=clinic_db
POSTGRES_PASSWORD=your_postgres_password
POSTGRES_PORT=5432
SAFE_PROXY_KEY=your_secure_api_key
GOOGLE_CALENDAR_ID=your_calendar_id
```

**Frontend (.env.local):**
```bash
SAFE_PROXY_API_KEY=your_secure_api_key
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
```

4. **Configure default modes (optional):**
```typescript
// src/contexts/SettingsContext.tsx - lines 10-12
const [paymentMode, setPaymentModeState] = useState<PaymentMode>('simple');
const [viewMode, setViewModeState] = useState<ViewMode>('list');
const [autoCheckInMode, setAutoCheckInModeState] = useState<boolean>(false);
```

5. **Start development:**
```bash
# Backend
cd clinic-api && npm run dev

# Frontend (new terminal)
npm start
# Press 'w' for web
```

6. **Access the application:**
   - Main app: `http://localhost:19006`
   - Payment management: `http://localhost:19006/pagamentos`
   - Settings: `http://localhost:19006/configuracoes`

## 📱 Usage

### Auto Check-in System Usage

#### **Manual Mode (Traditional)**
1. **Default behavior**: Only sessions marked as "compareceu" appear in payment calculations
2. **Workflow**: Therapist must manually mark attendance for each session
3. **Use case**: Traditional practices, careful session tracking, detailed attendance records

#### **Auto Check-in Mode (Revolutionary)**
1. **Enable**: Go to `/configuracoes` → Toggle "Check-in Automático" → "Automático"
2. **Behavior**: Past scheduled sessions ("agendada" + date < now) automatically included in billing
3. **Workflow**: Simply delete appointments if patients didn't attend (much more efficient!)
4. **Indicators**: Interface shows "⚡ Check-in Automático Ativo" when enabled
5. **Use case**: Busy practices, high session volume, efficiency-focused workflows

### Dual-Mode System Usage

#### **Simple Mode (Recommended for Beginners)**
1. **Set mode**: Toggle "Simples" in header or settings
2. **Interface**: Only "Pago" and "Pendente" statuses throughout
3. **Summary cards**: 3 cards (Total, Pago, Pendente)
4. **Perfect for**: Users who want straightforward payment tracking

#### **Advanced Mode (Power Users)**
1. **Set mode**: Toggle "Avançado" in header or settings
2. **Interface**: Full 4-status system (Não Cobrado, Aguardando, Pendente, Pago)
3. **Summary cards**: 5 cards with complete breakdown
4. **Perfect for**: Users who need granular payment workflow tracking

### View Type Usage

#### **Card View (Rich Detail)**
1. **Set view**: Toggle "Cartões" in header or settings
2. **Best for**: Detailed review, action buttons, full patient information
3. **Features**: WhatsApp buttons, payment history, status badges

#### **List View (Efficient Scanning)**
1. **Set view**: Toggle "Lista" in header or settings
2. **Best for**: Quick overview, bulk operations, data analysis
3. **Features**: Compact table format, more data per screen

### WhatsApp Integration Usage
1. **Payment Request**: Click "💰 Cobrar" button on patients with unpaid sessions
2. **Payment Reminder**: Click "📝 Lembrete" button on overdue patients
3. **Auto Check-in Aware**: Automatically includes past scheduled sessions in calculations
4. **Confirmation**: Review patient details in confirmation dialog
5. **Send**: Click OK to open WhatsApp with pre-written message
6. **Professional**: Messages include patient name, amount, session count, payment methods

### Daily Workflow
1. **Dashboard** - Overview and quick actions
2. **Check-in** - Patient attendance confirmation (or enable auto check-in!)
3. **Sessões** - Manage therapy sessions with calendar sync
4. **Pacientes** - Manage patient records
5. **Pagamentos** - Complete payment management with auto check-in and WhatsApp automation
6. **Configurações** - Account settings, mode toggles, and auto check-in configuration

## 🔧 API Endpoints

### Payment Management (Enhanced with Auto Check-in)
- `GET /api/payments/summary?therapistEmail=&startDate=&endDate=&autoCheckIn=` - 5-card revenue breakdown with auto check-in support
- `GET /api/payments/patients?therapistEmail=&startDate=&endDate=&status=&autoCheckIn=` - Patient payment summaries with auto check-in logic
- `GET /api/payments/sessions?therapistEmail=&startDate=&endDate=&status=&autoCheckIn=` - Session payment details with auto check-in support
- `PUT /api/payments/status` - **Update individual session payment status**
- `POST /api/payments/request` - Send payment requests with auto check-in integration

### Session & Patient Management
- `GET /api/sessions?therapistEmail=` - Session management with filtering
- `GET /api/patients?therapistEmail=` - Patient management with phone numbers
- `POST /api/checkin` - Patient check-in system
- `POST /api/calendar-webhook` - Bidirectional calendar sync

## 🗄️ Database Schema

### Core Tables (Enhanced)
- **therapists** - Therapist accounts with calendar integration
- **patients** - Patient records with contact information **including phone numbers**
- **sessions** - Therapy sessions with **payment_status**, **payment_requested** columns

### Payment Tracking Tables
- **payment_transactions** - Records of actual payments received
- **payment_requests** - Log of payment communications sent (including WhatsApp)
- **payment_status_history** - Complete audit trail of status changes
- **payment_overview** (view) - Simplified payment data access with phone numbers

## 🔐 Security Features

- **Firebase Authentication** with Google Sign-In
- **Multi-tenant data isolation** - Each therapist sees only their data
- **API key validation** for all requests
- **Payment data encryption** for sensitive financial information
- **Phone number security** - Patient phone numbers securely stored
- **WhatsApp privacy** - No message content stored, only delivery confirmation
- **Auto check-in security** - Mode changes logged and tracked
- **Rate limiting** on API endpoints
- **CORS protection** with proper method support

## 🌍 Brazilian Localization

- **Complete Portuguese interface** throughout the application
- **Brazilian currency formatting** (R$ with comma decimals)
- **Brazilian phone number formatting** (+55 country code support)
- **Brazilian timezone support** (America/Sao_Paulo)
- **Cultural adaptations** for therapy practice workflow
- **Payment terminology** adapted for Brazilian business practices
- **WhatsApp integration** optimized for Brazilian business communication

## 🧪 Testing & Development

### Comprehensive Test Data
- **20 diverse patients** with varying pricing (R$ 120-250) and phone numbers
- **200+ sessions** spanning 6 months with realistic payment patterns
- **Auto check-in scenarios** - Mix of past scheduled and manually checked-in sessions
- **Multiple payment scenarios** - paid, pending, overdue, partial payments
- **WhatsApp-ready data** - All patients have Brazilian phone numbers for testing
- **Complete mode testing** - Data works perfectly in all mode combinations

### Development Features
- **Auto check-in testing** - Toggle between manual and auto modes to see immediate differences
- **Dual-mode testing** - Easy switching between Simple/Advanced modes
- **View type testing** - Switch between Card/List views instantly
- **Interactive toggles** - Test all settings combinations via beautiful UI controls
- **WhatsApp testing** - Test phone number integration
- **Hot reload** - Changes reflect immediately
- **Real authentication** - No mock data or bypasses
- **Comprehensive logging** - Detailed console output for debugging including auto check-in states

## 🗺️ Development Roadmap

### ✅ **Completed Features (July 2025)**
- **Revolutionary auto check-in system** with manual/automatic modes
- **Interactive settings page** with beautiful toggle controls
- **Complete dual-mode payment system** (Simple/Advanced)
- **Dual view system** (Card/List views)
- **Enhanced WhatsApp payment automation** with auto check-in integration
- **5-card revenue dashboard** with mode adaptation
- **Smart patient status priority system** 
- **Advanced filtering system** with mode awareness
- **Complete bidirectional Google Calendar sync**
- **Session-level payment management** with interactive status changes
- **Brazilian localization** including phone number support

### Currency Handling
- **Database storage**: Values stored in cents (30000 = R$ 300,00) for precision
- **API responses**: Automatically converted to currency format (300.00) 
- **Frontend display**: Direct formatting from API responses with Brazilian standards (R$ 300,00)

### 🔥 **Immediate Priorities (Next Sprint)**
**Goal**: Production deployment and advanced automation features

**Critical Tasks:**
1. **Production Deployment** - Deploy complete auto check-in system to production
   - Backend API deployment with auto check-in endpoints
   - Frontend deployment with interactive toggle controls
   - End-to-end testing of all auto check-in functionality
   - Performance optimization for auto check-in queries

2. **Advanced Auto Check-in Features** - Enhanced automation capabilities
   - Configurable time thresholds for auto check-in (e.g., 15 minutes after session end)
   - Patient-specific auto check-in preferences
   - Automatic status progression (pending → aguardando → pendente)
   - Smart notifications for auto-included sessions

3. **Enhanced Reporting** - Auto check-in aware analytics
   - Auto check-in vs manual attendance reports
   - Efficiency metrics showing time saved with auto check-in
   - Patient attendance pattern analysis
   - Revenue impact analysis of auto check-in adoption

4. **Email Verification System** - Prevent duplicate patient registration by email during import
   - Add email uniqueness validation in import wizard
   - Show clear error messages for duplicate emails
   - Option to merge or skip duplicate patients during import

5. **Therapist Data Cleanup Command** - Development and testing utility
   - `DELETE /api/therapist/wipe` endpoint with confirmation
   - Complete data removal for therapist offboarding
   - Cascade delete for all related records (patients, sessions, payments)
   - Safety measures and audit logging for data deletion

### 🚀 **Phase 2: Advanced Automation**
**Goal**: AI-powered therapy practice management

**Planned Features:**
- **Smart Auto Check-in Rules** - AI-powered session attendance prediction
- **Advanced WhatsApp Business API** - Automated payment reminders and confirmations
- **PIX Payment Integration** - Real-time PIX payment monitoring and QR codes
- **Nota Fiscal Integration** - Automatic tax invoice generation for Brazilian compliance
- **Payment Performance Analytics** - Advanced metrics (days to payment, success rates)
- **Smart Payment Prediction** - AI-powered payment likelihood analysis
- **Bulk WhatsApp Operations** - Send payment requests to multiple patients

### 🎯 **Phase 3: Complete Practice Automation**
**Goal**: Fully automated therapy practice management

**Future Features:**
- **AI Session Scheduling** - Intelligent appointment optimization based on auto check-in patterns
- **Advanced Analytics Dashboard** - Session attendance, patient progress, revenue insights
- **Automated Appointment Reminders** - WhatsApp/SMS appointment confirmations
- **Session Notes System** - Secure note-taking with LGPD compliance
- **Patient Progress Tracking** - Outcome measurements and therapy goals
- **Multi-therapist Clinics** - Clinic-wide management for group practices
- **Patient Mobile App** - Self-service booking and payment for patients

### 🔧 **Technical Improvements**
- **Performance Optimization** - Database indexing and query optimization for auto check-in
- **Enhanced Mobile Experience** - Native iOS/Android applications
- **Testing Coverage** - Comprehensive unit and integration testing
- **Advanced Security** - Additional authentication layers and data encryption
- **Real-time Notifications** - Instant updates when auto check-in processes sessions

## 📄 License

This project is proprietary software for LV Notas therapy practice management.

---

**Built with ❤️ for modern Brazilian therapy practice management**

*Now featuring REVOLUTIONARY auto check-in system that transforms therapy practice efficiency! Switch from manual attendance tracking to automated session detection with beautiful interactive controls and complete payment integration!* ⚡🚀💰📱