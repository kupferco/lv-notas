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

## 🧾 **NFS-e Electronic Invoice Integration (NEW!)**

### 🏗️ **Provider-Agnostic NFS-e Architecture**
- **🔌 Multiple Provider Support** - PlugNotas, Focus NFe, NFe.io, or direct municipal integration
- **🔐 Secure Certificate Management** - Encrypted storage of digital certificates (.p12/.pfx)
- **📊 Complete Invoice Tracking** - Full audit trail from generation to payment
- **⚡ Automatic Invoice Generation** - Optional auto-generation after payment confirmation
- **🛡️ Production-Safe Implementation** - NFS-e tables separate from core data

### 💼 **Brazilian Tax Compliance**
- **📋 São Paulo Municipal Integration** - Service code 14.01 for therapy services
- **💰 ISS Tax Calculation** - Configurable tax rates (typically 2-5% for therapy)
- **🏢 Company Information Management** - CNPJ, municipal registration, full address
- **📄 Official Invoice Generation** - Municipal verification codes and official numbering
- **📧 Patient Communication** - Email delivery of PDF invoices

### 🗄️ **NFS-e Database Schema**

#### **Therapist NFS-e Configuration**
```sql
-- Separate NFS-e configuration (optional per therapist)
CREATE TABLE therapist_nfse_config (
    id SERIAL PRIMARY KEY,
    therapist_id INTEGER REFERENCES therapists(id),
    
    -- Provider settings (agnostic)
    nfse_provider VARCHAR(50) DEFAULT 'plugnotas', -- plugnotas, focus_nfe, nfe_io
    provider_company_id VARCHAR(100),              -- Provider-specific company ID
    provider_api_key_encrypted TEXT,               -- Encrypted API key
    
    -- Certificate management
    certificate_file_path VARCHAR(255),            -- Encrypted certificate storage
    certificate_password_encrypted TEXT,           -- Encrypted certificate password
    certificate_expires_at TIMESTAMP,              -- Certificate expiration tracking
    certificate_status VARCHAR(20) DEFAULT 'pending', -- pending, active, expired
    
    -- Company details for invoices
    company_cnpj VARCHAR(18) NOT NULL,             -- Brazilian CNPJ
    company_name VARCHAR(255) NOT NULL,            -- Company legal name
    company_address JSONB DEFAULT '{}',            -- Complete address
    
    -- Tax configuration
    default_service_code VARCHAR(20) DEFAULT '14.01', -- Therapy service code
    default_tax_rate DECIMAL(5,2) DEFAULT 5.0,        -- ISS rate
    auto_generate_invoices BOOLEAN DEFAULT false,      -- Auto-generate after payment
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(therapist_id) -- One configuration per therapist
);

-- NFS-e invoice tracking
CREATE TABLE nfse_invoices (
    id SERIAL PRIMARY KEY,
    therapist_id INTEGER REFERENCES therapists(id),
    nfse_config_id INTEGER REFERENCES therapist_nfse_config(id),
    session_id INTEGER REFERENCES sessions(id),
    
    -- Provider integration
    nfse_provider VARCHAR(50) NOT NULL,            -- Which provider was used
    provider_invoice_id VARCHAR(100),              -- Provider-specific invoice ID
    provider_response JSONB DEFAULT '{}',          -- Full API response for debugging
    
    -- Invoice details
    invoice_number VARCHAR(50),                    -- Sequential invoice number
    invoice_verification_code VARCHAR(50),        -- Municipal verification code
    invoice_amount DECIMAL(10,2) NOT NULL,        -- Invoice amount in cents
    service_description TEXT NOT NULL,            -- Service description
    tax_amount DECIMAL(10,2),                     -- Calculated ISS tax
    
    -- Patient information (snapshot)
    recipient_name VARCHAR(255) NOT NULL,         -- Patient name at invoice time
    recipient_cpf VARCHAR(14),                    -- Patient CPF if available
    recipient_email VARCHAR(255),                 -- For invoice delivery
    
    -- Status and files
    invoice_status VARCHAR(20) DEFAULT 'pending', -- pending, issued, cancelled, error
    pdf_url TEXT,                                 -- Invoice PDF URL
    xml_url TEXT,                                 -- Invoice XML URL
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    issued_at TIMESTAMP,                          -- When invoice was successfully issued
    cancelled_at TIMESTAMP,                      -- If invoice was cancelled
    
    -- Error handling
    error_message TEXT,                           -- Error details if generation failed
    retry_count INTEGER DEFAULT 0,               -- Number of retry attempts
    last_retry_at TIMESTAMP                      -- Last retry timestamp
);
```

