# LV Notas Clinic API

A comprehensive Node.js/TypeScript REST API for managing therapy clinics with **complete session-level payment management**, **5-card revenue analytics**, **enhanced therapist onboarding**, and **complete Google Calendar integration**.

## 🚀 Latest Features (June 2025)

### 💰 **Complete Session-Level Payment Management System**
- **📊 Session-Level Status Updates** - Individual session payment status management via API
- **🔍 Advanced Payment API** - Filtering by patient, status, date range with real-time calculations
- **📈 5-Card Revenue Breakdown** - Complete analytics: Total, Pago, Não Cobrado, Aguardando, Pendente
- **🎯 Smart Patient Status Priority** - Automatic patient status calculation based on session priorities
- **💳 Payment Transaction History** - Track actual payments with dates, methods, and reference numbers
- **📝 Payment Request Tracking** - Log when payment requests are sent to patients
- **🏦 Multiple Payment Methods** - Support for PIX, bank transfer, cash, credit card
- **🇧🇷 Brazilian Payment Support** - Currency formatting, phone numbers, payment terminology

### ✨ **Enhanced Therapist Onboarding System**
- **📅 Calendar Import Wizard** - Import existing appointments from therapist's calendar
- **👥 Bulk Patient Creation** - Smart patient matching from calendar events
- **🔗 Appointment Linking** - Connect imported events to patient records
- **🔄 Recurring Session Detection** - Identify and manage repeating appointments
- **📊 Dual Date System** - Separate historical therapy start from LV Notas billing start dates
- **💰 Advanced Billing Management** - Complete billing cycle history with patient-level overrides

### 🎯 **Session-Level Payment Priority System**
- **Payment Status Hierarchy** - Pendente > Aguardando > Não Cobrado priority system
- **Smart Patient Status Calculation** - Patient status reflects highest priority session status
- **Real-time Status Updates** - Individual session status changes via PUT /api/payments/status
- **Session Status Counts** - Automatic calculation of status breakdown per patient
- **Database-Driven Logic** - All priority calculations handled at the database level

### 💰 **5-Card Revenue Analytics System**
- **Complete Revenue Breakdown** - Total, Pago, Não Cobrado, Aguardando, Pendente
- **Real-time Calculations** - Revenue totals calculated from session-level data
- **Filter-Responsive Analytics** - Summary updates based on date/patient/status filters
- **Session Count Estimates** - Estimated session counts per payment status
- **Multi-tenant Revenue Tracking** - Isolated analytics per therapist

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
- **Perfect for testing** all payment filtering combinations and session-level status changes

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
- **patients** - **Session status counts**, recurring patterns, pricing overrides
- **sessions** - **payment_status**, **payment_requested** columns for session-level tracking
- **calendar_events**, **check_ins**, **calendar_webhooks** - Existing functionality

### **Payment Tracking Tables (Enhanced)**
- **payment_transactions** - Records of actual payments received with dates, methods, amounts, reference numbers
- **payment_requests** - Log of payment communications sent to patients with WhatsApp tracking
- **payment_status_history** - Complete audit trail of all payment status changes with reasons

### **Onboarding Tables (New)**
- **therapist_onboarding** - Step-by-step progress tracking
- **imported_calendar_events** - Calendar import with smart matching
- **patient_matching_candidates** - AI-powered patient detection
- **recurring_session_templates** - Pattern detection from history

### **Smart Views (Enhanced)**
- **payment_overview** - **Session-level payment status** with calculated patient states
- **billable_sessions** - Automatically calculates which sessions count for billing
- **current_billing_settings** - Current billing configuration for all patients
- **therapist_onboarding_progress** - Real-time onboarding status

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

### **Session-Level Payment Status Updates**
```sql
-- Update individual session payment status
UPDATE sessions 
SET payment_status = 'paid' 
WHERE id = 123;

-- Update session to payment requested
UPDATE sessions 
SET payment_requested = true, 
    payment_request_date = CURRENT_TIMESTAMP,
    payment_status = 'aguardando_pagamento'
WHERE id = 123;
```

### **5-Card Revenue Analytics**
```sql
-- Get complete revenue breakdown
SELECT 
  COALESCE(SUM(session_price), 0) as total_revenue,
  COALESCE(SUM(session_price) FILTER (WHERE payment_status = 'paid'), 0) as paid_revenue,
  COALESCE(SUM(session_price) FILTER (WHERE payment_status = 'pending'), 0) as nao_cobrado_revenue,
  COALESCE(SUM(session_price) FILTER (WHERE payment_status = 'aguardando_pagamento'), 0) as aguardando_revenue,
  COALESCE(SUM(session_price) FILTER (WHERE payment_status = 'pendente'), 0) as pendente_revenue
FROM payment_overview
WHERE therapist_email = 'dnkupfer@gmail.com';
```

### **Patient Status Priority Calculation**
```sql
-- Get patient status with session counts
SELECT 
  patient_id,
  patient_name,
  COUNT(*) FILTER (WHERE payment_status = 'pendente') as pendente_sessions,
  COUNT(*) FILTER (WHERE payment_status = 'aguardando_pagamento') as aguardando_sessions,
  COUNT(*) FILTER (WHERE payment_status = 'pending') as nao_cobrado_sessions,
  COUNT(*) FILTER (WHERE payment_status = 'paid') as paid_sessions
FROM payment_overview
WHERE therapist_email = 'dnkupfer@gmail.com'
GROUP BY patient_id, patient_name;
```

## API Endpoints

### **Payment Management (Enhanced)**
- `GET /api/payments/summary?therapistEmail=&startDate=&endDate=` - **5-card revenue breakdown** with filtering
- `GET /api/payments/patients?therapistEmail=&startDate=&endDate=&status=` - Patient payment summaries **with session status counts**
- `GET /api/payments/sessions?therapistEmail=&startDate=&endDate=&status=` - Session payment details for **individual status management**
- `PUT /api/payments/status` - **Update individual session payment status** (NEW!)
- `POST /api/payments/request` - Send payment request (creates payment_requests record, updates sessions)

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
- 🎯 Session-level payment status validation
- 💳 Payment data verification with session counts

### **Payment Testing Workflow**
```bash
# Set up comprehensive payment test data
./db/manage_db.sh comprehensive

# This creates:
# - 20 patients with diverse pricing
#