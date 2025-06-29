# LV Notas - Complete Therapy Practice Management System

A comprehensive Node.js/TypeScript system for managing therapy clinics with **real Google authentication**, **complete bidirectional Google Calendar integration**, **dual-mode payment system**, **multiple view types**, and **automated WhatsApp payment communication**.

## 🎉 Latest Achievement (June 2025) - COMPLETE Dual-Mode System with WhatsApp! 💰📱

### 🎯 **Revolutionary Dual-Mode Payment System (NEW!)**
- ✅ **Simple Mode** - Beginner-friendly with 2 statuses: "Pago" and "Pendente"
- ✅ **Advanced Mode** - Power users with 4 granular statuses: "Não Cobrado", "Aguardando", "Pendente", "Pago"
- ✅ **Mode-Aware Interface** - Entire UI adapts based on current mode
- ✅ **Smart Status Filtering** - Filter options change automatically per mode
- ✅ **Seamless Switching** - Change modes via single config variable
- ✅ **Granular Data Preservation** - Backend maintains full detail regardless of frontend mode

### 📋 **Dual View System (NEW!)**
- ✅ **Card View** - Rich, detailed cards with full information and action buttons
- ✅ **List View** - Compact table format for efficient data scanning
- ✅ **Mode Combinations** - 4 total combinations: Simple+Card, Simple+List, Advanced+Card, Advanced+List
- ✅ **Consistent Functionality** - Same features across all view combinations
- ✅ **Smart Navigation** - Easy switching between views

### 📱 **WhatsApp Payment Automation (NEW!)**
- ✅ **Professional Payment Requests** - Auto-generated invoice messages with patient details
- ✅ **Friendly Payment Reminders** - Gentle follow-up messages for overdue payments
- ✅ **Smart Phone Handling** - Brazilian phone number formatting with country code
- ✅ **One-Click WhatsApp** - Opens WhatsApp with pre-written messages
- ✅ **Confirmation Dialogs** - Prevents accidental sends with patient detail preview
- ✅ **Real Patient Data** - Uses actual patient names, amounts, and session counts

### 💰 **Enhanced Payment Management System**
- ✅ **Session-Level Payment Status Changes** - Direct status management on individual sessions
- ✅ **Interactive Status Dropdowns** - Click session status to change payment state instantly
- ✅ **Smart Patient Status Priority** - Patient status reflects highest priority session status
- ✅ **5-Card Revenue Breakdown** - Complete overview: Total, Pago, Não Cobrado, Aguardando, Pendente
- ✅ **Patient Detail Navigation** - "Ver Detalhes" button switches to session view with patient filter
- ✅ **Real Database Integration** - Connected to PostgreSQL with payment tracking tables
- ✅ **Advanced Filtering System** - Filter by date range, payment status, and individual patients
- ✅ **Dynamic Summary Cards** - Revenue totals update based on selected filters in real-time
- ✅ **Brazilian Currency Formatting** - Proper R$ formatting with comma decimals throughout

### 🎨 **Professional UI/UX Enhancements**
- ✅ **Mode Toggles in Header** - Visual indicators showing current payment mode and view type
- ✅ **Smart Back Navigation** - "← Pacientes" button to return from session to patient view
- ✅ **Export Button** - Demo-ready "📊 Exportar" button for future functionality
- ✅ **Responsive Summary Cards** - Cards distribute evenly across screen width
- ✅ **Clean Status Dropdowns** - Simplified session status pickers without visual clutter
- ✅ **Discrete Action Buttons** - Professional, compact WhatsApp action buttons

### 🔄 **Complete Bidirectional Google Calendar Integration**
- ✅ **LV Notas → Google Calendar** - Sessions automatically create/update/delete calendar events
- ✅ **Google Calendar → LV Notas** - Manual calendar changes automatically update sessions
- ✅ **Real-time webhook sync** - Changes reflect instantly in both directions
- ✅ **Smart patient matching** - Finds patients by email OR name from calendar events
- ✅ **Dynamic webhook management** - Automatic ngrok URL updates for development

### 📅 **Advanced Session Management**
- ✅ **Complete Sessions CRUD** - Create, read, update, and cancel therapy sessions
- ✅ **Advanced filtering** - Filter by status, patient, and date
- ✅ **Session status tracking** - Agendada, Compareceu, Cancelada
- ✅ **Real-time updates** - Changes reflect immediately across the system
- ✅ **Calendar integration** - Sessions sync with Google Calendar in both directions

### 🔐 **Production-Ready Authentication**
- ✅ **Real Google Sign-In** for both development and production
- ✅ **Firebase Authentication** with persistent sessions
- ✅ **Multi-tenant security** - Each therapist sees only their data
- ✅ **AuthContext integration** - Centralized authentication state management

## ✨ Key Features