### 🚀 **NFS-e API Endpoints**

#### **Certificate Management**
```bash
# Upload digital certificate
POST /api/nfse/certificate
Content-Type: multipart/form-data
Authorization: Bearer your_session_token
X-API-Key: your_api_key

# Form data:
# certificate: [.p12/.pfx file]
# password: "certificate_password"
# therapistEmail: "therapist@example.com"

# Response
{
  "message": "Certificate uploaded and validated successfully",
  "certificateStatus": "active",
  "expiresAt": "2025-12-31T23:59:59.000Z",
  "validFor": "365 days"
}

# Check certificate status
GET /api/nfse/certificate/status?therapistEmail=therapist@example.com
Authorization: Bearer your_session_token
X-API-Key: your_api_key

# Response
{
  "status": "active",
  "expiresAt": "2025-12-31T23:59:59.000Z",
  "daysUntilExpiry": 180,
  "provider": "plugnotas",
  "companyRegistered": true
}
```

#### **Company Registration**
```bash
# Register company with NFS-e provider (automatic)
POST /api/nfse/company/register
Content-Type: application/json
Authorization: Bearer your_session_token
X-API-Key: your_api_key

{
  "therapistEmail": "therapist@example.com",
  "companyData": {
    "cnpj": "12.345.678/0001-99",
    "companyName": "Clínica Terapia Ltda",
    "municipalRegistration": "123456789",
    "address": {
      "street": "Rua das Flores, 123",
      "neighborhood": "Vila Nova",
      "city": "São Paulo",
      "state": "SP",
      "zipCode": "01234-567"
    },
    "email": "contato@clinica.com.br",
    "phone": "(11) 99999-9999"
  },
  "taxSettings": {
    "serviceCode": "14.01",
    "taxRate": 5.0,
    "defaultServiceDescription": "Serviços de psicoterapia"
  }
}

# Response
{
  "message": "Company registered successfully with provider",
  "provider": "plugnotas",
  "providerCompanyId": "PLUG123456",
  "status": "active"
}
```

#### **Invoice Generation**
```bash
# Generate test invoice (sandbox)
POST /api/nfse/invoice/test
Content-Type: application/json
Authorization: Bearer your_session_token
X-API-Key: your_api_key

{
  "therapistEmail": "therapist@example.com",
  "testData": {
    "patientName": "João Silva",
    "patientEmail": "joao@email.com",
    "sessionDate": "2025-01-15",
    "amount": 15000,  // R$ 150.00 in cents
    "serviceDescription": "Sessão de psicoterapia individual"
  }
}

# Generate production invoice
POST /api/nfse/invoice/generate
Content-Type: application/json
Authorization: Bearer your_session_token
X-API-Key: your_api_key

{
  "therapistEmail": "therapist@example.com",
  "sessionId": 123,
  "billingPeriodId": 456  // Optional: link to monthly billing period
}

# Response
{
  "message": "Invoice generated successfully",
  "invoice": {
    "id": 789,
    "invoiceNumber": "00000001",
    "verificationCode": "ABC123XYZ",
    "amount": 15000,
    "taxAmount": 750,  // 5% ISS
    "status": "issued",
    "pdfUrl": "https://provider.com/invoices/123.pdf",
    "issuedAt": "2025-01-15T14:30:00.000Z"
  }
}
```

