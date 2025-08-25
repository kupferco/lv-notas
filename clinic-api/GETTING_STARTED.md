# 🚀 Complete From-Scratch Setup Guide

This section covers setting up the entire development environment from a fresh machine (like after a computer wipe/reinstall).

## 📋 Prerequisites Checklist

Before starting, ensure you have:
- [ ] macOS with Homebrew installed
- [ ] Node.js v18.x+ installed
- [ ] Access to Google Cloud Console (lv-notas project)
- [ ] Access to ngrok dashboard account
- [ ] Git repository access

## 🔧 Step-by-Step Fresh Setup

### **Step 1: Install Core Dependencies**

```bash
# Install PostgreSQL
brew install postgresql@14

# Start PostgreSQL service
brew services start postgresql@14

# Verify PostgreSQL is running
brew services list | grep postgresql
# Should show: postgresql@14 started

# Install Google Cloud CLI
brew install google-cloud-sdk

# Install ngrok
brew install ngrok
```

### **Step 2: Authentication Setup**

#### **Google Cloud Authentication**
```bash
# Login to Google Cloud
gcloud auth login

# Set the correct project
gcloud config set project lv-notas

# Verify authentication
gcloud projects list
```

#### **ngrok Authentication**
```bash
# Go to https://dashboard.ngrok.com/get-started/your-authtoken
# Copy your auth token, then:
ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE

# Verify ngrok configuration
ngrok config check
# Should show: Valid configuration file at /Users/yourname/Library/Application Support/ngrok/ngrok.yml
```

### **Step 3: Project Setup**

```bash
# Clone the repository
git clone [your-repo-url]
cd clinic-api

# Install dependencies
npm install

# Create service account key file
# Go to Google Cloud Console > IAM & Admin > Service Accounts
# Find: "LV Notas Service Account" (lv-notas-service-account@lv-notas.iam.gserviceaccount.com)
# Click on it > Keys tab > Add Key > Create new key > JSON
# Download the file and save it as 'service-account-key.json' in project root
```

### **Step 4: Environment Configuration**

The project includes a script that loads secrets from Google Cloud:

```bash
# The start-local.sh script will create your .env file automatically
# It loads these secrets from Google Cloud Secret Manager:
# - SAFE_PROXY_KEY
# - GOOGLE_CALENDAR_ID  
# - AIRTABLE_API_KEY

# Your .env will be auto-generated with this structure:
# POSTGRES_USER=your_username
# POSTGRES_HOST=localhost
# POSTGRES_DB=clinic_db
# POSTGRES_PASSWORD=
# POSTGRES_PORT=5432
# NODE_ENV=development
# PORT=3000
# [+ secrets from Google Cloud]
```

### **Step 5: Database Setup**

```bash
# Create the database
createdb clinic_db

# Navigate to database management
cd db

# Install complete schema with comprehensive test data
./manage_db.sh fresh --env=local

# This will:
# ✅ Create fresh database 
# ✅ Install complete schema (all tables)
# ✅ Add comprehensive test data (23 patients, 239 sessions)
# ✅ Set up monthly billing system
# ✅ Configure authentication tables
# ✅ Add NFS-e integration tables
# ✅ Include banking integration

# Verify installation
./manage_db.sh check --env=local
```

### **Step 6: Start Development Server**

```bash
# Go back to project root
cd ..

# Start the full development server with webhook support
./scripts/start-local.sh

# This script will:
# ✅ Load secrets from Google Cloud
# ✅ Update .env file
# ✅ Start development server
# ✅ Create ngrok tunnel
# ✅ Set up webhook URL automatically

# You should see:
# 🔐 Loading secrets from Google Cloud Secret Manager...
# ✅ Secrets loaded and .env updated
# 🚀 Starting development server with webhook setup...
# Successfully connected to PostgreSQL
# 🌐 Server running on port 3000
# 🌐 ngrok tunnel created: https://xxxxx.ngrok-free.app
```

### **Step 7: Create Test User**

```bash
# List existing users
cd db
./manage_db.sh list-users --env=local

# The database comes with seed users, but you may want to create your own:
# Use the registration API endpoint or create directly via the app
```

## 🔍 Verification & Testing

### **Test Database Connection**
```bash
# Check database status
cd db
./manage_db.sh check --env=local

# Should show comprehensive data summary with:
# ✅ 2+ therapists
# ✅ 23+ patients  
# ✅ 239+ sessions
# ✅ Monthly billing tables
# ✅ Authentication system
# ✅ NFS-e integration
```