### 🎯 **Dual-Mode Payment System**
- **Simple Mode (Beginners)**: Only "Pago" and "Pendente" statuses for straightforward payment tracking
- **Advanced Mode (Power Users)**: Full 4-status system with "Não Cobrado", "Aguardando", "Pendente", "Pago"
- **Smart Interface Adaptation**: Summary cards, filters, and dropdowns automatically adjust to current mode
- **Mode Preservation**: Backend maintains granular data regardless of frontend display mode
- **Easy Mode Switching**: Change via single config variable in `src/config/paymentsMode.ts`

### 📱 **WhatsApp Integration**
- **Professional Messages**: Auto-generated payment requests with patient details, amounts, and session counts
- **Brazilian Phone Support**: Proper formatting with country code (+55) and area code handling
- **Message Templates**: Separate templates for initial invoices vs. friendly reminders
- **One-Click Sending**: Opens WhatsApp with pre-written message ready to send
- **User Confirmation**: Preview dialogs prevent accidental sends and show message content

### 📋 **Dual View System**
- **Card View**: Rich, detailed cards with full patient information, payment history, and action buttons
- **List View**: Compact table format showing more data per screen for efficient scanning
- **Consistent Functionality**: Same features available in both views (filtering, status changes, navigation)
- **Smart Layout**: Cards distribute evenly across screen width, lists optimize for data density

### 💰 **Payment Management**
- **Session-Level Control** - Change payment status directly on individual sessions
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
- ✅ **Advanced filtering** - Filter by status, patient, and date
- ✅ **Session status tracking** - Agendada, Compareceu, Cancelada
- ✅ **Real-time updates** - Changes reflect immediately across the system
- ✅ **Calendar integration** - Sessions sync with Google Calendar in both directions

### 👥 **Enhanced Patient Management (NEW!)**
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

### 👥 **Patient Management**
- **Multi-tenant system** - therapists manage only their patients
- **Complete patient records** with contact information and phone numbers
- **Calendar import functionality** for reverse sync
- **Professional patient cards** with consistent UI

### 🚀 **Modern Navigation**
- **URL-based routing** with Portuguese endpoints:
  - `/` - Dashboard (home)
  - `/check-in` - Patient check-in
  - `/sessoes` - Session management
  - `/pacientes` - Patient management
  - `/pagamentos` - **Complete payment management and analytics**
  - `/configuracoes` - Settings with logout functionality
- **Browser navigation support** (back/forward buttons)
- **Bookmarkable URLs** for each section
- **Clean navigation bar** with active state indicators

## 🏗️ Technical Architecture

### Dual-Mode System Architecture
- **Config-driven modes** - `src/config/paymentsMode.ts` controls entire system behavior
- **Frontend adaptation** - UI components automatically adjust based on current mode
- **Backend consistency** - Database maintains full granular data regardless of frontend mode
- **Type safety** - TypeScript ensures mode consistency across all components

### WhatsApp Integration Architecture
- **Professional messaging service** - `src/services/whatsapp.ts` handles message generation
- **Phone number formatting** - Brazilian phone number standards with country codes
- **Template system** - Separate templates for invoices vs. reminders
- **URL generation** - Creates proper wa.me links that open WhatsApp directly

### Payment System Architecture
- **PostgreSQL database** with comprehensive payment tracking tables
- **Session-level payment status** stored and calculated in real-time
- **Multi-tenant isolation** with proper foreign key relationships
- **Payment state machine** with automatic status transitions
- **Brazilian payment method support** (PIX, bank transfer, cash, credit card)

### Frontend Architecture
- **React Native Web** with TypeScript for type safety
- **Dual-mode component system** - Components adapt to Simple/Advanced modes
- **Dual-view rendering** - Card/List views for same data
- **Real-time state management** with React Context
- **Responsive design** optimized for Brazilian therapy practices