#### **Invoice Management**
```bash
# List therapist's invoices
GET /api/nfse/invoices?therapistEmail=therapist@example.com&startDate=2025-01-01&endDate=2025-01-31
Authorization: Bearer your_session_token
X-API-Key: your_api_key

# Response
{
  "invoices": [
    {
      "id": 789,
      "invoiceNumber": "00000001",
      "recipientName": "João Silva",
      "amount": 15000,
      "status": "issued",
      "issuedAt": "2025-01-15T14:30:00.000Z",
      "pdfUrl": "https://provider.com/invoices/123.pdf"
    }
  ],
  "summary": {
    "totalInvoices": 1,
    "totalAmount": 15000,
    "issuedCount": 1,
    "pendingCount": 0,
    "errorCount": 0
  }
}

# Download invoice PDF
GET /api/nfse/invoice/:id/pdf?therapistEmail=therapist@example.com
Authorization: Bearer your_session_token
X-API-Key: your_api_key

# Response: PDF file download

# Cancel invoice
PUT /api/nfse/invoice/:id/cancel
Content-Type: application/json
Authorization: Bearer your_session_token
X-API-Key: your_api_key

{
  "therapistEmail": "therapist@example.com",
  "reason": "Patient cancellation"
}
```

### 💰 **Integration with Payment System**

#### **Automatic Invoice Generation**
```bash
# When payment is confirmed, automatically generate invoice
# This is triggered internally after payment confirmation

POST /api/monthly-billing/:id/payments
# After successful payment recording, if auto_generate_invoices=true:
# 1. Generate NFS-e invoice automatically
# 2. Send PDF to patient via email
# 3. Store invoice reference in billing period
```

#### **Manual Invoice Generation from Billing Periods**
```bash
# Generate invoice for paid billing period
POST /api/nfse/invoice/from-billing-period
Content-Type: application/json
Authorization: Bearer your_session_token
X-API-Key: your_api_key

{
  "therapistEmail": "therapist@example.com",
  "billingPeriodId": 456,
  "invoiceOptions": {
    "serviceDescription": "Sessões de psicoterapia - Janeiro 2025",
    "consolidateMultipleSessions": true  // Single invoice for multiple sessions
  }
}
```

### 🔧 **NFS-e Configuration**

#### **Provider-Specific Settings**
```bash
# App configuration includes provider settings
INSERT INTO app_configuration (key, value, description) VALUES
('nfse_default_provider', 'plugnotas', 'Default NFS-e provider'),
('nfse_sandbox_mode', 'true', 'Use sandbox/test mode'),
('nfse_auto_retry_failed', 'true', 'Auto-retry failed invoice generation'),
('nfse_max_retry_attempts', '3', 'Maximum retry attempts'),

-- Provider-specific API URLs
('nfse_provider_plugnotas_api_url', 'https://api.plugnotas.com.br', 'PlugNotas API'),
('nfse_provider_focus_nfe_api_url', 'https://api.focusnfe.com.br', 'Focus NFe API'),
('nfse_provider_nfe_io_api_url', 'https://api.nfe.io', 'NFe.io API');
```

#### **Certificate Management**
- **Encrypted Storage** - Certificates stored with AES-256 encryption
- **Expiration Monitoring** - Automatic alerts before certificate expiry
- **Validation** - Certificate validation before storage and use
- **Backup Support** - Certificate backup and restore functionality

### 🛡️ **NFS-e Security Features**

#### **Data Protection**
- **Certificate Encryption** - Digital certificates encrypted at rest
- **API Key Security** - Provider API keys encrypted with separate keys
- **Audit Logging** - Complete invoice generation audit trail
- **Error Handling** - Secure error logging without exposing sensitive data

