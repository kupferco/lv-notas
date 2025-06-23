#!/bin/bash

echo "🔐 Loading secrets from Google Cloud Secret Manager..."

# Load secrets from Google Cloud Secret Manager and write to .env
SAFE_PROXY_KEY=$(gcloud secrets versions access latest --secret="safe-proxy-key")
GOOGLE_CALENDAR_ID=$(gcloud secrets versions access latest --secret="google-calendar-id")
AIRTABLE_API_KEY=$(gcloud secrets versions access latest --secret="airtable-api-key")

# Update .env file with secrets
cat > .env << EOF
# Local database (no charges)
POSTGRES_USER=dnkupfer
POSTGRES_HOST=localhost
POSTGRES_DB=clinic_db
POSTGRES_PASSWORD=
POSTGRES_PORT=5432

# Local development settings
NODE_ENV=development
PORT=3000
ALLOWED_ORIGINS=http://localhost:8081,http://localhost:19006

# Secrets from Google Cloud
SAFE_PROXY_KEY=${SAFE_PROXY_KEY}
GOOGLE_CALENDAR_ID=${GOOGLE_CALENDAR_ID}
AIRTABLE_API_KEY=${AIRTABLE_API_KEY}

# Webhook URLs (will be updated by start-dev.ts)
WEBHOOK_URL_LOCAL=temp
WEBHOOK_URL_LIVE=https://clinic-api-141687742631.us-central1.run.app
EOF

echo "✅ Secrets loaded and .env updated"
echo "🚀 Starting development server with webhook setup..."

# Use your existing dev:webhook script
npm run dev:webhook
