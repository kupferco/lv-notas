# Clinic API

A Node.js/TypeScript REST API for managing a therapy clinic's sessions and check-ins, with Google Calendar integration.

## Prerequisites

- Node.js v18.x
- PostgreSQL 14.x
- Google Calendar API credentials (service-account-key.json)
- Firebase Admin credentials (service-account-key.json)

## Environment Setup

Create a .env file in the root directory:

```bash
AIRTABLE_API_KEY=secret_key_airtable
SAFE_PROXY_KEY=secret_key_api
ALLOWED_ORIGINS=https://endpoint-goes-here

# Database
POSTGRES_USER=user
POSTGRES_HOST=localhost
POSTGRES_DB=clinic_db
POSTGRES_PASSWORD=postgres_secret
POSTGRES_PORT=port

# Keep other variables as needed
NODE_ENV=development
PORT=3000

# Google Calendar ID
GOOGLE_CALENDAR_ID=g_calendar_id
WEBHOOK_URL_LIVE=google_cloud_run_url
WEBHOOK_URL_LOCAL=ngrok_url
```

## Installation

```bash
# Install dependencies
npm install

# Install global dependencies
npm install -g typescript ts-node-esm
```

## Database Setup

1. Create the database:
```bash
createdb clinic_db
```

2. Create database schema:
```bash
psql -h localhost -U your_postgres_user clinic_db < db/001_initial_schema.sql
```

3. Seed test data:
```bash
psql -h localhost -U your_postgres_user clinic_db < db/seed/001_insert_basic_data.sql
```

## Development

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Google Cloud SQL Management

The project includes convenient scripts to manage your Google Cloud SQL instance and save costs:

```bash
# Start the Cloud SQL instance
npm run db:start

# Stop the Cloud SQL instance (to avoid unnecessary charges)
npm run db:stop

# Check the current status of the Cloud SQL instance
npm run db:status
```

When not actively developing or using the application, it's recommended to stop the CloudSQL instance using `npm run db:stop` to minimize costs. This will keep your data stored but stop charging for compute resources. You'll only pay for storage (typically a few pennies per day instead of pounds).

## Development Webhook

During development, the project includes a convenient script to create a temporary public webhook URL using ngrok:

```bash
# Start development server with ngrok tunnel
npm run dev:webhook
```

This script does the following:
- Starts the development server
- Creates a secure ngrok tunnel to localhost
- Automatically updates the .env file with the new webhook URL
- Manages port conflicts

### Features
- Generates a temporary public URL for your local server
- Useful for testing webhooks and external integrations
- Automatically handles port conflicts
- Easy to use with a single command

### Requirements
- Ngrok account (optional, but recommended for best experience)
- Ngrok authtoken (can be set in your ngrok configuration)

### Cleaning Up Webhooks
If you need to clean up all existing Google Calendar webhooks, you can use the provided cleanup script:

```bash
# Run the webhook cleanup script
npx tsx scripts/cleanup-webhooks.ts
```

This script will:

1. Find all existing webhooks
2. Stop them on Google Calendar's side
3. Clean up related database records

This is useful when:

1. Debugging webhook issues
2. Switching between environments
3. Resolving duplicate event notifications

## Database Commands

Quick check of therapists and patients:
```bash
psql -h localhost -U your_postgres_user clinic_db < db/seed/check_data.sql
```

Check current data in tables:
```bash
# View therapists
psql -h localhost -U your_postgres_user clinic_db -c 'SELECT * FROM therapists;'

# View patients
psql -h localhost -U your_postgres_user clinic_db -c 'SELECT * FROM patients;'

# View sessions
psql -h localhost -U your_postgres_user clinic_db -c 'SELECT * FROM sessions;'
```

## Database Management Script

A convenient script is provided to manage database operations:

```bash
# Make the script executable (first time only)
chmod +x db/manage.sh

# View usage instructions
./db/manage.sh

# Create schema
./db/manage.sh schema

# Seed test data
./db/manage.sh seed

# Check current data
./db/manage.sh check

# Run all operations
./db/manage.sh all
```

## Google Cloud Deployment

### Setup Google Cloud Project

```bash
# Set the project
gcloud config set project lv-notas

# Enable Secret Manager API
gcloud services enable secretmanager.googleapis.com

# Create secrets
gcloud secrets create safe-proxy-key --replication-policy="automatic"
gcloud secrets create postgres-password --replication-policy="automatic"
gcloud secrets create firebase-key --replication-policy="automatic"
gcloud secrets create google-calendar-id --replication-policy="automatic"

# Add secret values
echo -n "your_proxy_api_key" | gcloud secrets versions add safe-proxy-key --data-file=-
echo -n "your_postgres_password" | gcloud secrets versions add postgres-password --data-file=-
echo -n "your_calendar_id" | gcloud secrets versions add google-calendar-id --data-file=-

# Upload Firebase service account key
gcloud secrets create firebase-service-account --data-file=./service-account-key.json
```

