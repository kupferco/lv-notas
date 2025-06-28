# LV Notas - Complete Therapy Practice Management System

A comprehensive Node.js/TypeScript system for managing therapy clinics with **real Google authentication**, **complete bidirectional Google Calendar integration**, patient management, session management, and **complete payment management with advanced filtering**.

## 🎉 Latest Achievement (June 2025) - Complete Payment Management with Advanced Filtering! 💰

### 💰 **COMPLETE Payment Management System**
- ✅ **Smart Payment Workflow** - Professional therapist-driven payment request flow
- ✅ **Real Database Integration** - Connected to PostgreSQL with payment tracking tables
- ✅ **Multi-stage Payment Tracking** - "Não Cobrado" → "Aguardando Pagamento" → "Pendente" → "Pago"
- ✅ **Partial Payment Support** - Handle patients who pay some but not all sessions
- ✅ **Payment Transaction History** - Complete audit trail with payment dates and methods
- ✅ **Advanced Filtering System** - Filter by date range, payment status, and individual patients
- ✅ **Horizontal Filter Layout** - Compact, professional filter interface with native styling
- ✅ **Dynamic Summary Cards** - Revenue totals update based on selected filters
- ✅ **Context-Aware Action Buttons** - Smart buttons that change based on payment state
- ✅ **Dual Payment Views** - Patient-centric summaries and session-centric details
- ✅ **Brazilian Currency Formatting** - Proper R$ formatting with comma decimals
- ✅ **Payment Date Tracking** - Shows when payments were made and via which method
- ✅ **Multi-tenant Payment Isolation** - Each therapist manages only their patient payments

### 🔍 **Advanced Payment Filtering**
- ✅ **Patient Filter** - View payments for specific patients or all patients
- ✅ **Status Filter** - Filter by "Não Cobrado", "Aguardando Pagamento", "Pago", "Pendente"
- ✅ **Date Range Filter** - Current month, last month, last 3/6 months with quick buttons
- ✅ **View Type Toggle** - Switch between patient summaries and session details
- ✅ **Real-time Filter Updates** - Summary cards reflect filtered data instantly
- ✅ **Filter Persistence** - Selections maintained across page refreshes
- ✅ **Compact UI Design** - All filters on same horizontal line with native browser styling

### 🏦 **Payment Transaction Tracking**
- ✅ **Payment Transactions Table** - Records actual payments with dates and methods
- ✅ **Payment Requests Table** - Tracks when payment requests are sent
- ✅ **Payment Status History** - Complete audit trail of status changes
- ✅ **Multiple Payment Methods** - PIX, bank transfer, cash, credit card support
- ✅ **Reference Numbers** - Store transaction IDs and payment references
- ✅ **Payment Analytics** - Automatic calculation of totals, pending amounts, session counts
- ✅ **Realistic Test Data** - 20 patients with diverse payment scenarios for testing

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

### 💰 **Payment Management**
- **Professional Payment Workflow** - Request payments, track status, handle partial payments
- **Advanced Filtering** - Filter by patient, status, date range with real-time updates
- **Payment Transaction History** - Complete record of payments with dates and methods
- **WhatsApp Integration** - Direct payment requests with Brazilian phone formatting
- **Brazilian Currency Support** - Proper R$ formatting throughout the interface
- **Revenue Analytics** - Dynamic summary cards showing totals for filtered data
- **Payment Status Management** - Handle "Não Cobrado", "Aguardando", "Pendente", "Pago"
- **Partial Payment Support** - Track patients who pay some sessions but not others

### 🔄 **Bidirectional Calendar Sync**
- **Real-time synchronization** between LV Notas and Google Calendar
- **Smart patient matching** by email and name
- **Automatic session creation** from calendar events
- **Dynamic webhook management** for development workflow

### 📋 **Session Management**
- **Complete CRUD operations** with real-time updates
- **Advanced filtering** by status, patient, and date
- **Calendar integration** with bidirectional sync
- **Portuguese localization** throughout

### 👥 **Patient Management**
- **Multi-tenant system** - therapists manage only their patients
- **Complete patient records** with contact information
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

### Payment System Architecture
- **PostgreSQL database** with comprehensive payment tracking tables
- **Real-time payment calculations** based on session data
- **Multi-tenant isolation** with proper foreign key relationships
- **Payment state machine** with automatic status transitions
- **Brazilian payment method support** (PIX, bank transfer, cash, credit card)
- **Payment overview view** for simplified data access and filtering

### Database Schema
- **payment_transactions** - Records of actual payments received
- **payment_requests** - Log of payment communications sent
- **payment_status_history** - Complete audit trail of changes
- **payment_overview view** - Simplified access to payment data with calculated states

