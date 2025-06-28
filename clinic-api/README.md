# LV Notas Clinic API

A comprehensive Node.js/TypeScript REST API for managing therapy clinics with **complete payment management**, **enhanced therapist onboarding**, **dual date billing system**, and **complete Google Calendar integration**.

## 🚀 Latest Features (June 2025)

### 💰 **Complete Payment Management System**
- **📊 Payment Tracking Tables** - Complete database schema for payment transactions
- **🔍 Advanced Payment API** - Filtering by patient, status, date range with real-time calculations
- **💳 Payment Transaction History** - Track actual payments with dates, methods, and reference numbers
- **📝 Payment Request Tracking** - Log when payment requests are sent to patients
- **🏦 Multiple Payment Methods** - Support for PIX, bank transfer, cash, credit card
- **📈 Payment Analytics** - Real-time revenue calculations and payment performance metrics
- **🎯 Payment Status Management** - Handle "Não Cobrado", "Aguardando", "Pendente", "Pago" with automatic transitions
- **🇧🇷 Brazilian Payment Support** - Currency formatting, phone numbers, payment terminology

### ✨ **Enhanced Therapist Onboarding System**
- **📅 Calendar Import Wizard** - Import existing appointments from therapist's calendar
- **👥 Bulk Patient Creation** - Smart patient matching from calendar events
- **🔗 Appointment Linking** - Connect imported events to patient records
- **🔄 Recurring Session Detection** - Identify and manage repeating appointments
- **📊 Dual Date System** - Separate historical therapy start from LV Notas billing start dates
- **💰 Advanced Billing Management** - Complete billing cycle history with patient-level overrides

### 🎯 **Dual Date System (Critical Feature)**
- **Historical Therapy Start Date** (optional) - When therapy actually began (for context/analytics)
- **LV Notas Billing Start Date** (required) - When automated billing begins in LV Notas
- **Smart Billing Calculations** - Only sessions after billing start date count for invoicing
- **Complete Flexibility** - Different billing start dates per patient

### 💰 **Advanced Billing Features**
- **Billing Cycle Changes** - Monthly → Weekly → Per-session with full history
- **Patient-Specific Overrides** - Individual pricing and billing cycles
- **Complete Audit Trail** - Who changed what, when, and why
- **Billing Period Tracking** - Automatic invoice generation and payment tracking

## Prerequisites

- Node.js v18.x+
- PostgreSQL 14.x+
- Google Calendar API credentials (service-account-key.json)
- Firebase Admin credentials (service-account-key.json)

## Environment Setup

Create a .env file in the root directory:

```bash
# Database Configuration
POSTGRES_USER=dankupfer
POSTGRES_HOST=localhost
POSTGRES_DB=clinic_db
POSTGRES_PASSWORD=your_postgres_password
POSTGRES_PORT=5432

# API Security
SAFE_PROXY_KEY=your_secure_api_key

# Google Calendar Integration
GOOGLE_CALENDAR_ID=your_calendar_id
WEBHOOK_URL=your_webhook_url  # Set automatically by dev script

# Firebase Authentication
FIREBASE_PROJECT_ID=your_project_id

# Development
NODE_ENV=development
PORT=3000
```

## 🗄️ Database Management (Simplified!)

The new streamlined database system makes setup and maintenance incredibly simple:

### **Quick Start**
```bash
cd clinic-api/db

# Complete fresh start with comprehensive payment data (recommended)
./manage_db.sh fresh-comprehensive

# Add realistic payment test data to existing database
./manage_db.sh comprehensive

# Verify everything is working
./manage_db.sh check
```

### **Available Commands**
```bash
# 🗑️ Fresh database (deletes all data, starts clean)
./manage_db.sh fresh

# 🚀 Fresh database with comprehensive payment data
./manage_db.sh fresh-comprehensive

# 📋 Install/update schema only
./manage_db.sh schema

# 🌱 Add basic test data
./manage_db.sh seed

# 🚀 Add comprehensive payment test data (20 patients, 6 months sessions)
./manage_db.sh comprehensive

# 🔍 Comprehensive schema and data verification
./manage_db.sh check

# 🔄 Complete reset with schema + basic test data
./manage_db.sh reset

# 🔄 Complete reset with comprehensive payment data
./manage_db.sh reset-comprehensive

# 💾 Create database backup
./manage_db.sh backup
```

