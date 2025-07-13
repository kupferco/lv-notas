# LV Notas Clinic API

A comprehensive Node.js/TypeScript REST API for managing therapy clinics with **calendar-only session management**, **monthly billing periods**, **WhatsApp payment automation**, **dual-mode system support**, and **complete Google Calendar read integration**.

## 🚀 Latest Features (July 2025)

### 📅 **Calendar-Only Session Management (NEW!)**
- **📖 Read-Only Calendar Integration** - All appointments managed in Google Calendar, API reads-only
- **🗓️ Dynamic Patient Filtering** - Uses existing `lv_notas_billing_start_date` for patient-specific session filtering
- **⚡ No Database Session Sync** - Eliminates complex bidirectional sync, calendar is single source of truth
- **🔍 Real-Time Calendar Reading** - Sessions loaded fresh from Google Calendar on each request
- **🎯 Patient Start Date Logic** - Only counts sessions after patient's billing start date
- **📊 Calendar-Based Analytics** - All session counting and analytics read directly from calendar

### 💰 **Monthly Billing Periods (NEW!)**
- **📅 Calendar Month Billing** - Realistic therapy billing (1st-31st of each month)
- **🔘 Manual "Process Charges" Per Patient** - Therapist controls when to process monthly charges
- **📸 Immutable Session Snapshots** - Calendar sessions captured and preserved at billing time
- **🛡️ Payment Protection Logic** - Can't void billing periods once payment received
- **♻️ Void/Delete Workflow** - Delete payment → re-enable voiding → reprocess with latest calendar data
- **📋 Audit Trail Preservation** - Google Calendar event IDs stored for audit, not business logic

### 🎯 **Simplified Architecture Benefits**
- **🔄 No Sync Complexity** - Calendar changes don't break existing billing periods
- **📊 One Source of Truth** - Google Calendar holds all appointment data
- **💼 Professional Billing** - Monthly invoices instead of per-session micro-transactions
- **🔒 Immutable Audit** - Session details preserved even if calendar events deleted
- **⚡ MVP-Focused** - Simple, realistic workflow for therapy practices

### 📱 **WhatsApp Payment Integration (Enhanced)**
- **🇧🇷 Brazilian Phone Number Support** - Proper formatting with +55 country code
- **💬 Monthly Billing Messages** - WhatsApp integration adapted for monthly billing periods
- **📞 Patient Phone Storage** - Enhanced patient records with telefone field
- **📊 Billing Period Tracking** - Payment requests linked to monthly billing periods
- **🔗 Professional Invoices** - Monthly session summaries via WhatsApp

### 🎯 **Dual-Mode System Backend Support**
- **🔄 Mode-Agnostic API** - Same endpoints work for both Simple and Advanced frontend modes
- **📊 Flexible Status Filtering** - API handles both simplified and granular status filtering
- **💰 Smart Status Mapping** - Backend maintains granular data while supporting simplified frontend views
- **🎨 Frontend-Adaptive Responses** - API structure supports both Card and List view requirements

## Architecture Overview

### **Calendar-Only Session Flow**
```
Google Calendar (Source of Truth)
    ↓ (Read Only)
Calendar-Only API (/api/calendar-only/*)
    ↓ (Process Monthly)
Monthly Billing API (/api/monthly-billing/*)
    ↓ (Immutable Snapshots)
Billing Periods Database
```

### **Monthly Billing Workflow**
1. **Therapist manages appointments** in Google Calendar (create, edit, delete)
2. **End of month** → Therapist clicks "Process Charges" per patient
3. **System reads calendar** for that month and creates immutable billing period
4. **Session snapshot preserved** → Calendar changes no longer affect this billing
5. **Payment request sent** → WhatsApp/PIX with monthly session summary
6. **Payment received** → Billing period locked, cannot be voided
7. **If correction needed** → Delete payment → void period → reprocess

## Prerequisites

- Node.js v18.x+
- PostgreSQL 14.x+
- Google Calendar API credentials (service-account-key.json) - **READ ONLY**
- Firebase Admin credentials (service-account-key.json)
- Google Cloud CLI (for production deployments)

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

# Google Calendar Integration (READ ONLY)
GOOGLE_CALENDAR_ID=your_calendar_id
CALENDAR_WRITES_ENABLED=false  # NEW: Disables calendar write operations
WEBHOOK_URL=your_webhook_url   # Optional: for calendar change notifications

