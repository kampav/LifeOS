#!/bin/bash
# Set GitHub Actions secrets for CI/CD
# Requires: gh CLI authenticated, backend/.env and frontend/.env.local present

REPO="kampav/LifeOS"

source "$(dirname "$0")/../backend/.env"
source "$(dirname "$0")/../frontend/.env.local" 2>/dev/null || true

echo "Setting GitHub secrets for ${REPO}..."

set_secret() {
  NAME=$1; VALUE=$2
  echo -n "${VALUE}" | gh secret set "${NAME}" -R "${REPO}"
  echo "  Set: ${NAME}"
}

# Service account key — read from Downloads if present
KEY_FILE="${HOME}/Downloads/key.json"
[ -f "${KEY_FILE}" ] && set_secret "GCP_SA_KEY" "$(cat ${KEY_FILE})"

# Backend secrets
[ -n "${SUPABASE_URL}" ]         && set_secret "SUPABASE_URL"         "${SUPABASE_URL}"
[ -n "${SUPABASE_ANON_KEY}" ]    && set_secret "SUPABASE_ANON_KEY"    "${SUPABASE_ANON_KEY}"
[ -n "${SUPABASE_SERVICE_KEY}" ] && set_secret "SUPABASE_SERVICE_KEY" "${SUPABASE_SERVICE_KEY}"
[ -n "${ANTHROPIC_API_KEY}" ]    && set_secret "ANTHROPIC_API_KEY"    "${ANTHROPIC_API_KEY}"
[ -n "${GOOGLE_AI_API_KEY}" ]    && set_secret "GOOGLE_AI_API_KEY"    "${GOOGLE_AI_API_KEY}"

echo ""
echo "Done! Verify at: https://github.com/${REPO}/settings/secrets/actions"
