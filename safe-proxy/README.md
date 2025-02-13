# Safe Proxy Server

## Overview
A secure proxy server designed to protect sensitive API credentials and provide controlled access to data sources.

## Prerequisites
- Node.js (version 18+)
- npm or yarn
- Google Cloud Account
- Access to source API (e.g., Airtable)

## Local Development Setup

### 1. Environment Variables
Create a `.env.local` file in the project root:
```bash
AIRTABLE_API_KEY=AIRTABLE_KEY
CLIENT_API_KEY=SAFE_PROXY_KEY
ALLOWED_ORIGINS=ALLOWED_DOMAINS
```

### 2. Google Cloud Secret Manager Setup
1. Set up Google Cloud Project
```bash
# Set the project
gcloud config set project lv-notas

# Enable Secret Manager API
gcloud services enable secretmanager.googleapis.com

# Create the secret
gcloud secrets create safe-proxy-key \
  --replication-policy="automatic"

# Add a version to the secret
echo -n "your_proxy_api_key" | gcloud secrets versions add safe-proxy-key --data-file=-
echo "your-airtable-api-key" | gcloud secrets create airtable-api-key --data-file=-
```

```bash
gcloud projects add-iam-policy-binding lv-notas \
    --member=serviceAccount:141687742631-compute@developer.gserviceaccount.com \
    --role=roles/secretmanager.secretAccessor
```

### 3. Local Development
Install Dependencies
```bash
npm install
```

Run Development Server
```bash
node server.js
```

## Deployment
## Google Cloud Run Deployment

1. Build the Docker image
```bash
docker build -t safe-proxy .
docker tag safe-proxy gcr.io/lv-notas/safe-proxy
docker push gcr.io/lv-notas/safe-proxy
```

2. Deploy to Google Cloud Run
```bash
gcloud run deploy safe-proxy \
  --image gcr.io/lv-notas/safe-proxy \
  --platform managed \
  --region us-central1 \
  --set-secrets=SAFE_PROXY_KEY=safe-proxy-key:latest,AIRTABLE_API_KEY=airtable-api-key:latest \
  --env-vars-file env.yaml
```


### Security Considerations

- API keys are stored in Google Cloud Secret Manager
- Implement Firebase Authentication for accessing endpoints
- Use environment-specific configurations
- Rotate secrets periodically

### Endpoints

- /patients: Retrieve patient information
- Other endpoints as defined in the application

### Troubleshooting

- Verify environment variables
- Check Google Cloud IAM permissions
- Validate Firebase Authentication setup