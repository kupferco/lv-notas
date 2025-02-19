# Clinic API

A Node.js/TypeScript REST API for managing a therapy clinic's sessions and check-ins, with Google Calendar integration.

## Prerequisites

- Node.js v18.x
- PostgreSQL 14.x
- Google Calendar API credentials (service-account-key.json)
- Firebase Admin credentials (service-account-key.json)

## Environment Setup

Create a .env file in the root directory:

```env
POSTGRES_USER=your_postgres_user
POSTGRES_HOST=localhost
POSTGRES_DB=clinic_db
POSTGRES_PASSWORD=your_postgres_password
POSTGRES_PORT=5432
SAFE_PROXY_KEY=your_proxy_key
GOOGLE_CALENDAR_ID=your_calendar_id
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