### Frontend Architecture
- **React Native Web** with TypeScript for type safety
- **Custom routing system** with URL-based navigation
- **Real-time state management** with React Context
- **Native browser controls** for consistent UX
- **Responsive design** optimized for Brazilian therapy practices
- **Modular payment components** for maintainable code

### Backend Architecture
- **Express.js REST API** with type-safe routes
- **PostgreSQL** with proper foreign key relationships
- **Google Calendar API** integration with OAuth
- **Firebase Authentication** verification
- **Real-time webhooks** for bidirectional sync
- **Payment API endpoints** with comprehensive filtering support

## 📁 Project Structure

```
lv-notas/
├── src/                              # Frontend source code
│   ├── components/                   # React components
│   │   ├── payments/                # 💰 Payment management components
│   │   │   ├── PaymentsOverview.tsx # Main payment dashboard with filtering
│   │   │   ├── PaymentFilters.tsx   # Advanced horizontal filter system
│   │   │   ├── PatientPaymentCard.tsx # Patient payment summaries
│   │   │   ├── SessionPaymentCard.tsx # Session payment details
│   │   │   ├── PaymentSummaryCards.tsx # Dynamic revenue totals
│   │   │   ├── PaymentStatusBadge.tsx # Status indicators
│   │   │   └── PaymentActionButton.tsx # Context-aware action buttons
│   │   ├── Sessions.tsx             # Session management
│   │   ├── PatientManagement.tsx    # Patient management
│   │   └── Settings.tsx             # Settings and logout
│   ├── services/                    # API service layer
│   │   └── api.ts                   # API client with payment endpoints
│   └── types/                       # TypeScript type definitions
│       └── payments.ts              # Payment-specific types and interfaces
├── clinic-api/                      # Backend API server
│   ├── src/                         # Backend source code
│   │   ├── routes/                  # API route handlers
│   │   │   ├── payments.ts          # 💰 Payment management API with filtering
│   │   │   ├── sessions.ts          # Session management API
│   │   │   ├── patients.ts          # Patient management API
│   │   │   └── calendar-webhook.ts  # Bidirectional calendar sync
│   │   └── config/                  # Server configuration
│   │       └── database.ts          # PostgreSQL connection
│   └── db/                          # Database management
│       ├── complete_schema.sql      # Complete database schema with payment tables
│       ├── manage_db.sh            # Database management script
│       └── seed/                    # Comprehensive test data with payment scenarios
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
- Complete database schema with payment tables
- 20 patients with diverse pricing (R$ 120-250)
- 200+ sessions spanning 6 months
- Realistic payment scenarios for testing all filter combinations

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

4. **Start development:**
```bash
# Backend
cd clinic-api && npm run dev

# Frontend (new terminal)
npm start
# Press 'w' for web
```

5. **Access the application:**
   - Main app: `http://localhost:19006`
   - Payment management: `http://localhost:19006/pagamentos`

## 📱 Usage

### Payment Management Workflow
1. **View Payment Dashboard** - Navigate to `/pagamentos`
2. **Use Advanced Filtering:**
   - **Patient Filter** - Select specific patients or view all
   - **Status Filter** - Filter by "Não Cobrado", "Pago", "Pendente", etc.
   - **Date Range** - Quick buttons for different time periods
   - **View Toggle** - Switch between patient summaries and session details
3. **Track Payment Status** - Monitor "Não Cobrado" → "Aguardando" → "Pago"
4. **Send Payment Requests** - Use "Cobrar" button to request payments
5. **Handle Partial Payments** - Track patients who pay some but not all sessions
6. **Record Payments** - Mark sessions as paid when payments are received
7. **View Payment History** - See transaction dates and payment methods

### Advanced Filtering Features
- **Real-time Updates** - Summary cards update as you change filters
- **Patient-Specific View** - See all payment activity for individual patients
- **Status-Based Analysis** - Focus on specific payment states
- **Date Range Analysis** - Compare payment performance across different periods
- **Combined Filtering** - Use multiple filters simultaneously for detailed analysis

### Daily Workflow
1. **Dashboard** - Overview and quick actions
2. **Check-in** - Patient attendance confirmation
3. **Sessões** - Manage therapy sessions with calendar sync
4. **Pacientes** - Manage patient records
5. **Pagamentos** - Complete payment management and analytics
6. **Configurações** - Account settings and logout

## 🔧 API Endpoints

### Payment Management
- `GET /api/payments/summary?therapistEmail=&startDate=&endDate=` - Payment analytics
- `GET /api/payments/patients?therapistEmail=&startDate=&endDate=&status=` - Patient payment summaries with filtering
- `GET /api/payments/sessions?therapistEmail=&startDate=&endDate=&status=` - Session payment details with filtering
- `POST /api/payments/request` - Send payment requests with WhatsApp integration
- `PUT /api/payments/status` - Update payment status manually