# Firebase Authentication
FIREBASE_PROJECT_ID=your_project_id

# Development
NODE_ENV=development
PORT=3000
```

## 🗄️ Database Management

### **Local Development Database**

#### **Quick Start with Monthly Billing**
```bash
cd clinic-api/db

# Complete fresh start with monthly billing system
./manage_db.sh fresh-comprehensive

# Verify monthly billing tables installed
./manage_db.sh check
```

The database now includes:
- ✅ **Monthly billing periods** table with session snapshots
- ✅ **Monthly billing payments** table with payment tracking
- ✅ **Calendar-only session views** for real-time calendar reading
- ✅ **Enhanced patient management** with billing start dates
- ✅ **WhatsApp-ready phone numbers** for payment automation

### **User-Specific Development Workflow**
```bash
# Clean up specific user data for fresh onboarding testing
./manage_db.sh cleanup-user your-email@example.com

# Test monthly billing workflow
./manage_db.sh comprehensive
```

### **Monthly Billing Test Data**
The comprehensive seed data now includes:
- **20 patients** with `lv_notas_billing_start_date` set
- **Brazilian phone numbers** for WhatsApp integration
- **Sample billing periods** for testing monthly workflow
- **Payment tracking examples** showing void/payment protection logic

## Development

```bash
# Start development server (calendar read-only mode)
npm run dev

# Simple development server (no webhook management)
npm run dev:simple

# Build for production
npm run build

# Start production server
npm start
```

## 🎯 Enhanced Database Schema

### **Monthly Billing Tables (NEW!)**
- **monthly_billing_periods** - Immutable monthly billing with session snapshots
- **monthly_billing_payments** - Payment tracking with void protection logic
- **App configuration** - Global settings including calendar mode

### **Enhanced Core Tables**
- **therapists** - Enhanced with billing cycles, onboarding tracking
- **patients** - **lv_notas_billing_start_date** field, telefone field, pricing overrides
- **sessions** - Legacy table (now optional, calendar-only mode available)

### **Calendar Integration Tables**
- **calendar_events**, **calendar_webhooks** - Optional change notification system
- **App configuration** - Calendar mode settings (read-only vs read-write)

### **Monthly Billing Schema Example**
```sql
-- Monthly billing periods (immutable once created)
CREATE TABLE monthly_billing_periods (
    id SERIAL PRIMARY KEY,
    therapist_id INTEGER REFERENCES therapists(id),
    patient_id INTEGER REFERENCES patients(id),
    billing_year INTEGER NOT NULL,     -- 2025
    billing_month INTEGER NOT NULL,    -- 1-12 (January = 1)
    session_count INTEGER DEFAULT 0,
    total_amount DECIMAL(10,2) DEFAULT 0.00,
    session_snapshots JSONB DEFAULT '[]', -- [{date, time, google_event_id, patient_name}]
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'processed', -- 'processed', 'paid', 'void'
    can_be_voided BOOLEAN DEFAULT true    -- false once payment exists
);
```

## 🚀 API Endpoints

### **Calendar-Only Session Management (NEW!)**
- `GET /api/calendar-only/patients?therapistEmail=&startDate=&endDate=` - **All patients with calendar sessions**
- `GET /api/calendar-only/patients/:id?therapistEmail=` - **Specific patient's calendar sessions**
- `GET /api/calendar-only/sessions?therapistEmail=&autoCheckIn=` - **All calendar sessions with payment info**
- `GET /api/calendar-only/debug?therapistEmail=` - **Calendar connectivity and data verification**

### **Monthly Billing Management (NEW!)**
- `GET /api/monthly-billing/summary?therapistEmail=&year=&month=` - **Monthly billing overview per patient**
- `POST /api/monthly-billing/process` - **Process monthly charges for specific patient**
- `PUT /api/monthly-billing/:id/void` - **Void billing period (if no payments)**
- `POST /api/monthly-billing/:id/payments` - **Record payment (prevents voiding)**
- `DELETE /api/monthly-billing/payments/:id` - **Delete payment (re-enables voiding)**
- `GET /api/monthly-billing/:id` - **Complete billing period details with session snapshots**
- `DELETE /api/monthly-billing/:id` - **Delete entire billing period (if no payments)**

### **Enhanced Patient Management**
- `GET /api/patients?therapistEmail=` - **Includes lv_notas_billing_start_date and telefone**
- `POST /api/patients` - Create patient **with billing start date**
- `PUT /api/patients/:id` - Update patient **including billing start date**

### **Legacy Session Management (Optional)**
- `GET /api/sessions?therapistEmail=` - Traditional database sessions (still available)
- `POST /api/checkin` - Patient check-in (compatible with both modes)
- `POST /api/calendar-webhook` - Calendar change notifications (optional)

## 💰 Monthly Billing API Examples

### **Monthly Billing Overview**
```bash
# Get billing summary for January 2025
curl -X GET "/api/monthly-billing/summary?therapistEmail=therapist@example.com&year=2025&month=1" \
  -H "X-API-Key: your_api_key"

