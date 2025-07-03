#!/bin/bash
echo "🚀 Deploying LV Notas with environment variables..."

# Get the API key from Firebase config
SAFE_PROXY_API_KEY=$(firebase functions:config:get hosting.safe_proxy_api_key --json | jq -r '.hosting.safe_proxy_api_key')

# Export it for the build process
export SAFE_PROXY_API_KEY="$SAFE_PROXY_API_KEY"

echo "✅ Environment variable set"

# Run the deploy
npx expo export:web && firebase deploy --only hosting