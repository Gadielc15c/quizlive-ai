#!/usr/bin/env bash
# QuizLive AI - deploy script (bash)
# Uso: ./deploy.sh "mensaje del commit"
set -euo pipefail

MSG="${1:-update}"
COOLIFY_URL="https://coolify.cascantelabs.com"
BACKEND_UUID="lo7xg3ky223xmc6i79riilfk"
FRONTEND_UUID="v13uwbs2305q85kr2vattbzi"
TOKEN="${COOLIFY_TOKEN:-11|nmYtLP1JNHCsUNMpX3gybprG460NoEoOnCC06Psu282c624f}"

echo "==> git add + commit"
git add -A
if [ -n "$(git status --porcelain)" ]; then
  git commit -m "$MSG" >/dev/null
else
  echo "   (sin cambios)"
fi

echo "==> git push"
git push

echo "==> deploy backend"
curl -s "$COOLIFY_URL/api/v1/deploy?uuid=$BACKEND_UUID&force=false" \
  -H "Authorization: Bearer $TOKEN"
echo

echo "==> deploy frontend"
curl -s "$COOLIFY_URL/api/v1/deploy?uuid=$FRONTEND_UUID&force=false" \
  -H "Authorization: Bearer $TOKEN"
echo

cat <<EOF

Listo. Progreso en:
  $COOLIFY_URL
  Frontend:  https://quiz.cascantelabs.com
  Backend:   https://quiz-bk.cascantelabs.com
EOF