### Session & Patient Management
- `GET /api/sessions?therapistEmail=` - Session management with filtering
- `GET /api/patients?therapistEmail=` - Patient management
- `POST /api/checkin` - Patient check-in system
- `POST /api/calendar-webhook` - Bidirectional calendar sync

## 🗄️ Database Schema

### Core Tables
- **therapists** - Therapist accounts with calendar integration
- **patients** - Patient records with contact information
- **sessions** - Therapy sessions with payment tracking columns

### Payment Tracking Tables
- **payment_transactions** - Records of actual payments received with dates, methods, amounts
- **payment_requests** - Log of payment communications sent to patients
- **payment_status_history** - Complete audit trail of status changes
- **payment_overview** (view) - Simplified payment data access with calculated states

### Key Database Features
- **Multi-tenant isolation** - Each therapist sees only their data
- **Foreign key relationships** - Proper data integrity
- **Payment state calculations** - Automatic status determination based on business rules
- **Performance indexes** - Optimized queries for filtering and analytics

## 🔐 Security Features

- **Firebase Authentication** with Google Sign-In
- **Multi-tenant data isolation** - Each therapist sees only their data
- **API key validation** for all requests
- **Payment data encryption** for sensitive financial information
- **Complete audit trails** for all payment transactions and status changes
- **Rate limiting** on API endpoints
- **CORS protection** with proper method support

## 🌍 Brazilian Localization

- **Complete Portuguese interface** throughout the application
- **Brazilian currency formatting** (R$ with comma decimals)
- **Brazilian timezone support** (America/Sao_Paulo)
- **WhatsApp integration** with Brazilian phone formatting (+55 11 99999-9999)
- **Cultural adaptations** for therapy practice workflow
- **Payment terminology** adapted for Brazilian business practices

## 🧪 Testing & Development

### Comprehensive Test Data
- **20 diverse patients** with varying pricing (R$ 120-250)
- **200+ sessions** spanning 6 months
- **Multiple payment scenarios** - paid, pending, overdue, partial payments
- **Realistic payment requests** with different dates and statuses
- **Complete filter testing** - All combinations of patient, status, and date filters

### Development Features
- **Hot reload** - Changes reflect immediately
- **Real authentication** - No mock data or bypasses
- **Database management scripts** - Easy reset and seeding
- **Comprehensive logging** - Detailed console output for debugging

## 🗺️ Development Roadmap

### ✅ **Completed Features**
- **Complete payment management system** with advanced filtering
- **Real database integration** with payment tracking tables
- **Advanced filtering system** with patient, status, and date filters
- **Horizontal filter layout** with native browser styling
- **Dynamic summary cards** that update based on filters
- **Payment transaction history** with dates and methods
- **Partial payment support** for realistic payment scenarios
- **Complete bidirectional Google Calendar sync**
- **Authentication system** with Firebase Google Sign-In
- **Session management** with full CRUD and filtering
- **Patient management** with multi-tenant isolation

### 🚀 **Phase 2: Enhanced Payment Features**
**Goal**: Advanced payment automation and Brazilian payment integration

**Planned Features:**
- **PIX Payment Integration** - Real-time PIX payment monitoring
- **WhatsApp Payment Automation** - Automated payment reminders
- **Payment Analytics Dashboard** - Advanced revenue analytics and trends
- **Nota Fiscal Integration** - Automatic tax invoice generation
- **Payment Method Analytics** - Track preferred payment methods
- **Recurring Payment Detection** - Identify and manage recurring payments
- **Payment Performance Metrics** - Days to payment, success rates, etc.

### 🎯 **Phase 3: Advanced Practice Management**
**Goal**: Complete therapy practice automation

**Future Features:**
- **Analytics Dashboard** - Session attendance, patient progress, revenue insights
- **Automated Reminders** - WhatsApp/SMS appointment and payment reminders
- **Session Notes** - Secure note-taking with LGPD compliance
- **Progress Tracking** - Patient outcome measurements and therapy goals
- **Multi-therapist Clinics** - Clinic-wide management for group practices
- **Patient Mobile App** - Self-service booking and payment for patients

### 🔧 **Technical Improvements**
- **Performance Optimization** - Database indexing and query optimization
- **Enhanced Security** - Additional authentication layers and data encryption
- **Mobile App** - Native iOS/Android applications
- **Testing Coverage** - Comprehensive unit and integration testing
- **Internationalization** - Support for multiple languages and regions

## 📄 License

This project is proprietary software for LV Notas therapy practice management.

---

**Built with ❤️ for modern Brazilian therapy practice management**

*Now featuring COMPLETE payment management system with advanced filtering, real database integration, and comprehensive Brazilian payment support for the ultimate therapy practice management experience!* 🚀💰