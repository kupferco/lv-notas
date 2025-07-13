# LV Notas Clinic API

A comprehensive Node.js/TypeScript REST API for managing therapy clinics with **complete session-level payment management**, **WhatsApp payment automation**, **dual-mode system support**, **Brazilian phone number integration**, and **complete Google Calendar integration**.

## 🚀 Latest Features (June 2025)

### 📱 **WhatsApp Payment Integration (NEW!)**
- **🇧🇷 Brazilian Phone Number Support** - Proper formatting with +55 country code
- **📞 Patient Phone Storage** - Enhanced patient records with telefone field
- **💬 WhatsApp-Ready API** - Patient endpoints include phone numbers for frontend automation
- **🔗 Message Template Support** - Backend provides structured data for professional WhatsApp messages
- **📊 Payment Request Tracking** - Enhanced payment_requests table with WhatsApp delivery status

### 🎯 **Dual-Mode System Backend Support (NEW!)**
- **🔄 Mode-Agnostic API** - Same endpoints work for both Simple and Advanced frontend modes
- **📊 Flexible Status Filtering** - API handles both simplified and granular status filtering
- **💰 Smart Status Mapping** - Backend maintains granular data while supporting simplified frontend views
- **🎨 Frontend-Adaptive Responses** - API structure supports both Card and List view requirements

### 💰 **Enhanced Session-Level Payment Management**
- **📊 Individual Session Status Updates** - PUT /api/payments/status for granular control
- **🔍 Advanced Payment Filtering** - Filter by patient, status, date range with real-time calculations
- **📈 5-Card Revenue Analytics** - Complete breakdown: Total, Pago, Não Cobrado, Aguardando, Pendente
- **🎯 Smart Patient Status Priority** - Automatic patient status calculation based on session priorities
- **💳 Payment Transaction History** - Track actual payments with dates, methods, and reference numbers
- **📝 Payment Request Tracking** - Log when payment requests are sent to patients with WhatsApp support

### ✨ **Enhanced Therapist & Patient Management**
- **📅 Calendar Import Wizard** - Import existing appointments from therapist's calendar
- **👥 Bulk Patient Creation** - Smart patient matching from calendar events with phone numbers
- **🔗 Appointment Linking** - Connect imported events to patient records
- **💰 Advanced Billing Management** - Complete billing cycle history with patient-level overrides
- **📞 Phone Number Integration** - Full Brazilian phone number support throughout API

## Prerequisites

- Node.js v18.x+
- PostgreSQL 14.x+
- Google Calendar API credentials (service-account-key.json)
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

# Google Calendar Integration
GOOGLE_CALENDAR_ID=your_calendar_id
WEBHOOK_URL=your_webhook_url  # Set automatically by dev script

# Firebase Authentication
FIREBASE_PROJECT_ID=your_project_id

# Development
NODE_ENV=development
PORT=3000
```

## 🗄️ Database Management

### **Local Development Database**

#### **Quick Start**
```bash
cd clinic-api/db

# Complete fresh start with comprehensive payment data including phone numbers
./manage_db.sh fresh-comprehensive

# Add realistic payment test data with WhatsApp-ready phone numbers
./manage_db.sh comprehensive

# Verify everything is working
./manage_db.sh check
```

#### **User-Specific Cleanup (NEW!)**
```bash
# Clean up specific user data (keeps database structure)
./manage_db.sh cleanup-user your-email@example.com

# Clean up user data (interactive - will prompt for email)
./manage_db.sh cleanup-user

# Perfect for development workflows - test onboarding repeatedly
```

#### **Complete Database Operations**
```bash
# Fresh database operations
./manage_db.sh fresh                    # Basic fresh start
./manage_db.sh fresh-comprehensive      # Fresh start + comprehensive test data

# Reset operations (same as fresh but more explicit)
./manage_db.sh reset                    # Reset + basic test data
./manage_db.sh reset-comprehensive      # Reset + comprehensive test data

# Schema and data operations
./manage_db.sh schema                   # Install/update schema only
./manage_db.sh seed                     # Add basic test data
./manage_db.sh comprehensive            # Add comprehensive test data