### Backend Architecture
- **Express.js REST API** with type-safe routes
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
│   │   ├── payments/                # 💰 Payment management components
│   │   │   ├── PaymentsOverview.tsx # Main dashboard with dual-mode support
│   │   │   ├── PaymentFilters.tsx   # Mode-aware filter system
│   │   │   ├── PatientPaymentCard.tsx # Patient cards with WhatsApp buttons
│   │   │   ├── PatientPaymentList.tsx # Patient list view (NEW!)
│   │   │   ├── SessionPaymentCard.tsx # Session cards with status dropdowns
│   │   │   ├── SessionPaymentList.tsx # Session list view (NEW!)
│   │   │   ├── PaymentSummaryCards.tsx # 5-card revenue (mode-adaptive)
│   │   │   ├── PaymentStatusBadge.tsx # Status indicators
│   │   │   └── PaymentActionButton.tsx # WhatsApp action buttons
│   │   ├── Sessions.tsx             # Session management
│   │   ├── PatientManagement.tsx    # Patient management
│   │   └── Settings.tsx             # Settings and logout
│   ├── services/                    # API service layer
│   │   ├── api.ts                   # API client with payment endpoints
│   │   └── whatsapp.ts              # WhatsApp message service (NEW!)
│   ├── config/                      # Configuration
│   │   ├── config.ts                # Main app configuration
│   │   └── paymentsMode.ts          # Payment mode configuration (NEW!)
│   └── types/                       # TypeScript type definitions
│       └── payments.ts              # Payment-specific types and interfaces
├── clinic-api/                      # Backend API server
│   ├── src/                         # Backend source code
│   │   ├── routes/                  # API route handlers
│   │   │   ├── payments.ts          # 💰 Payment API with phone numbers
│   │   │   ├── sessions.ts          # Session management API
│   │   │   ├── patients.ts          # Patient API with phone support
│   │   │   └── calendar-webhook.ts  # Bidirectional calendar sync
│   │   └── config/                  # Server configuration
│   │       └── database.ts          # PostgreSQL connection
│   └── db/                          # Database management
│       ├── complete_schema.sql      # Complete schema with phone numbers
│       ├── manage_db.sh            # Database management script
│       └── seed/                    # Comprehensive test data
└── README.md                        # This documentation
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
- Realistic payment scenarios for testing all mode combinations

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

4. **Configure payment mode (optional):**
```typescript
// src/config/paymentsMode.ts
export const config = {
  paymentMode: 'simple' as PaymentMode,    // 'simple' or 'advanced'
  viewMode: 'card' as ViewMode,            // 'card' or 'list'
};
```

5. **Configure WhatsApp (for testing):**
```typescript
// src/services/whatsapp.ts - line 108
const testPhone = '5511999999999'; // Replace with your phone for testing
```

6. **Start development:**
```bash
# Backend
cd clinic-api && npm run dev

# Frontend (new terminal)
npm start
# Press 'w' for web
```

7. **Access the application:**
   - Main app: `http://localhost:19006`
   - Payment management: `http://localhost:19006/pagamentos`

## 📱 Usage

### Dual-Mode System Usage

#### **Simple Mode (Recommended for Beginners)**
1. **Set mode**: `paymentMode: 'simple'` in `src/config/paymentsMode.ts`
2. **Interface**: Only "Pago" and "Pendente" statuses throughout
3. **Summary cards**: 3 cards (Total, Pago, Pendente)
4. **Perfect for**: Users who want straightforward payment tracking

#### **Advanced Mode (Power Users)**
1. **Set mode**: `paymentMode: 'advanced'` in `src/config/paymentsMode.ts`
2. **Interface**: Full 4-status system (Não Cobrado, Aguardando, Pendente, Pago)
3. **Summary cards**: 5 cards with complete breakdown
4. **Perfect for**: Users who need granular payment workflow tracking

### View Type Usage

#### **Card View (Rich Detail)**
1. **Set view**: `viewMode: 'card'` in `src/config/paymentsMode.ts`
2. **Best for**: Detailed review, action buttons, full patient information
3. **Features**: WhatsApp buttons, payment history, status badges

#### **List View (Efficient Scanning)**
1. **Set view**: `viewMode: 'list'` in `src/config/paymentsMode.ts`
2. **Best for**: Quick overview, bulk operations, data analysis
3. **Features**: Compact table format, more data per screen

### WhatsApp Integration Usage
1. **Payment Request**: Click "💰 Cobrar" button on patients with unpaid sessions
2. **Payment Reminder**: Click "📝 Lembrete" button on overdue patients
3. **Confirmation**: Review patient details in confirmation dialog
4. **Send**: Click OK to open WhatsApp with pre-written message
5. **Professional**: Messages include patient name, amount, session count, payment methods

### Daily Workflow
1. **Dashboard** - Overview and quick actions
2. **Check-in** - Patient attendance confirmation
3. **Sessões** - Manage therapy sessions with calendar sync
4. **Pacientes** - Manage patient records
5. **Pagamentos** - Complete payment management with WhatsApp automation
6. **Configurações** - Account settings and logout

## 🔧 API Endpoints

### Payment Management (Enhanced)
- `GET /api/payments/summary?therapistEmail=&startDate=&endDate=` - 5-card revenue breakdown
- `GET /api/payments/patients?therapistEmail=&startDate=&endDate=&status=` - Patient payment summaries with phone numbers
- `GET /api/payments/sessions?therapistEmail=&startDate=&endDate=&status=` - Session payment details
- `PUT /api/payments/status` - **Update individual session payment status**
- `POST /api/payments/request` - Send payment requests with WhatsApp integration

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
- **Multiple payment scenarios** - paid, pending, overdue, partial payments
- **WhatsApp-ready data** - All patients have Brazilian phone numbers for testing
- **Complete mode testing** - Data works perfectly in both Simple and Advanced modes