### **Test API Endpoints**
```bash
# Test basic API
curl http://localhost:3000/api/test
# Expected: {"message":"API is working"}

# Test authentication (requires valid session)
curl http://localhost:3000/api/auth/session-config \
  -H "X-API-Key: your_api_key"
```

### **Test Webhook Setup**
```bash
# Test webhook registration
curl -X POST http://localhost:3000/api/setup-webhook

# Check ngrok tunnel
curl https://your-ngrok-url.ngrok-free.app/api/test
```

## 🚨 Troubleshooting Common Issues

### **PostgreSQL Issues**
```bash
# If PostgreSQL won't start:
brew services restart postgresql@14

# If database doesn't exist:
createdb clinic_db

# If connection refused:
# Check POSTGRES_USER matches your system username
whoami  # This should match POSTGRES_USER in .env
```

### **ngrok Issues**
```bash
# If connection refused (127.0.0.1:4040):
# You need to authenticate ngrok:
ngrok config add-authtoken YOUR_TOKEN

# Verify authentication:
ngrok config check

# Check if using newer ngrok version (path changed):
# Old: ~/.ngrok2/ngrok.yml  
# New: ~/Library/Application Support/ngrok/ngrok.yml
```

### **Google Cloud Issues**
```bash
# If gcloud command not found:
brew install google-cloud-sdk

# If authentication fails:
gcloud auth login
gcloud config set project lv-notas

# If secrets fail to load:
# Ensure you have access to the lv-notas project
gcloud projects list | grep lv-notas
```

### **Service Account Issues**
```bash
# If service-account-key.json missing:
# 1. Go to Google Cloud Console
# 2. IAM & Admin > Service Accounts  
# 3. Find "LV Notas Service Account"
# 4. Keys tab > Add Key > Create new key (JSON)
# 5. Save as 'service-account-key.json' in project root

# Verify file exists:
ls -la service-account-key.json
```

### **User Authentication Issues**
```bash
# If login fails with "invalid user":
# The fresh database has seed data users, create a new account:
cd db
./manage_db.sh list-users --env=local

# Or use registration endpoint to create new user
```

## 🎯 Development Workflow

### **Daily Development**
```bash
# Start development (simple, no webhooks)
npm run dev:simple

# Start with full webhook support
./scripts/start-local.sh

# Database management
cd db
./manage_db.sh check --env=local          # Check status
./manage_db.sh backup "Description"       # Create backup
./manage_db.sh cleanup-user email@test.com  # Clean test data
```

### **Testing Fresh User Onboarding**
```bash
# Clean up test user data for fresh testing
cd db
./manage_db.sh cleanup-user your-test-email@example.com --env=local

# This removes all data for that user while keeping the schema intact
```

## 📦 What You Get

After completing this setup, your development environment includes:

### **📊 Database Features**
- ✅ **Complete clinic management schema** (patients, sessions, therapists)
- ✅ **Monthly billing system** with immutable session snapshots
- ✅ **Authentication system** with configurable session timeouts
- ✅ **NFS-e integration** for Brazilian electronic invoices
- ✅ **Banking integration** with Pluggy for payment tracking
- ✅ **Comprehensive test data** (23 patients, 239 sessions)

### **🚀 API Features**
- ✅ **Calendar-only session management** (read-only Google Calendar)
- ✅ **Monthly billing APIs** for professional practice management
- ✅ **Authentication endpoints** with JWT tokens
- ✅ **Webhook system** for real-time calendar updates
- ✅ **Multi-tenant support** for multiple therapists

### **🛠️ Development Tools**
- ✅ **Automated secret management** from Google Cloud
- ✅ **Database management scripts** with environment awareness
- ✅ **ngrok tunnels** for webhook testing
- ✅ **Hot reload development** with TypeScript support
- ✅ **Comprehensive backup system** with automatic safety

## 🎉 You're Ready!

Your development environment is now fully configured and ready for:
- ✅ API development and testing
- ✅ Database modifications and migrations  
- ✅ Webhook development and testing
- ✅ Authentication and session management
- ✅ Monthly billing workflow testing
- ✅ NFS-e integration development

**Next Steps:**
1. Create a test user account
2. Test API endpoints with authentication
3. Explore the monthly billing workflow
4. Test calendar integration with real Google Calendar events

---

*This guide covers everything learned from a complete fresh setup process. Keep it updated as the project evolves!* 🚀