# Utility operations
./manage_db.sh check                    # Verify schema and show data summary
./manage_db.sh backup                   # Create database backup
```

### **🚀 Production Database Deployment**

#### **Prerequisites for Production**
```bash
# Install Google Cloud SQL Proxy (macOS)
curl -o cloud_sql_proxy https://dl.google.com/cloudsql/cloud_sql_proxy.darwin.amd64
chmod +x cloud_sql_proxy

# For Linux
curl -o cloud_sql_proxy https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64
chmod +x cloud_sql_proxy

# Ensure you're authenticated with Google Cloud
gcloud auth login
gcloud config set project lv-notas
```

#### **Step-by-Step Production Deployment**

**1. Start Cloud SQL Proxy**
```bash
# From the db/ directory
./cloud_sql_proxy -instances=lv-notas:us-central1:clinic-db=tcp:5433
# Keep this running in a separate terminal
```

**2. Deploy Schema Changes to Production**
```bash
# In a new terminal, from the db/ directory
POSTGRES_HOST=localhost POSTGRES_PORT=5433 POSTGRES_USER=postgres POSTGRES_DB=clinic_db ./run_schemas.sh
# Enter your production postgres password when prompted
```

**3. Verify Production Database**
```bash
# Connect to production database
psql -h localhost -p 5433 -U postgres -d clinic_db

# Check tables
\dt

# Exit when done
\q
```

#### **Production Database Utilities**

**Get Production Database Password**
```bash
# Retrieve password from Google Secret Manager
gcloud secrets versions access latest --secret="postgres-password"
```

**Production Database Backup**
```bash
# Create backup of production database
pg_dump -h localhost -p 5433 -U postgres -d clinic_db > production_backup_$(date +%Y%m%d_%H%M%S).sql
```

**Connect to Production Database**
```bash
# Manual connection for debugging
psql -h localhost -p 5433 -U postgres -d clinic_db
```

#### **⚠️ Production Safety Notes**

- **Schema Deployment**: The `run_schemas.sh` script recreates all tables and will **lose existing data**
- **Backup First**: Always create a backup before schema changes: `pg_dump -h localhost -p 5433 -U postgres -d clinic_db > backup.sql`
- **Test Locally**: Always test schema changes locally before deploying to production
- **Proxy Required**: You must have the Cloud SQL Proxy running to connect to production
- **Authentication**: Ensure you're authenticated with Google Cloud CLI

#### **Complete Production Deployment Workflow**
```bash
# 1. Test schema changes locally
cd clinic-api/db
./manage_db.sh fresh-comprehensive
./manage_db.sh check

# 2. Backup production database
./cloud_sql_proxy -instances=lv-notas:us-central1:clinic-db=tcp:5433 &
pg_dump -h localhost -p 5433 -U postgres -d clinic_db > production_backup_$(date +%Y%m%d_%H%M%S).sql

# 3. Deploy schema to production
POSTGRES_HOST=localhost POSTGRES_PORT=5433 POSTGRES_USER=postgres POSTGRES_DB=clinic_db ./run_schemas.sh

# 4. Deploy backend API
cd ..
./deploy.sh

# 5. Verify everything works
curl https://clinic-api-141687742631.us-central1.run.app/api/test
```

### **What You Get with Comprehensive Data**
- **20 diverse patients** with varying pricing (R$ 120-250) **and Brazilian phone numbers**
- **200+ sessions** spanning 6 months with realistic payment patterns
- **Multiple payment scenarios** - paid, pending, overdue, partial payments
- **WhatsApp-ready data** - All patients have properly formatted Brazilian phone numbers
- **Payment request tracking** with different dates and statuses
- **Complete payment transaction history** with various payment methods
- **Perfect for testing** dual-mode system and WhatsApp integration

### **Development Workflows**

#### **🔄 Quick User Reset (Development)**
```bash
# Clean your test user and start fresh onboarding
./manage_db.sh cleanup-user dnkupfer@gmail.com
# Then test the onboarding process again
```

#### **🚀 Complete Fresh Start**
```bash
# Nuclear option - completely fresh database with realistic data
./manage_db.sh fresh-comprehensive
```

#### **📊 Data Verification**
```bash
# Check database health and data integrity
./manage_db.sh check
```

### **Available Commands Reference**

| Command | Description | Use Case |
|---------|-------------|----------|
| `fresh` | 🗑️ Create completely fresh database | Complete clean slate |
| `fresh-comprehensive` | 🚀 Fresh database + comprehensive data | Full realistic testing setup |
| `schema` | 📋 Install/update schema only | Schema updates |
| `seed` | 🌱 Add basic test data | Quick development data |
| `comprehensive` | 🚀 Add comprehensive payment test data | Realistic testing scenarios |
| `check` | 🔍 Verify schema and show data summary | Health check |
| `reset` | 🔄 Fresh database + basic test data | Development reset |
| `reset-comprehensive` | 🔄 Fresh database + comprehensive data | Full development reset |
| `cleanup-user [email]` | 🧹 Remove all data for specific user | **User-specific cleanup** |
| `backup` | 💾 Create database backup | Data backup |

### **Database Safety Features**
- ✅ **Interactive confirmations** for destructive operations
- ✅ **Email validation** for user cleanup operations  
- ✅ **Data preview** before deletion
- ✅ **Graceful error handling** with clear messages
- ✅ **Backup creation** for data protection

## Development

```bash
# Start development server with automatic webhook setup
npm run dev

