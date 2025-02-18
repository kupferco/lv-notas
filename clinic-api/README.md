# Clinic API

A Node.js/TypeScript REST API for managing a therapy clinic's sessions and check-ins.

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

## Database Commands

Quick check of therapists and patients:
\`\`\`bash
psql -h localhost -U your_postgres_user clinic_db < db/seed/check_data.sql
\`\`\`

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

- POST /api/checkin - Register a patient check-in for a session
- GET /api/proxy - Test authenticated connection
- GET /api/key - Get API key (requires authentication)

## Authentication

The API uses Firebase Authentication. Requests need to include:
- X-API-Key header with SAFE_PROXY_KEY
- Authorization header with Firebase token

## Project Structure

- `/src` - Source code
  - `/config` - Configuration files
  - `/routes` - API routes
  - `/services` - Business logic
- `/db` - Database scripts and migrations
  - `/seed` - Test data scripts