### **What You Get with Comprehensive Data**
- **20 diverse patients** with varying pricing (R$ 120-250)
- **200+ sessions** spanning 6 months with realistic patterns
- **Multiple payment scenarios** - paid, pending, overdue, partial payments
- **Payment request tracking** with different dates and statuses
- **Complete payment transaction history** with various payment methods
- **Perfect for testing** all payment filtering combinations

## Installation

```bash
# Install dependencies
npm install

# Set up database with comprehensive payment data (one command!)
./db/manage_db.sh fresh-comprehensive

# Verify setup
./db/manage_db.sh check
```

## Development

```bash
# Start development server with automatic webhook setup (recommended)
npm run dev

# Simple development server (no webhook management)
npm run dev:simple

# Build for production
npm run build

# Start production server
npm start
```

## 🎯 Enhanced Database Schema

### **Core Tables (Enhanced)**
- **therapists** - Enhanced with billing cycles, onboarding tracking
- **patients** - **Dual date system**, recurring patterns, pricing overrides
- **sessions** - Billing integration, onboarding tracking, **payment tracking columns**
- **calendar_events**, **check_ins**, **calendar_webhooks** - Existing functionality

### **Payment Tracking Tables (New)**
- **payment_transactions** - Records of actual payments received with dates, methods, amounts, reference numbers
- **payment_requests** - Log of payment communications sent to patients with WhatsApp tracking
- **payment_status_history** - Complete audit trail of all payment status changes with reasons

### **Onboarding Tables (New)**
- **therapist_onboarding** - Step-by-step progress tracking
- **imported_calendar_events** - Calendar import with smart matching
- **patient_matching_candidates** - AI-powered patient detection
- **recurring_session_templates** - Pattern detection from history

### **Billing History Tables (New)**
- **therapist_billing_history** - Complete billing cycle change history
- **patient_billing_history** - Patient-specific overrides with full audit trail
- **billing_periods** - Invoice generation and payment tracking

### **Smart Views**
- **payment_overview** - Complete payment status for all sessions with calculated states
- **billable_sessions** - Automatically calculates which sessions count for billing
- **current_billing_settings** - Current billing configuration for all patients
- **therapist_onboarding_progress** - Real-time onboarding status
- **billing_change_history** - Complete audit trail of all billing changes

## 🔄 Google Calendar Integration

### **Complete Bidirectional Sync**
- **LV Notas → Calendar** - Sessions automatically create calendar events
- **Calendar → LV Notas** - Manual calendar changes update sessions
- **Real-time webhooks** - Changes sync instantly in both directions
- **Dynamic webhook management** - Automatic ngrok URL handling for development

### **Advanced Features**
- **Smart patient matching** - Finds patients by email or name from calendar events
- **Multi-calendar support** - Each therapist uses their own Google Calendar
- **Timezone handling** - Proper São Paulo timezone management
- **Event classification** - Identifies "Sessão - Patient Name" patterns

## 💰 Payment System Examples

### **View Payment Analytics**
```sql
-- Get payment overview for all sessions
SELECT * FROM payment_overview 
WHERE therapist_email = 'dnkupfer@gmail.com'
ORDER BY session_date DESC;

-- Get payment summary by status
SELECT 
    payment_state,
    COUNT(*) as session_count,
    SUM(session_price) as total_amount
FROM payment_overview 
WHERE therapist_email = 'dnkupfer@gmail.com'
GROUP BY payment_state;
```

### **Track Payment Requests**
```sql
-- View all payment requests sent
SELECT 
    pr.*,
    p.nome as patient_name
FROM payment_requests pr
JOIN patients p ON pr.patient_id = p.id
WHERE pr.therapist_id = (SELECT id FROM therapists WHERE email = 'dnkupfer@gmail.com')
ORDER BY pr.request_date DESC;
```