# Simple development server (no webhook management)
npm run dev:simple

# Build for production
npm run build

# Start production server
npm start
```

## 🎯 Enhanced Database Schema

### **Core Tables (Enhanced with Phone Support)**
- **therapists** - Enhanced with billing cycles, onboarding tracking
- **patients** - **telefone field added**, session status counts, recurring patterns, pricing overrides
- **sessions** - **payment_status**, **payment_requested** columns for session-level tracking
- **calendar_events**, **check_ins**, **calendar_webhooks** - Existing functionality

### **Payment Tracking Tables (WhatsApp Enhanced)**
- **payment_transactions** - Records of actual payments with dates, methods, amounts, reference numbers
- **payment_requests** - **WhatsApp delivery tracking**, payment communications log with phone numbers
- **payment_status_history** - Complete audit trail of all payment status changes with reasons

### **Smart Views (Phone Number Enhanced)**
- **payment_overview** - **Includes patient phone numbers** for WhatsApp integration
- **billable_sessions** - Automatically calculates which sessions count for billing
- **current_billing_settings** - Current billing configuration for all patients
- **therapist_onboarding_progress** - Real-time onboarding status

### **WhatsApp Integration Schema**
```sql
-- Enhanced patients table with phone support
ALTER TABLE patients ADD COLUMN telefone VARCHAR(20);

-- Enhanced payment_requests with WhatsApp tracking  
ALTER TABLE payment_requests ADD COLUMN whatsapp_sent BOOLEAN DEFAULT false;
ALTER TABLE payment_requests ADD COLUMN whatsapp_message TEXT;
ALTER TABLE payment_requests ADD COLUMN whatsapp_delivery_date TIMESTAMP;
```

## 💰 Payment System API Examples

### **Session-Level Payment Status Updates (Enhanced)**
```bash
# Update individual session payment status
curl -X PUT /api/payments/status \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "sessionId": 123,
    "newStatus": "paid",
    "therapistEmail": "therapist@example.com"
  }'
```

### **Patient Payment Data with Phone Numbers (NEW!)**
```bash
# Get patient payment summaries including phone numbers
curl -X GET "/api/payments/patients?therapistEmail=therapist@example.com" \
  -H "X-API-Key: your_api_key"

# Response includes telefone field:
{
  "patient_id": 1,
  "patient_name": "Ana Carolina Ferreira", 
  "telefone": "5511999887766",  # NEW: WhatsApp-ready phone number
  "total_amount": 600.00,
  "pending_amount": 200.00,
  ...
}
```

### **5-Card Revenue Analytics (Dual-Mode Support)**
```sql
-- Get complete revenue breakdown supporting both Simple and Advanced modes
SELECT 
  COALESCE(SUM(session_price), 0) as total_revenue,
  COALESCE(SUM(session_price) FILTER (WHERE payment_status = 'paid'), 0) as paid_revenue,
  COALESCE(SUM(session_price) FILTER (WHERE payment_status = 'pending'), 0) as nao_cobrado_revenue,
  COALESCE(SUM(session_price) FILTER (WHERE payment_status = 'aguardando_pagamento'), 0) as aguardando_revenue,
  COALESCE(SUM(session_price) FILTER (WHERE payment_status = 'pendente'), 0) as pendente_revenue