#### **Provider Isolation**
- **Multi-Provider Support** - Each therapist can use different providers
- **Provider Failover** - Automatic retry with different provider if configured
- **Sandox/Production Toggle** - Safe testing environment
- **Rate Limiting** - Prevent API abuse and respect provider limits

### 🚀 **NFS-e Production Deployment**

#### **Environment Configuration**
```yaml
# env.yaml (NFS-e specific variables)
# NFS-e Integration
NFSE_ENABLED: true
NFSE_DEFAULT_PROVIDER: plugnotas
NFSE_SANDBOX_MODE: false  # Set to true for testing
NFSE_CERTIFICATE_STORAGE_PATH: /secure/certificates/
NFSE_ENCRYPTION_KEY: your-certificate-encryption-key-32-chars

# Provider API Keys (encrypted in database, these are for initial setup)
PLUGNOTAS_API_KEY: your-plugnotas-api-key
FOCUS_NFE_API_KEY: your-focus-nfe-api-key
NFE_IO_API_KEY: your-nfe-io-api-key
```

#### **Database Deployment**
```bash
# Add NFS-e support to existing production database (SAFE)
cd clinic-api/db
./manage_db.sh add-nfse

# This safely adds NFS-e tables without affecting existing data
```

#### **Production Testing**
```bash
# Test NFS-e endpoints in production
curl -X GET "https://clinic-api-141687742631.us-central1.run.app/api/nfse/certificate/status?therapistEmail=test@example.com" \
  -H "Authorization: Bearer production_session_token" \
  -H "X-API-Key: production_api_key"

# Test invoice generation in sandbox mode
curl -X POST "https://clinic-api-141687742631.us-central1.run.app/api/nfse/invoice/test" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer production_session_token" \
  -H "X-API-Key: production_api_key" \
  -d '{"therapistEmail":"test@example.com","testData":{"patientName":"Test Patient","amount":15000}}'
```

### 🎯 **NFS-e Development Workflow**

#### **Setup for Development**
1. **Get Provider Credentials** - Sign up with PlugNotas/Focus NFe/NFe.io
2. **Add NFS-e Schema** - Run `./manage_db.sh add-nfse`
3. **Configure Environment** - Set provider API keys and sandbox mode
4. **Upload Test Certificate** - Use development certificate for testing
5. **Test Invoice Generation** - Generate test invoices in sandbox

#### **Integration with Existing System**
- **Monthly Billing Integration** - Generate invoices for billing periods
- **Payment Workflow** - Optional automatic invoice generation after payment
- **Patient Communication** - Email invoice PDFs to patients
- **Audit Trail** - Complete invoice history linked to sessions and payments

---

*The NFS-e integration provides complete Brazilian tax compliance with provider flexibility - start with PlugNotas for simplicity, scale with Focus NFe or NFe.io, or integrate directly with municipal systems when needed.* 🧾⚡

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



## 🔐 **Production-Grade Session Management System (NEW!)**

### 🏗️ **Enterprise Session Architecture**
- **Database-Controlled Timing** - Session timeouts configured via PostgreSQL with live updates
- **JWT-Based Authentication** - Secure token system with configurable expiration
- **Activity Tracking** - Automatic session extension on user interaction
- **Multi-User Isolation** - Complete session separation between therapists
- **Audit Trail** - Comprehensive session activity logging for security

### ⚙️ **Flexible Session Configuration**
```bash
# Quick session timing configuration
cd db
./session-config.sh

# Available modes:
# 1. ⚡ Rapid Testing (2 minutes) - Development testing
# 2. 🛠️ Development (30 minutes) - Daily development work  
# 3. 🚀 Production (1 hour) - Standard production timeout
# 4. ⏰ Extended (2 hours) - Long admin sessions
# 5. 🎛️ Custom - Any custom timing
```