### Set IAM Permissions

```bash
gcloud projects add-iam-policy-binding lv-notas \
    --member=serviceAccount:141687742631-compute@developer.gserviceaccount.com \
    --role=roles/secretmanager.secretAccessor
```

### Deploy to Google Cloud Run

1. The command below will be typescript and run the deploy script.

```bash
npm run deploy
```

2. The command above is the same as doing all this other manually

1. Build the typescript
```bash
npm run build
```

2. Build and push Docker image:
```bash
docker build -t clinic-api .
docker tag clinic-api gcr.io/lv-notas/clinic-api
docker push gcr.io/lv-notas/clinic-api
```

3. Deploy to Cloud Run:
```bash
gcloud run deploy clinic-api \
  --image gcr.io/lv-notas/clinic-api \
  --platform managed \
  --region us-central1 \
  --set-secrets=SAFE_PROXY_KEY=safe-proxy-key:latest,POSTGRES_PASSWORD=postgres-password:latest \
  --env-vars-file env.yaml \
  --add-cloudsql-instances lv-notas:us-central1:clinic-db \
  --service-account lv-notas-service-account@lv-notas.iam.gserviceaccount.com
```

### Database Setup in Cloud SQL

1. Create Cloud SQL instance:
```bash
gcloud sql instances create clinic-db \
  --database-version=POSTGRES_14 \
  --cpu=1 \
  --memory=3840MB \
  --region=us-central1 \
  --root-password=[YOUR-PASSWORD]
```

2. Create database:
```bash
gcloud sql databases create clinic_db --instance=clinic-db
```

3. Connect to database through Cloud SQL proxy:

```bash
# First, ensure you have authentication set up
gcloud auth application-default login

# Start the Cloud SQL proxy (keep this running in a separate terminal)
cloud-sql-proxy lv-notas:us-central1:clinic-db --port 5433

# In a new terminal, connect via psql
psql -h localhost -p 5433 -U postgres -d postgres

# Create and connect to the database
CREATE DATABASE clinic_db;
\c clinic_db

# Run the schema from 001_initial_schema.sql
# You can copy and paste the contents of the file here

# After setup, you can reconnect directly to clinic_db using:
psql -h localhost -p 5433 -U postgres -d clinic_db
```

Note: If port 5433 is in use, you can use a different port number. Just make sure to use the same port in your connection commands.

### Security Considerations
* All sensitive data is stored in Google Cloud Secret Manager
* Firebase Authentication is required for accessing endpoints
* Database credentials are managed securely
* Service account keys are stored as secrets
* Environment-specific configurations are used
* Regular secret rotation is recommended

## API Endpoints

### Check-in Management
- POST /api/checkin - Register a patient check-in for a session

### Calendar Integration
- POST /api/calendar-webhook - Webhook endpoint for Google Calendar events
  - Automatically syncs calendar events with sessions
  - Handles new sessions, updates, and cancellations
  - Matches events by Google Calendar event ID

### Authentication
- GET /api/proxy - Test authenticated connection
- GET /api/key - Get API key (requires authentication)

## Authentication

The API uses Firebase Authentication. Requests need to include:
- X-API-Key header with SAFE_PROXY_KEY
- Authorization header with Firebase token

## Calendar Integration

The system maintains synchronization between Google Calendar events and the sessions database:

1. Calendar Event Handling:
   - New events create corresponding session records
   - Updated events modify existing session details
   - Cancelled events mark sessions as cancelled

2. Event Matching:
   - Sessions are matched to calendar events using the Google Calendar event ID
   - Therapists are identified by their calendar ID
   - Patients are matched by their email address

3. Session Status:
   - New events: status = 'agendada'
   - Cancelled events: status = 'cancelada'
   - Check-ins: status = 'compareceu'

## Project Structure

- `/src` - Source code
  - `/config` - Configuration files
  - `/routes` - API routes
    - `checkin.ts` - Check-in endpoint
    - `calendar-webhook.ts` - Calendar webhook handler
  - `/services` - Business logic
    - `google-calendar.ts` - Google Calendar service
    - `session-sync.ts` - Session synchronization logic
  - `/types` - TypeScript interfaces
    - `calendar.ts` - Calendar-related types
- `/db` - Database scripts and migrations
  - `/seed` - Test data scripts