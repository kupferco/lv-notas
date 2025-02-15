#!/bin/bash

# Exit on first error
set -e

# Build Docker image
echo "Building Docker image..."
docker build -t safe-proxy .

# Tag the image
echo "Tagging image..."
docker tag safe-proxy gcr.io/lv-notas/safe-proxy

# Push to Google Container Registry
echo "Pushing image to GCR..."
docker push gcr.io/lv-notas/safe-proxy

# Deploy to Google Cloud Run
echo "Deploying to Google Cloud Run..."
gcloud run deploy safe-proxy \
  --image gcr.io/lv-notas/safe-proxy \
  --platform managed \
  --region us-central1 \
  --set-secrets=SAFE_PROXY_KEY=safe-proxy-key:latest,AIRTABLE_API_KEY=airtable-api-key:latest \
  --env-vars-file env.yaml

echo "Deployment completed successfully!"