FROM payment_overview
WHERE therapist_email = 'therapist@example.com';
```

### **WhatsApp Integration Examples (NEW!)**
```bash
# Send payment request (creates payment_requests record with WhatsApp data)
curl -X POST /api/payments/request \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "patientId": 1,
    "sessionIds": [123, 124, 125],
    "amount": 540.00,
    "whatsappMessage": "Olá Ana! Sua cobrança está disponível..."
  }'

# Response includes WhatsApp-ready data:
{
  "success": true,
  "patient_id": 1,
  "total_amount": 540.00,
  "whatsapp_phone": "5511999887766",
  "whatsapp_message": "Olá Ana! Sua cobrança está disponível...",
  "request_date": "2025-06-29T10:53:00Z"
}
```

## API Endpoints

### **Payment Management (WhatsApp Enhanced)**
- `GET /api/payments/summary?therapistEmail=&startDate=&endDate=` - **5-card revenue breakdown** with dual-mode support
- `GET /api/payments/patients?therapistEmail=&startDate=&endDate=&status=` - Patient summaries **with phone numbers** for WhatsApp
- `GET /api/payments/sessions?therapistEmail=&startDate=&endDate=&status=` - Session details for **individual status management**
- `PUT /api/payments/status` - **Update individual session payment status** (supports dual-mode frontend)
- `POST /api/payments/request` - Send payment request (**creates WhatsApp-ready data**)

### **Enhanced Patient Management (NEW!)**
- `GET /api/patients?therapistEmail=` - **Includes telefone field** for WhatsApp integration
- `POST /api/patients` - Create patient **with phone number support**
- `PUT /api/patients/:id` - Update patient **including phone number**
- `GET /api/patients/full?therapistEmail=` - Complete patient data with phone numbers

### **Session & Calendar Management (Enhanced)**
- `POST /api/checkin` - Patient check-in with enhanced session tracking
- `POST /api/calendar-webhook` - Bidirectional calendar sync
- `GET /api/sessions?therapistEmail=` - Enhanced with billing integration and payment tracking
- `GET /api/therapists` - Enhanced with onboarding status

### **WhatsApp Integration Endpoints (NEW!)**
```bash
# Get WhatsApp-ready patient data
GET /api/patients/:id/whatsapp-data
# Response: { phone: "5511999887766", formatted_phone: "+55 11 99988-7766" }

# Log WhatsApp message delivery
POST /api/payments/whatsapp-delivery
# Body: { patient_id, message_type, delivery_status, delivery_date }
```

## Development Workflow

### **WhatsApp Integration Testing**
```bash
# Set up comprehensive data with phone numbers
./db/manage_db.sh reset-comprehensive

# Test API endpoints with phone number support
curl -X GET "/api/payments/patients?therapistEmail=test@example.com" | jq '.[] | {name: .patient_name, phone: .telefone}'

# Verify phone number formatting
./db/manage_db.sh check  # Shows phone number statistics
```

### **Dual-Mode System Testing**
```bash
# The same API works for both Simple and Advanced frontend modes

# Advanced mode frontend call (4 statuses)
GET /api/payments/sessions?status=aguardando_pagamento