### 🚨 **Smart Session Monitoring**
- **Read-Only Status Checks** - Session polling never accidentally extends sessions
- **Mathematical Optimization** - Frontend checks at 90% of remaining warning time
- **Cross-Tab Session Sync** - Session extensions detected across browser tabs
- **Clean Lifecycle Management** - Proper cleanup on logout with zero memory leaks

### 🗄️ **Session Database Schema**

#### **Core Session Tables**
```sql
-- User credentials and authentication
CREATE TABLE user_credentials (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Active user sessions with configurable timing
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES user_credentials(id),
    session_token TEXT NOT NULL UNIQUE,
    
    -- Configurable session timing (set via session-config.sh)
    inactive_timeout_minutes INTEGER DEFAULT 30,
    warning_timeout_minutes INTEGER DEFAULT 2,
    max_session_hours INTEGER DEFAULT 8,
    
    -- Session lifecycle tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    terminated_at TIMESTAMP WITH TIME ZONE,
    
    -- Session metadata
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'expired', 'terminated'
    termination_reason VARCHAR(50),      -- 'logout', 'inactivity_timeout', 'manual'
    ip_address INET,
    user_agent TEXT
);

-- Session activity audit trail
CREATE TABLE session_activity_log (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES user_sessions(id),
    user_id INTEGER,
    activity_type VARCHAR(50),    -- 'login', 'activity', 'logout', 'extend'
    endpoint VARCHAR(255),        -- API endpoint accessed
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,               -- Additional activity data
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User permissions for multi-tenant access
CREATE TABLE user_permissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES user_credentials(id),
    therapist_id INTEGER REFERENCES therapists(id),
    role VARCHAR(20) DEFAULT 'viewer', -- 'viewer', 'manager', 'owner', 'super_admin'
    granted_by INTEGER REFERENCES user_credentials(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    notes TEXT
);
```

#### **Session Configuration Management**
```sql
-- App-wide configuration (includes session settings)
CREATE TABLE app_configuration (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Example session configuration entries:
INSERT INTO app_configuration (key, value, description) VALUES
('auth_require_email_verification', 'false', 'Require email verification for new users'),
('session_default_timeout_minutes', '30', 'Default session timeout in minutes'),
('session_default_warning_minutes', '2', 'Default warning time before session expires');
```

### 🔧 **Session Management API Endpoints**

#### **Authentication & Session Creation**
```bash
# User login (creates session)
POST /api/auth/login
Content-Type: application/json
X-API-Key: your_api_key

{
  "email": "therapist@example.com",
  "password": "secure_password"
}

# Response includes session token
{
  "message": "Login successful",
  "user": {
    "id": 4,
    "email": "therapist@example.com", 
    "displayName": "Dr. Silva"
  },
  "sessionToken": "eyJhbGciOiJIUzI1NiIs...",
  "sessionId": 135,
  "permissions": [...],
  "expiresIn": "1h"
}
```

#### **Session Status & Management**
```bash
# Check session status (read-only, no activity update)
GET /api/auth/session-status
Authorization: Bearer your_session_token
X-API-Key: your_api_key

# Response with real-time timing
{
  "status": "active",
  "timeUntilWarningMs": 45000,      # 45 seconds until warning
  "timeUntilExpiryMs": 105000,      # 1:45 until session expires
  "warningTimeoutMinutes": 1,       # Warning shows 1 min before expiry
  "inactiveTimeoutMinutes": 2,      # Session expires after 2 min inactivity
  "shouldShowWarning": false,       # Frontend should show warning modal
  "readOnly": true                  # Confirms no activity was updated
}

# Extend session (resets activity timer)
POST /api/auth/extend-session
Content-Type: application/json
X-API-Key: your_api_key

{
  "sessionToken": "eyJhbGciOiJIUzI1NiIs..."
}

# Session configuration (for frontend adaptation)
GET /api/auth/session-config
Authorization: Bearer your_session_token  # or localhost bypass
X-API-Key: your_api_key

# Response with current database configuration
{
  "defaultInactiveTimeoutMinutes": 30,
  "defaultWarningTimeoutMinutes": 2, 
  "activeSessionCount": 3,
  "currentSessionInactiveTimeout": 30,
  "currentSessionWarningTimeout": 2
}
```

