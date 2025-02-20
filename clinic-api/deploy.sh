#!/bin/bash

# Exit on first error
set -e

# Build Docker image
echo "Building Docker image..."
docker build -t clinic-api .

# Tag the image
echo "Tagging image..."
docker tag clinic-api gcr.io/lv-notas/clinic-api

# Push to Google Container Registry
echo "Pushing image to GCR..."
docker push gcr.io/lv-notas/clinic-api

# Deploy to Google Cloud Run
gcloud run deploy clinic-api \
  --image gcr.io/lv-notas/clinic-api \
  --platform managed \
  --region us-central1 \
  --set-secrets=SAFE_PROXY_KEY=safe-proxy-key:latest,POSTGRES_PASSWORD=postgres-password:latest \
  --env-vars-file env.yaml \
  --add-cloudsql-instances lv-notas:us-central1:clinic-db \
  --service-account lv-notas-service-account@lv-notas.iam.gserviceaccount.com

echo "Deployment completed successfully!"