# Response shows per-patient billing status
{
  "year": 2025,
  "month": 1,
  "summary": [
    {
      "patientName": "Ana Silva",
      "patientId": 1,
      "sessionCount": 0,
      "totalAmount": 0,
      "hasPayment": false,
      "canProcess": true  // Can process charges for this month
    }
  ]
}
```

### **Process Monthly Charges**
```bash
# Process charges for specific patient/month
curl -X POST /api/monthly-billing/process \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -H "X-Google-Access-Token: user_calendar_token" \
  -d '{
    "therapistEmail": "therapist@example.com",
    "patientId": 1,
    "year": 2025,
    "month": 1
  }'

# Response includes session snapshots from Google Calendar
{
  "message": "Monthly charges processed successfully",
  "billingPeriod": {
    "id": 123,
    "sessionCount": 4,
    "totalAmount": 48000,  // R$ 480.00 in cents
    "sessionSnapshots": [
      {
        "date": "2025-01-07",
        "time": "14:00", 
        "googleEventId": "abc123",
        "patientName": "Ana Silva"
      }
      // ... more sessions
    ],
    "status": "processed",
    "canBeVoided": true
  }
}
```

### **Record Payment (Locks Billing Period)**
```bash
# Record payment - prevents voiding
curl -X POST /api/monthly-billing/123/payments \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "amount": 48000,
    "paymentMethod": "pix", 
    "paymentDate": "2025-01-31",
    "therapistEmail": "therapist@example.com",
    "referenceNumber": "PIX123456"
  }'
```

### **Void/Delete Workflow**
```bash
# 1. Try to void (fails if payment exists)
curl -X PUT /api/monthly-billing/123/void \
  -d '{"therapistEmail": "therapist@example.com", "reason": "Patient missed sessions"}'
# Response: {"error": "Cannot void billing period", "details": "Period may have payments"}

# 2. Delete payment first  
curl -X DELETE /api/monthly-billing/payments/456

# 3. Now voiding works
curl -X PUT /api/monthly-billing/123/void \
  -d '{"therapistEmail": "therapist@example.com", "reason": "Correction needed"}'
# Response: {"message": "Billing period voided successfully"}

# 4. Reprocess with latest calendar data
curl -X POST /api/monthly-billing/process \
  -d '{"therapistEmail": "therapist@example.com", "patientId": 1, "year": 2025, "month": 1}'
```

## Calendar-Only Session Examples

### **Get Patient Sessions from Google Calendar**
```bash
# Real-time calendar reading
curl -X GET "/api/calendar-only/patients/1?therapistEmail=therapist@example.com" \
  -H "X-Google-Access-Token: user_calendar_token"

# Response: Live sessions from Google Calendar
[
  {
    "id": "google_event_id_123",
    "patientId": 1,
    "patientName": "Ana Silva", 
    "date": "2025-01-07T14:00:00.000Z",
    "status": "compareceu",  // Auto-determined based on date
    "isFromCalendar": true
  }
]
```

### **Calendar Debug Information**
```bash
# Verify calendar connectivity and patient data
curl -X GET "/api/calendar-only/debug?therapistEmail=therapist@example.com"