#### **User Management**
```bash
# Get current user info (validates session)
GET /api/auth/me
Authorization: Bearer your_session_token
X-API-Key: your_api_key

# User registration
POST /api/auth/register
Content-Type: application/json
X-API-Key: your_api_key

{
  "email": "new@example.com",
  "password": "secure_password",
  "displayName": "New User",
  "invitationToken": "optional_invite_token"
}

# Password reset request
POST /api/auth/forgot-password
Content-Type: application/json
X-API-Key: your_api_key

{
  "email": "user@example.com"
}

# Password reset with token
POST /api/auth/reset-password
Content-Type: application/json
X-API-Key: your_api_key

{
  "token": "reset_token_from_email",
  "newPassword": "new_secure_password"
}

# Logout (terminates session)
POST /api/auth/logout
Authorization: Bearer your_session_token
X-API-Key: your_api_key
```

### 🛡️ **Session Security Features**

#### **Authentication Middleware**
```typescript
// All protected endpoints use session validation
import { authenticateCredentials } from '../services/auth-service.js';

// Validates JWT token and updates activity
router.use('/protected-endpoint', authenticateCredentials);

// Permission-based access control
router.use('/admin-endpoint', authenticateCredentials, requirePermission('manager'));
```

#### **Session Security Measures**
- **bcrypt Password Hashing** - Salt rounds 12+ for secure password storage
- **JWT Secret Rotation** - Configurable JWT secret with strong entropy requirements
- **IP Address Logging** - Track session creation and activity by IP
- **User Agent Tracking** - Detect potential session hijacking attempts
- **Automatic Session Cleanup** - Expired sessions marked and cleaned automatically
- **Concurrent Session Limits** - Optional limits on simultaneous sessions per user

#### **Activity Tracking & Audit**
```sql
-- Example session activity queries
-- View active sessions
SELECT 
    s.id, s.user_id, s.created_at, s.last_activity_at,
    s.inactive_timeout_minutes, s.status,
    c.email, c.display_name
FROM user_sessions s
JOIN user_credentials c ON s.user_id = c.id 
WHERE s.status = 'active'
ORDER BY s.last_activity_at DESC;

-- Session activity audit
SELECT 
    sal.timestamp, sal.activity_type, sal.endpoint,
    sal.ip_address, c.email
FROM session_activity_log sal
JOIN user_credentials c ON sal.user_id = c.id
WHERE sal.session_id = 135
ORDER BY sal.timestamp DESC;

-- Session security analysis
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_logins,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT ip_address) as unique_ips
FROM user_sessions 
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### 🔧 **Session Configuration Examples**

#### **Development Configuration**
```bash
# Set 30-minute sessions for development
cd db && ./session-config.sh
# Choose option 2 (Development)

# Verify configuration
psql -d clinic_db -c "
SELECT column_default as timeout
FROM information_schema.columns 
WHERE table_name = 'user_sessions' 
AND column_name = 'inactive_timeout_minutes';
"
```

#### **Production Configuration**  
```bash
# Set 1-hour sessions for production
cd db && ./session-config.sh
# Choose option 3 (Production)

# Production environment variables
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
SESSION_TIMEOUT_MINUTES=60
SESSION_WARNING_MINUTES=5
```

#### **Custom Configuration**
```sql
-- Manual database configuration for custom timing
ALTER TABLE user_sessions 
ALTER COLUMN inactive_timeout_minutes SET DEFAULT 45,
ALTER COLUMN warning_timeout_minutes SET DEFAULT 3;

-- Update existing active sessions (optional)
UPDATE user_sessions 
SET 
  inactive_timeout_minutes = 45,
  warning_timeout_minutes = 3,
  expires_at = last_activity_at + INTERVAL '45 minutes'