### **Payment Transaction History**
```sql
-- View all payment transactions
SELECT 
    pt.*,
    p.nome as patient_name,
    s.date as session_date
FROM payment_transactions pt
JOIN patients p ON pt.patient_id = p.id
JOIN sessions s ON pt.session_id = s.id
WHERE pt.therapist_id = (SELECT id FROM therapists WHERE email = 'dnkupfer@gmail.com')
ORDER BY pt.payment_date DESC;
```

### **Change Therapist Billing Cycle**
```sql
-- Change from monthly to weekly billing starting July 1st
SELECT change_therapist_billing_cycle(
    1, -- therapist_id
    'weekly', -- new billing cycle
    180.00, -- new default price
    '2025-07-01', -- effective date
    'Cliente solicitou faturamento semanal',
    'ana.silva@terapia.com'
);
```

### **Patient-Specific Override**
```sql
-- Special per-session billing for one patient
SELECT change_patient_billing_cycle(
    5, -- patient_id
    'per_session', -- override cycle
    120.00, -- special price
    '2025-07-15', -- when it starts
    'Situação financeira especial',
    'ana.silva@terapia.com'
);
```

## 🎯 Onboarding Workflow

### **For New Therapists**
1. **Calendar Selection** - Choose Google Calendar for sync
2. **Event Import** - Import 6+ months of existing appointments
3. **Patient Creation** - Smart bulk creation from calendar events
4. **Appointment Linking** - Connect events to patient records
5. **Dual Date Setup** - Configure historical vs billing start dates
6. **Billing Configuration** - Set pricing and invoicing preferences
7. **Go Live** - Seamless transition to LV Notas workflow

### **Onboarding Progress Tracking**
```sql
-- Check onboarding status for all therapists
SELECT * FROM therapist_onboarding_progress;

-- Get detailed progress for specific therapist
SELECT * FROM therapist_onboarding WHERE therapist_id = 1;
```

## API Endpoints

### **Payment Management (New)**
- `GET /api/payments/summary?therapistEmail=&startDate=&endDate=` - Payment analytics with filtering
- `GET /api/payments/patients?therapistEmail=&startDate=&endDate=&status=` - Patient payment summaries with advanced filtering
- `GET /api/payments/sessions?therapistEmail=&startDate=&endDate=&status=` - Session payment details with filtering
- `POST /api/payments/request` - Send payment request (creates payment_requests record, updates sessions)
- `PUT /api/payments/status` - Update payment status (creates payment_transactions, updates payment_status_history)
- `POST /api/payments/reminder` - Send payment reminder

### **Enhanced Endpoints (New)**
- `GET /api/therapists/:email/onboarding-status` - Get onboarding progress
- `POST /api/therapists/:email/onboarding-step` - Update onboarding step
- `GET /api/calendars/events/import` - Import calendar events for onboarding
- `POST /api/calendars/events/mark-therapy-sessions` - Mark events as therapy sessions
- `POST /api/patients/bulk-create` - Create multiple patients from import
- `POST /api/patients/link-to-events` - Link patients to calendar events
- `PUT /api/therapists/:email/billing-cycle` - Change billing configuration
- `PUT /api/patients/:id/billing-cycle` - Patient-specific billing override

### **Existing Endpoints (Enhanced)**
- `POST /api/checkin` - Patient check-in with enhanced session tracking
- `POST /api/calendar-webhook` - Bidirectional calendar sync
- `GET /api/patients` - Enhanced with dual date system
- `GET /api/sessions` - Enhanced with billing integration and payment tracking
- `GET /api/therapists` - Enhanced with onboarding status

## Development Workflow

### **Daily Development**
```bash
# Start with fresh comprehensive payment data
./db/manage_db.sh reset-comprehensive

# Start development with automatic webhook setup
npm run dev

# Check database state anytime
./db/manage_db.sh check
```

### **Database Verification**
The `check` command provides comprehensive verification:
- ✅ Table structure and relationships
- 🔍 Enhanced column verification with payment tracking
- 📊 Data summary with onboarding status
- 💰 Billing configuration overview
- 🎯 Dual date system validation
- 💳 Payment data verification