# Response includes calendar statistics
{
  "therapistEmail": "therapist@example.com",
  "totalPatients": 3,
  "patientsWithBillingDates": 3,
  "patientsWithSessions": 2,
  "totalSessions": 12,
  "earliestBillingDate": "2024-12-14T00:00:00.000Z",
  "calendarWritesEnabled": false
}
```

## 🔐 Security Features

### **Enhanced Security for Calendar-Only Mode**
- **Read-Only Calendar Access** - No write permissions to Google Calendar
- **Firebase Authentication** - All endpoints protected with Firebase tokens
- **Multi-tenant isolation** - Each therapist sees only their calendar data
- **Billing Period Immutability** - Session snapshots cannot be modified after creation
- **Payment Protection** - Cannot void billing periods with payments

### **Monthly Billing Security**
- **Immutable Audit Trail** - Session snapshots preserved forever
- **Payment Workflow Protection** - Clear rules prevent accidental data loss
- **Therapist Isolation** - Each therapist can only process their own patients
- **Date Validation** - Strict validation on billing periods and dates

## 🌍 Brazilian Localization

### **Monthly Billing Localization**
- **Brazilian Currency** - All amounts in centavos with R$ formatting
- **Brazilian Business Practices** - Monthly billing matches local therapy practice standards
- **WhatsApp Integration** - Monthly invoices via WhatsApp with proper Brazilian formatting
- **São Paulo Timezone** - All session times and billing dates in America/Sao_Paulo
- **Portuguese Interface** - All error messages and responses in Portuguese

## 🧪 Testing & Development

### **Monthly Billing Testing Workflow**
```bash
# 1. Set up test data
./db/manage_db.sh fresh-comprehensive

# 2. Verify calendar connectivity
curl -X GET "http://localhost:3000/api/calendar-only/debug?therapistEmail=terapeuta@example.com"

# 3. Test monthly processing (requires Google Calendar events)
curl -X POST "http://localhost:3000/api/monthly-billing/process" \
  -d '{"therapistEmail": "terapeuta@example.com", "patientId": 1, "year": 2025, "month": 1}'

# 4. Test payment workflow
# ... record payment, try voiding, delete payment, reprocess
```

## 🚀 Production Deployment

### **Prerequisites for Production**
```bash
# Ensure you're authenticated with Google Cloud
gcloud auth login
gcloud config set project lv-notas

# Configure Docker for Google Container Registry
gcloud auth configure-docker
```

### **Complete Production Deployment**

#### **1. Deploy Database Schema**
```bash
# Start Cloud SQL Proxy (in separate terminal)
cd clinic-api/db
./cloud_sql_proxy -instances=lv-notas:us-central1:clinic-db=tcp:5433

# Deploy schema to production (in new terminal)
cd clinic-api/db
POSTGRES_HOST=localhost POSTGRES_PORT=5433 POSTGRES_USER=postgres POSTGRES_DB=clinic_db ./manage_db.sh schema
```

#### **2. Deploy API to Google Cloud Run**
```bash
# From clinic-api directory
npm run deploy
```

This will:
- ✅ Build Docker image with latest calendar-only and monthly billing features
- ✅ Push to Google Container Registry
- ✅ Deploy to Google Cloud Run with proper environment variables
- ✅ Connect to Cloud SQL database
- ✅ Set up service account permissions

#### **3. Verify Production Deployment**
```bash
# Test basic API connectivity
curl https://clinic-api-141687742631.us-central1.run.app/api/test

# Expected response:
{
  "message": "API is working",
  "calendarWritesEnabled": false,
  "timestamp": "2025-07-13T..."
}

# Test calendar-only endpoints (requires authentication)
curl -X GET "https://clinic-api-141687742631.us-central1.run.app/api/calendar-only/debug?therapistEmail=test@example.com" \
  -H "X-API-Key: your_production_api_key" \
  -H "Authorization: Bearer firebase_token"

# Test monthly billing endpoints
curl -X GET "https://clinic-api-141687742631.us-central1.run.app/api/monthly-billing/summary?therapistEmail=test@example.com&year=2025&month=1" \
  -H "X-API-Key: your_production_api_key" \
  -H "Authorization: Bearer firebase_token"
