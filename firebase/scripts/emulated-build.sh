#!/usr/bin/env bash
# Serves the *production* build against the local Firestore and Auth
# emulators, with a seeded owner and recovery password.
#
# Why this exists: NN's e2e suite runs `next dev`, which compiles each route on
# first request. On this host that costs ten to thirty seconds a route, which
# is most of a 300-second test budget and the reason the passkey claim test is
# slow enough to be flaky. The production build serves the same routes in
# milliseconds, so a sign-in path can be exercised by hand, in a real browser,
# in seconds rather than minutes.
#
# Everything it touches is local and synthetic: the emulators hold no real
# data, mint no real tokens and are discarded when this script stops. It never
# contacts a live Firebase project.
#
# Usage:  firebase/scripts/emulated-build.sh [seed-password]
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
seed_script="${NN_SEED_SCRIPT:-}"
password="${1:-harbour-lantern-thistle-49!}"
port="${NN_EMULATED_PORT:-3100}"

export FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
export FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099"
export NEXT_PUBLIC_USE_FIREBASE_EMULATORS="true"
export NEXT_PUBLIC_FIREBASE_API_KEY="emulator-api-key"
export NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="nn-os-dev.firebaseapp.com"
export NEXT_PUBLIC_FIREBASE_PROJECT_ID="nn-os-dev"
export NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="nn-os-dev.appspot.com"
export NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="607545263036"
export NEXT_PUBLIC_FIREBASE_APP_ID="1:607545263036:web:local"
export WEBAUTHN_RP_ID="localhost"
export WEBAUTHN_RP_NAME="NN"
export WEBAUTHN_ORIGIN="http://localhost:${port}"
# Long enough to satisfy MIN_BOOTSTRAP_SECRET_LENGTH. Local only.
export NN_BOOTSTRAP_SECRET="local-emulated-bootstrap-secret-not-a-real-one"
# Passed through when set, so the "NN carries its own password" path can be
# exercised against an *empty* database — which is the only way to prove it
# does not depend on Firestore holding anything.
if [ -n "${NN_OWNER_RECOVERY:-}" ]; then export NN_OWNER_RECOVERY; fi

inner="
  if [ -n '${seed_script}' ]; then node '${seed_script}' '${password}' || exit 1; fi
  cd '${root}/apps/web' && exec ./node_modules/.bin/next start -p ${port}
"

exec "${root}/firebase/scripts/with-java.sh" firebase emulators:exec \
  --only auth,firestore --project nn-os-dev "bash -c \"${inner//\"/\\\"}\""