### **Payment Testing Workflow**
```bash
# Set up comprehensive payment test data
./db/manage_db.sh comprehensive

# This creates:
# - 20 patients with diverse pricing
# - 200+ sessions with various statuses
# - Payment requests with different dates
# - Payment transactions with multiple methods
# - Complete payment scenarios for testing filters
```

## Google Cloud Deployment

### **Setup Google Cloud Project**
```bash
# Set project and enable services
gcloud config set project lv-notas
gcloud services enable secretmanager.googleapis.com cloudsql.googleapis.com run.googleapis.com

# Create enhanced secrets for new features
gcloud secrets create safe-proxy-key --replication-policy="automatic"
gcloud secrets create postgres-password --replication-policy="automatic"
gcloud secrets create firebase-service-account --data-file=./service-account-key.json
gcloud secrets create google-calendar-id --replication-policy="automatic"

# Add secret values
echo -n "your_secure_api_key" | gcloud secrets versions add safe-proxy-key --data-file=-
echo -n "your_postgres_password" | gcloud secrets versions add postgres-password --data-file=-
echo -n "your_calendar_id" | gcloud secrets versions add google-calendar-id --data-file=-
```

### **Deploy with Enhanced Features**
```bash
# Deploy complete system
npm run deploy

# Or manually:
npm run build
docker build -t clinic-api .
docker tag clinic-api gcr.io/lv-notas/clinic-api
docker push gcr.io/lv-notas/clinic-api

gcloud run deploy clinic-api \
  --image gcr.io/lv-notas/clinic-api \
  --platform managed \
  --region us-central1 \
  --set-secrets=SAFE_PROXY_KEY=safe-proxy-key:latest,POSTGRES_PASSWORD=postgres-password:latest \
  --env-vars-file env.yaml \
  --add-cloudsql-instances lv-notas:us-central1:clinic-db
```

### **Production Database Setup**
```bash
# Create enhanced schema in production
gcloud sql connect clinic-db --user=postgres --database=clinic_db

# Run complete schema (no migrations needed!)
\i complete_schema.sql

# Add comprehensive test data for production testing
\i seed/01_therapist_seed.sql
\i seed/02_patients_seed.sql
\i seed/03_sessions_seed.sql
\i seed/04_checkins_events_seed.sql
\i seed/05_payment_test_data.sql
```

## 📊 Key Concepts

### **Payment Management Architecture**
```sql
-- Payment flow example
-- 1. Session completed (status = 'compareceu')
-- 2. Payment request sent (payment_requested = true)
-- 3. Payment received (payment_transactions record created)
-- 4. Session marked as paid (payment_status = 'paid')

-- View complete payment flow for a patient
SELECT 
    s.date as session_date,
    s.session_price,
    s.payment_requested,
    s.payment_request_date,
    s.payment_status,
    pt.payment_date,
    pt.payment_method,
    pt.reference_number
FROM sessions s
LEFT JOIN payment_transactions pt ON s.id = pt.session_id
WHERE s.patient_id = 1
ORDER BY s.date;
```

### **Dual Date System**
```sql
-- Historical context (optional)
therapy_start_date: '2024-01-15'  -- When therapy actually began

-- LV Notas billing (required)  
lv_notas_billing_start_date: '2025-06-01'  -- When automated billing starts

-- Result: Historical sessions for context, billing starts fresh
```

### **Billing Flexibility**
- **Therapist-level defaults** - Monthly, weekly, per-session, or ad-hoc
- **Patient-level overrides** - Special pricing or different cycles
- **Historical tracking** - Complete audit trail of all changes
- **Automatic calculations** - Billing views handle complexity

### **Smart Onboarding**
- **Calendar pattern detection** - Identifies recurring appointments
- **Patient name extraction** - "Sessão - Patient Name" parsing
- **Confidence scoring** - AI-powered matching accuracy
- **Manual override support** - Human review for edge cases

## 🛡️ Security Features

- **Firebase Authentication** with Google Sign-In
- **Multi-tenant isolation** - Each therapist sees only their data
- **API key validation** for all requests
- **Complete audit trails** for billing and payment changes
- **Secure webhook validation**
- **Google Cloud Secret Manager** integration
- **Payment data encryption** for sensitive financial information
- **Rate limiting** on all API endpoints

