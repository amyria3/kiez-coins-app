#!/usr/bin/env bash
# Ignored Build Step des Vercel-Projekts für app.kiezcoins.de (web-app/vercel.json).
# Vercel baut bei Exit-Code 1 und überspringt den Build bei 0.
# Gebaut wird nur auf main und nur, wenn sich etwas an der App geändert hat. So zählen Branches
# und reine Doku-Änderungen nicht gegen das Tageslimit für Deploys.
cd "$(git rev-parse --show-toplevel)" || exit 1
[ "$VERCEL_ENV" = "production" ] || exit 0
git rev-parse -q --verify HEAD^ >/dev/null || exit 1
git diff --quiet HEAD^ HEAD -- src assets public app.json app.config.js package.json package-lock.json \
  scripts/build-web-app.mjs web-app && exit 0
exit 1
