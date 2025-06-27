# LV Notas Clinic API

A comprehensive Node.js/TypeScript REST API for managing therapy clinics with **enhanced therapist onboarding**, **dual date billing system**, and **complete Google Calendar integration**.

## 🚀 Latest Features (June 2025)

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

# Complete fresh start (recommended for development)
./manage_db.sh fresh

# Add realistic test data
./manage_db.sh seed

# Verify everything is working
./manage_db.sh check
```

### **Available Commands**
```bash
# 🗑️ Fresh database (deletes all data, starts clean)
npm run db:fresh

# 📋 Install/update schema only
npm run db:schema

# 🌱 Add test data to existing database
npm run db:seed

# 🔍 Comprehensive schema and data verification
npm run db:check

# 🔄 Complete reset with schema + test data
npm run db:reset

# 💾 Create database backup
npm run db:backup

# ☁️ Google Cloud SQL management
npm run db:cloud:start   # Start Cloud SQL instance
npm run db:cloud:stop    # Stop Cloud SQL instance  
npm run db:cloud:status  # Check Cloud SQL status
```

### **What You Get**
- **16 tables** - Core + Onboarding + Billing
- **5 views** - Easy data access (billable_sessions, current_billing_settings, etc.)
- **6 helper functions** - Billing calculations, patient name extraction
- **31 performance indexes** - Optimized queries
- **Complete test data** - 3 therapists, 6 patients, realistic scenarios

## Installation

```bash
# Install dependencies
npm install

# Set up database (one command!)
npm run db:fresh
npm run db:seed

# Verify setup
npm run db:check
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
- **sessions** - Billing integration, onboarding tracking
- **calendar_events**, **check_ins**, **calendar_webhooks** - Existing functionality

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

## 💰 Billing System Examples

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

### **Check Current Billing Settings**
```sql
-- See current billing for all patients
SELECT * FROM current_billing_settings;

-- View complete billing change history
SELECT * FROM billing_change_history WHERE therapist_id = 1;
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

### **Enhanced Endpoints (New)**
- `GET /api/therapists/:email/onboarding-status` - Get onboarding progress
- `POST /api/therapists/:email/onboarding-step` - Update onboarding step
- `GET /api/calendar-events/import` - Import calendar events for onboarding
- `POST /api/calendar-events/mark-therapy-sessions` - Mark events as therapy sessions
- `POST /api/patients/bulk-create` - Create multiple patients from import
- `POST /api/patients/link-to-events` - Link patients to calendar events
- `PUT /api/therapists/:email/billing-cycle` - Change billing configuration
- `PUT /api/patients/:id/billing-cycle` - Patient-specific billing override

### **Existing Endpoints (Enhanced)**
- `POST /api/checkin` - Patient check-in with enhanced session tracking
- `POST /api/calendar-webhook` - Bidirectional calendar sync
- `GET /api/patients` - Enhanced with dual date system
- `GET /api/sessions` - Enhanced with billing integration
- `GET /api/therapists` - Enhanced with onboarding status

## Development Workflow

### **Daily Development**
```bash
# Start with fresh data
npm run db:reset

# Start development with automatic webhook setup
npm run dev

# Check database state anytime
npm run db:check
```

### **Database Verification**
The `check` command provides comprehensive verification:
- ✅ Table structure and relationships
- 🔍 Enhanced column verification  
- 📊 Data summary with onboarding status
- 💰 Billing configuration overview
- 🎯 Dual date system validation

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
```

## 📊 Key Concepts

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
- **Complete audit trails** for billing changes
- **Secure webhook validation**
- **Google Cloud Secret Manager** integration

## 🌍 Internationalization

- **Complete Portuguese interface** throughout
- **Brazilian timezone** support (America/Sao_Paulo)
- **Cultural adaptations** for therapy practice workflow
- **Localized error messages** and user feedback

## 📈 Monitoring & Analytics

### **Onboarding Metrics**
```sql
-- Onboarding completion rates
SELECT 
  COUNT(*) as total_therapists,
  SUM(CASE WHEN onboarding_completed THEN 1 ELSE 0 END) as completed,
  AVG(EXTRACT(epoch FROM (onboarding_completed_at - onboarding_started_at))/3600) as avg_hours
FROM therapists;
```

### **Billing Analytics**
```sql
-- Billing distribution
SELECT 
  current_billing_cycle,
  COUNT(*) as patient_count,
  AVG(current_session_price) as avg_price
FROM current_billing_settings 
GROUP BY current_billing_cycle;
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

## 📄 License

This project is proprietary software for LV Notas therapy practice management.

---

**Built with ❤️ for modern therapy practice management in Brazil**

*Now featuring enhanced therapist onboarding with dual date billing system for seamless practice transitions!* 🚀