## 🌍 Internationalization

- **Complete Portuguese interface** throughout
- **Brazilian timezone** support (America/Sao_Paulo)
- **Cultural adaptations** for therapy practice workflow
- **Localized error messages** and user feedback
- **Brazilian currency formatting** (R$ with comma decimals)
- **WhatsApp integration** with Brazilian phone number formatting

## 📈 Monitoring & Analytics

### **Payment Analytics**
```sql
-- Payment performance metrics
SELECT 
    DATE_TRUNC('month', session_date) as month,
    COUNT(*) as total_sessions,
    COUNT(*) FILTER (WHERE payment_status = 'paid') as paid_sessions,
    SUM(session_price) as total_revenue,
    SUM(session_price) FILTER (WHERE payment_status = 'paid') as paid_revenue,
    ROUND(COUNT(*) FILTER (WHERE payment_status = 'paid') * 100.0 / COUNT(*), 2) as payment_rate
FROM payment_overview 
WHERE therapist_email = 'dnkupfer@gmail.com'
GROUP BY DATE_TRUNC('month', session_date)
ORDER BY month DESC;
```

### **Onboarding Metrics**
```sql
-- Onboarding completion rates
SELECT 
  COUNT(*) as total_therapists,
  SUM(CASE WHEN onboarding_completed THEN 1 ELSE 0 END) as completed,
  AVG(EXTRACT(epoch FROM (onboarding_completed_at - onboarding_started_at))/3600) as avg_hours
FROM therapists;
```

### **Billing Distribution**
```sql
-- Billing cycle analysis
SELECT 
  current_billing_cycle,
  COUNT(*) as patient_count,
  AVG(current_session_price) as avg_price
FROM current_billing_settings 
GROUP BY current_billing_cycle;
```

## 🧪 Testing Features

### **Payment Testing Scenarios**
The comprehensive seed data provides realistic testing scenarios:

1. **"Não Cobrado" Patients** - Sessions completed but no payment request sent
2. **"Aguardando Pagamento" Patients** - Payment requested within last 7 days
3. **"Pendente" Patients** - Payment requested over 7 days ago
4. **"Pago" Patients** - Payments completed with transaction records
5. **"Parcialmente Pago" Patients** - Some sessions paid, others pending

### **Filter Testing**
- **Patient Filter** - Test with individual patients vs "Todos"
- **Status Filter** - Test each payment status individually
- **Date Range Filter** - Test different time periods
- **Combined Filters** - Test multiple filters simultaneously
- **Summary Card Updates** - Verify totals update with filters

### **API Testing**
```bash
# Test payment endpoints with curl
curl -X GET "http://localhost:3000/api/payments/summary?therapistEmail=dnkupfer@gmail.com" \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json"

curl -X GET "http://localhost:3000/api/payments/patients?therapistEmail=dnkupfer@gmail.com&status=pago" \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json"
```

## 🚀 Future Roadmap

### **Phase 2: Brazilian Payment Integration**
- **PIX payment tracking** with Open Banking integration
- **WhatsApp payment requests** with click-to-chat links
- **Nota Fiscal Paulista** automatic tax invoice generation
- **Real-time payment monitoring** and session matching

### **Phase 3: Advanced Practice Management**
- **Analytics dashboard** with attendance and revenue insights
- **Automated reminders** via WhatsApp/SMS
- **Session notes** with LGPD compliance
- **Multi-therapist clinics** with group practice management

### **Phase 4: AI-Powered Features**
- **Payment prediction models** - Predict payment likelihood
- **Automated payment optimization** - Suggest optimal payment request timing
- **Patient behavior analysis** - Identify payment patterns
- **Revenue forecasting** - Predict future revenue based on sessions

## 📄 License

This project is proprietary software for LV Notas therapy practice management.

---

**Built with ❤️ for modern therapy practice management in Brazil**

*Now featuring complete payment management system with advanced filtering, real database integration, and comprehensive Brazilian payment support for seamless therapy practice operations!* 🚀💰