```

### **Production Environment Variables**

Your `env.yaml` should include the new calendar-only settings:

```yaml
# env.yaml (for Cloud Run)
NODE_ENV: production
PORT: 8080
POSTGRES_HOST: /cloudsql/lv-notas:us-central1:clinic-db
POSTGRES_USER: postgres
POSTGRES_DB: clinic_db
POSTGRES_PORT: 5432
GOOGLE_CALENDAR_ID: your_production_calendar_id
CALENDAR_WRITES_ENABLED: false  # NEW: Read-only calendar mode
FIREBASE_PROJECT_ID: lv-notas
```

### **Deployment Safety Checklist**

**Before Deployment:**
- ✅ Test locally with `npm run dev`
- ✅ Verify all new endpoints work: `/api/calendar-only/*` and `/api/monthly-billing/*`
- ✅ Confirm `CALENDAR_WRITES_ENABLED=false` in production
- ✅ Database schema deployed to production
- ✅ Google Calendar read permissions configured

**After Deployment:**
- ✅ Verify `/api/test` endpoint responds
- ✅ Check calendar-only debug endpoint
- ✅ Test monthly billing summary endpoint
- ✅ Confirm write operations are disabled (calendar read-only)
- ✅ Test authentication with real Firebase tokens

### **Production Monitoring**

```bash
# View Cloud Run logs
gcloud logs read --service clinic-api --region us-central1 --limit 100

# Monitor specific calendar-only operations
gcloud logs read --service clinic-api --region us-central1 --filter="resource.labels.service_name=clinic-api AND textPayload:'calendar-only'"

# Monitor monthly billing operations
gcloud logs read --service clinic-api --region us-central1 --filter="resource.labels.service_name=clinic-api AND textPayload:'monthly-billing'"
```

### **Rollback Strategy**

If issues occur with the new calendar-only system:

```bash
# 1. Quick rollback to previous version
gcloud run services replace-traffic clinic-api --to-revisions=PREVIOUS_REVISION=100 --region us-central1

# 2. Or deploy previous Docker image
docker tag clinic-api:previous gcr.io/lv-notas/clinic-api:rollback
docker push gcr.io/lv-notas/clinic-api:rollback
gcloud run deploy clinic-api --image gcr.io/lv-notas/clinic-api:rollback --region us-central1
```

### **Production Database Backup**

Always backup before major schema deployments:

```bash
# Create production backup
./cloud_sql_proxy -instances=lv-notas:us-central1:clinic-db=tcp:5433 &
pg_dump -h localhost -p 5433 -U postgres -d clinic_db > production_backup_$(date +%Y%m%d_%H%M%S).sql
```

The new monthly billing and calendar-only features are now production-ready! 🚀


### **Calendar-Only Development**
- **No database sync complexity** - Calendar changes don't break existing billing
- **Real-time testing** - Changes in Google Calendar immediately visible
- **Immutable billing** - Test corrections with void/delete/reprocess workflow
- **Professional workflow** - Monthly billing matches real therapy practices

## 🗺️ Development Roadmap

### ✅ **Completed Features (July 2025)**
- **Complete calendar-only session management** with read-only Google Calendar integration
- **Monthly billing period system** with immutable session snapshots
- **Payment protection workflow** (void only if no payments)
- **Brazilian phone number integration** for WhatsApp automation
- **Dual-mode system support** for Simple/Advanced frontend modes
- **Professional monthly billing** replacing per-session micro-transactions

### 🚀 **Phase 2: Frontend Integration**
**Goal**: Complete calendar-only frontend

**Planned Features:**
- **Frontend calendar-only mode** - Replace session database calls with calendar API
- **Monthly billing UI** - Patient overview with "Process Charges" buttons
- **Payment management interface** - Record payments, void billing periods
- **Calendar event visualization** - Show Google Calendar events in app
- **WhatsApp automation** - Send monthly payment requests

### 🎯 **Phase 3: Advanced Monthly Billing**
**Goal**: Professional practice automation

**Future Features:**
- **Automated monthly processing** - End-of-month batch processing option
- **Custom billing periods** - Support for non-calendar-month periods
- **Advanced payment tracking** - Payment plans, partial payments, discounts
- **Billing analytics** - Monthly revenue trends, patient payment patterns
- **Export functionality** - PDF invoices, Excel reports, tax summaries

## 📄 License

This project is proprietary software for LV Notas therapy practice management.

---

**Built with ❤️ for modern Brazilian therapy practice management**

*Now featuring calendar-only session management and professional monthly billing periods - the most realistic therapy practice workflow available!* 🚀📅💰