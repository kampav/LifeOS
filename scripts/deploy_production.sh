#!/bin/bash
# Manual production deploy — use when CI/CD isn't available
# Requires: gcloud CLI authenticated, docker

set -euo pipefail

PROJECT_ID="gen-lang-client-0860158655"
REGION="europe-west2"
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/life-os"
SHA=$(git rev-parse --short HEAD)

echo "Deploying Life OS to production [${SHA}]"
echo "Project: ${PROJECT_ID} | Region: ${REGION}"
echo ""

# Authenticate docker
gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet

# ── Build & push images ──────────────────────────────────────────────────────
echo "[1/4] Building API image..."
docker build -t ${REGISTRY}/api:${SHA} -t ${REGISTRY}/api:latest ./backend
docker push ${REGISTRY}/api:${SHA}
docker push ${REGISTRY}/api:latest

echo "[2/4] Building Frontend image..."
source frontend/.env.local 2>/dev/null || true
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-}" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" \
  --build-arg NEXT_PUBLIC_API_URL="https://api-lifeos-${PROJECT_ID}.${REGION}.run.app/api/v1" \
  -t ${REGISTRY}/frontend:${SHA} \
  -t ${REGISTRY}/frontend:latest ./frontend
docker push ${REGISTRY}/frontend:${SHA}
docker push ${REGISTRY}/frontend:latest

# ── Deploy API ───────────────────────────────────────────────────────────────
echo "[3/4] Deploying API to Cloud Run..."
gcloud run deploy life-os-api \
  --image ${REGISTRY}/api:${SHA} \
  --region ${REGION} --platform managed \
  --set-secrets="ANTHROPIC_API_KEY=anthropic-api-key:latest,GOOGLE_AI_API_KEY=google-ai-api-key:latest,SUPABASE_URL=supabase-url:latest,SUPABASE_SERVICE_KEY=supabase-service-key:latest,REDIS_URL=redis-url:latest" \
  --set-env-vars="ENVIRONMENT=production,DEBUG=false" \
  --allow-unauthenticated \
  --min-instances=1 --max-instances=20 \
  --cpu=2 --memory=2Gi \
  --concurrency=100 \
  --timeout=300

API_URL=$(gcloud run services describe life-os-api --region ${REGION} --format 'value(status.url)')
echo "  API URL: ${API_URL}"

# ── Deploy Frontend ──────────────────────────────────────────────────────────
echo "[4/4] Deploying Frontend to Cloud Run..."
gcloud run deploy life-os-frontend \
  --image ${REGISTRY}/frontend:${SHA} \
  --region ${REGION} --platform managed \
  --allow-unauthenticated \
  --min-instances=1 --max-instances=10 \
  --cpu=1 --memory=1Gi

FRONTEND_URL=$(gcloud run services describe life-os-frontend --region ${REGION} --format 'value(status.url)')

echo ""
echo "Deployment complete!"
echo "  API:      ${API_URL}"
echo "  Frontend: ${FRONTEND_URL}"
echo ""
echo "Test: curl ${API_URL}/health"
