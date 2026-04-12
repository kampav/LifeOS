#!/bin/bash
# Run this after enabling APIs in GCP console
# Authenticates as service account and sets up all required GCP resources

PROJECT_ID="gen-lang-client-0860158655"
REGION="europe-west2"
SA="life-os-deployer@${PROJECT_ID}.iam.gserviceaccount.com"

echo "Setting up GCP project: $PROJECT_ID"
gcloud config set project $PROJECT_ID

# Grant missing IAM roles to service account
echo "Granting IAM roles..."
for ROLE in \
  roles/run.developer \
  roles/run.admin \
  roles/artifactregistry.admin \
  roles/secretmanager.admin \
  roles/storage.admin \
  roles/cloudbuild.builds.editor \
  roles/iam.serviceAccountUser \
  roles/logging.logWriter; do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA" \
    --role="$ROLE" --quiet
  echo "  Granted: $ROLE"
done

# Create Artifact Registry repo for Docker images
echo "Creating Artifact Registry..."
gcloud artifacts repositories create life-os \
  --repository-format=docker \
  --location=$REGION \
  --description="Life OS Docker images" 2>/dev/null || echo "  (already exists)"

# Create GCS bucket for user files
echo "Creating GCS bucket..."
gsutil mb -l $REGION gs://life-os-user-files-${PROJECT_ID} 2>/dev/null || echo "  (already exists)"
gsutil uniformbucketlevelaccess set on gs://life-os-user-files-${PROJECT_ID} 2>/dev/null

# Store secrets in Secret Manager
echo "Storing secrets..."
store_secret() {
  NAME=$1; VALUE=$2
  echo -n "$VALUE" | gcloud secrets create $NAME --data-file=- --quiet 2>/dev/null || \
  echo -n "$VALUE" | gcloud secrets versions add $NAME --data-file=- --quiet
  echo "  Secret stored: $NAME"
}

# Read from .env file
source "$(dirname "$0")/../backend/.env" 2>/dev/null

[ -n "$ANTHROPIC_API_KEY" ]    && store_secret "anthropic-api-key"    "$ANTHROPIC_API_KEY"
[ -n "$GOOGLE_AI_API_KEY" ]    && store_secret "google-ai-api-key"    "$GOOGLE_AI_API_KEY"
[ -n "$SUPABASE_URL" ]         && store_secret "supabase-url"         "$SUPABASE_URL"
[ -n "$SUPABASE_SERVICE_KEY" ] && store_secret "supabase-service-key" "$SUPABASE_SERVICE_KEY"
[ -n "$SUPABASE_ANON_KEY" ]    && store_secret "supabase-anon-key"    "$SUPABASE_ANON_KEY"
store_secret "redis-url" "redis://localhost:6379/0"

echo ""
echo "GCP setup complete!"
echo "Artifact Registry: ${REGION}-docker.pkg.dev/${PROJECT_ID}/life-os"
echo "Next: push to main branch to trigger CI/CD deploy"