WHERE status = 'active';
```

### 📊 **Session Monitoring & Analytics**

#### **Real-Time Session Monitoring**
```bash
# Monitor active sessions
curl -X GET "http://localhost:3000/api/auth/session-config" \
  -H "X-API-Key: your_api_key"

# Session activity logs
psql -d clinic_db -c "
SELECT 
    activity_type, COUNT(*) as count,
    DATE_TRUNC('hour', timestamp) as hour
FROM session_activity_log 
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY activity_type, hour
ORDER BY hour DESC, activity_type;
"
```

#### **Session Performance Metrics**
```sql
-- Average session duration
SELECT 
    AVG(EXTRACT(EPOCH FROM (terminated_at - created_at))/60) as avg_minutes
FROM user_sessions 
WHERE status = 'terminated' 
AND terminated_at >= CURRENT_DATE - INTERVAL '7 days';

-- Session termination reasons
SELECT 
    termination_reason, 
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM user_sessions 
WHERE terminated_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY termination_reason
ORDER BY count DESC;

-- Peak usage hours
SELECT 
    EXTRACT(HOUR FROM created_at) as hour,
    COUNT(*) as login_count
FROM user_sessions 
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY hour
ORDER BY hour;
```

### 🚀 **Production Deployment**

#### **Session Management Environment Variables**
```yaml
# env.yaml (for Google Cloud Run)
NODE_ENV: production
JWT_SECRET: your-production-jwt-secret-min-32-characters
SESSION_CLEANUP_INTERVAL: 3600000  # Clean expired sessions every hour
PASSWORD_SALT_ROUNDS: 12
EMAIL_VERIFICATION_REQUIRED: false
SESSION_MAX_CONCURRENT: 5  # Optional: limit concurrent sessions per user
```

#### **Database Migration for Session Management**
```bash
# Deploy session management schema to production
cd clinic-api/db

# Start Cloud SQL Proxy
./cloud_sql_proxy -instances=lv-notas:us-central1:clinic-db=tcp:5433

# Deploy session management tables
POSTGRES_HOST=localhost POSTGRES_PORT=5433 \
POSTGRES_USER=postgres POSTGRES_DB=clinic_db \
psql -f session_management_schema.sql

# Set production session timing (1 hour sessions)
POSTGRES_HOST=localhost POSTGRES_PORT=5433 \
POSTGRES_USER=postgres POSTGRES_DB=clinic_db \
./session-config.sh
# Choose option 3 (Production)
```

#### **Production Validation**
```bash
# Test session creation
curl -X POST "https://clinic-api-141687742631.us-central1.run.app/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_production_api_key" \
  -d '{"email":"test@example.com","password":"test123"}'

# Test session status (should return read-only timing)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-API-Key: your_production_api_key" \
  "https://clinic-api-141687742631.us-central1.run.app/api/auth/session-status"

# Verify session configuration
curl -H "X-API-Key: your_production_api_key" \
  "https://clinic-api-141687742631.us-central1.run.app/api/auth/session-config"
```

---

*The session management system provides enterprise-grade security with intelligent user experience - keeping users logged in while active, providing fair warning before timeout, and enabling seamless session extensions when needed.* 🔐⚡


### **Calendar-Only Development**
- **No database sync complexity** - Calendar changes don't break existing billing
- **Real-time testing** - Changes in Google Calendar immediately visible
- **Immutable billing** - Test corrections with void/delete/reprocess workflow
- **Professional workflow** - Monthly billing matches real therapy practices

## 🗺️ Development Roadmap

### ✅ **Completed Features (July 2025)**
- **Complete calendar-only session management** with read-only Google Calendar integration
- **Monthly billing period system** with immutable session snapshots
- **🧾 NFS-e electronic invoice integration** with provider-agnostic architecture
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