### Development Features
- **Dual-mode testing** - Easy switching between Simple/Advanced modes
- **View type testing** - Switch between Card/List views instantly
- **WhatsApp testing** - Test phone number integration
- **Hot reload** - Changes reflect immediately
- **Real authentication** - No mock data or bypasses
- **Comprehensive logging** - Detailed console output for debugging

## 🗺️ Development Roadmap

### ✅ **Completed Features (June 2025)**
- **Complete dual-mode payment system** (Simple/Advanced)
- **Dual view system** (Card/List views)
- **WhatsApp payment automation** with professional messaging
- **5-card revenue dashboard** with mode adaptation
- **Smart patient status priority system** 
- **Advanced filtering system** with mode awareness
- **Complete bidirectional Google Calendar sync**
- **Session-level payment management** with interactive status changes
- **Brazilian localization** including phone number support

# README Roadmap Update

```markdown
### 🔥 **Immediate Priorities (Next Sprint)**
**Goal**: Polish patient management and prepare for production deployment

**Critical Tasks:**
1. **Email Verification System** - Prevent duplicate patient registration by email during import
   - Add email uniqueness validation in import wizard
   - Show clear error messages for duplicate emails
   - Option to merge or skip duplicate patients during import

2. **Centralized Patient Form Architecture** - Unified patient form with type safety
   - Single `PatientForm.tsx` component with conditional rendering
   - Unified types in `src/types/patient.ts` 
   - Short form flag for import wizard vs. complete form for patient management
   - Consistent validation and field handling across both use cases

3. **Condensed Import Wizard Styling** - Improved UX for bulk operations
   - Compact form layout to keep progress counter visible
   - Reduce vertical spacing and optimize form field arrangement
   - Better visual hierarchy for bulk import workflow
   - Progress indicator always visible without scrolling

4. **Production Deployment & Testing** - Full system deployment
   - Deploy backend API to production environment
   - Deploy frontend to Firebase Hosting
   - End-to-end testing of all features in production
   - Performance optimization and monitoring setup

5. **Therapist Data Cleanup Command** - Development and testing utility
   - `DELETE /api/therapist/wipe` endpoint with confirmation
   - Complete data removal for therapist offboarding
   - Cascade delete for all related records (patients, sessions, payments)
   - Safety measures and audit logging for data deletion
```

### 🚀 **Phase 2: Enhanced Automation**
**Goal**: Advanced payment automation and Brazilian business integration

**Planned Features:**
- **PIX Payment Integration** - Real-time PIX payment monitoring and QR codes
- **WhatsApp Business API** - Automated payment reminders and confirmations
- **Nota Fiscal Integration** - Automatic tax invoice generation for Brazilian compliance
- **Payment Performance Analytics** - Advanced metrics (days to payment, success rates)
- **Smart Payment Prediction** - AI-powered payment likelihood analysis
- **Bulk WhatsApp Operations** - Send payment requests to multiple patients

### 🎯 **Phase 3: Advanced Practice Management**
**Goal**: Complete therapy practice automation

**Future Features:**
- **Advanced Analytics Dashboard** - Session attendance, patient progress, revenue insights
- **Automated Appointment Reminders** - WhatsApp/SMS appointment confirmations
- **Session Notes System** - Secure note-taking with LGPD compliance
- **Patient Progress Tracking** - Outcome measurements and therapy goals
- **Multi-therapist Clinics** - Clinic-wide management for group practices
- **Patient Mobile App** - Self-service booking and payment for patients

### 🔧 **Technical Improvements**
- **Interactive Mode Switching** - UI toggles instead of config file changes
- **Enhanced Mobile Experience** - Native iOS/Android applications
- **Performance Optimization** - Database indexing and query optimization
- **Testing Coverage** - Comprehensive unit and integration testing
- **Advanced Security** - Additional authentication layers and data encryption

## 📄 License

This project is proprietary software for LV Notas therapy practice management.

---

**Built with ❤️ for modern Brazilian therapy practice management**

*Now featuring COMPLETE dual-mode system with Simple/Advanced payment modes, Card/List view types, and automated WhatsApp integration for the ultimate therapy practice management experience!* 🚀💰📱

## 🎯 Commit Summary

### Major Features Added:
- ✅ **Dual-Mode Payment System** - Simple (2 statuses) vs Advanced (4 statuses)
- ✅ **Dual View System** - Card view vs List view for all data
- ✅ **WhatsApp Integration** - Automated payment requests and reminders
- ✅ **Mode-Aware Interface** - Entire UI adapts to current mode configuration
- ✅ **Enhanced Navigation** - Back buttons, mode indicators, smart filtering
- ✅ **Professional Messaging** - Brazilian phone support with formatted messages