# Simple mode frontend call (consolidated to "pending")  
GET /api/payments/sessions?status=todos
# Frontend maps: ["pending", "aguardando_pagamento", "pendente"] -> "pending"
```

### **Database Verification**
The `check` command provides comprehensive verification including:
- ✅ **Phone number validation** - Brazilian format verification
- ✅ **WhatsApp readiness** - Patient phone number coverage
- 📊 **Payment data integrity** with session-level status validation
- 🎯 **Dual-mode compatibility** - Data structure supports both frontend modes
- 💰 **Revenue calculation accuracy** - 5-card breakdown verification

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

## 🔐 Security Features

### **Enhanced Security for WhatsApp Integration**
- **Phone Number Encryption** - Patient phone numbers securely stored
- **WhatsApp Privacy** - No message content logged, only delivery confirmation  
- **Brazilian Data Protection** - LGPD-compliant phone number handling
- **Multi-tenant Phone Isolation** - Each therapist sees only their patients' phones
- **API Rate Limiting** - Prevents WhatsApp spam and abuse

### **Existing Security**
- **Firebase Authentication** with Google Sign-In verification
- **Multi-tenant data isolation** - Each therapist sees only their data
- **API key validation** for all requests
- **Payment data encryption** for sensitive financial information
- **Complete audit trails** for all payment transactions and status changes
- **CORS protection** with proper method support

## 🌍 Brazilian Localization & Compliance

### **Enhanced Brazilian Support**
- **📱 Phone Number Standards** - Proper +55 country code and area code formatting
- **🇧🇷 WhatsApp Business Culture** - Message templates adapted for Brazilian business communication
- **💰 Brazilian Payment Methods** - PIX, bank transfer, cash, credit card support
- **🏦 Currency Formatting** - R$ with comma decimals throughout API responses
- **⏰ São Paulo Timezone** - Proper timezone handling for sessions and payments
- **📋 LGPD Compliance** - Brazilian data protection law compliance for patient phone numbers

## 🧪 Testing & Development

### **Comprehensive Test Data (WhatsApp Enhanced)**
- **20 diverse patients** with Brazilian phone numbers (11 99999-XXXX format)
- **200+ sessions** spanning 6 months with realistic payment patterns
- **WhatsApp-ready scenarios** - All patients have valid phone numbers for testing
- **Multiple payment test cases** - Perfect for testing both Simple and Advanced frontend modes
- **Phone number validation** - Covers different Brazilian phone formats

### **Development Features**
- **WhatsApp integration testing** - Real phone numbers for message testing
- **Dual-mode API compatibility** - Same endpoints work for both frontend modes
- **Hot reload** - Changes reflect immediately
- **Real authentication** - No mock data or bypasses
- **Enhanced logging** - Detailed console output including phone number operations

### Currency Handling
- **Database storage**: Values stored in cents (30000 = R$ 300,00) for precision
- **API responses**: Automatically converted to currency format (300.00) 
- **Frontend display**: Direct formatting from API responses with Brazilian standards (R$ 300,00)

## 🗺️ Development Roadmap

### ✅ **Completed Features (June 2025)**
- **Complete WhatsApp integration** with Brazilian phone number support
- **Dual-mode system backend** supporting both Simple and Advanced frontend modes
- **Enhanced patient management** with phone number storage and validation
- **Session-level payment status** with WhatsApp-ready data structures
- **5-card revenue analytics** with real-time calculations
- **Complete bidirectional Google Calendar sync**
- **Brazilian localization** including phone number standards

### 🚀 **Phase 2: Advanced WhatsApp Features**
**Goal**: Professional WhatsApp Business integration

**Planned Features:**
- **WhatsApp Business API** - Official WhatsApp Business account integration
- **Automated Message Delivery** - Scheduled payment reminders and confirmations
- **Message Template Management** - Custom message templates per therapist
- **Delivery Status Tracking** - Read receipts and response tracking
- **Bulk WhatsApp Operations** - Send payment requests to multiple patients
- **WhatsApp Analytics** - Message delivery rates and response analytics

### 🎯 **Phase 3: Brazilian Payment Integration**
**Goal**: Complete Brazilian business automation

**Future Features:**
- **PIX Integration** - Real-time PIX payment monitoring and QR code generation
- **Nota Fiscal Automation** - Automatic tax invoice generation for Brazilian compliance
- **Banking Integration** - Direct integration with Brazilian banks for payment confirmation
- **Payment Link Generation** - Secure payment links via WhatsApp
- **LGPD Advanced Compliance** - Enhanced data protection and privacy controls

### 🔧 **Technical Improvements**
- **Performance Optimization** - Database indexing for phone number queries
- **Enhanced Security** - Phone number encryption and secure WhatsApp integration
- **API Rate Limiting** - Advanced rate limiting for WhatsApp operations
- **Testing Coverage** - Comprehensive unit and integration testing for WhatsApp features
- **Monitoring & Analytics** - Advanced logging and monitoring for WhatsApp operations

## 📄 License

This project is proprietary software for LV Notas therapy practice management.

---

**Built with ❤️ for modern Brazilian therapy practice management**

*Now featuring complete WhatsApp integration with Brazilian phone number support and dual-mode system compatibility for the ultimate therapy practice API!* 🚀📱💰