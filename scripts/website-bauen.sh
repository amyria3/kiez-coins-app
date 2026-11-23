#!/usr/bin/env bash
# Ignored Build Step des Vercel-Projekts für kiezcoins.de (vercel.json im Wurzelordner), wie scripts/web-app-bauen.sh.
# Vercel baut bei Exit-Code 1 und überspringt den Build bei 0.
# Gebaut wird nur auf main und nur, wenn sich seit dem letzten erfolgreichen Deploy etwas an der Website geändert hat
# (Daria, 2026-11-16: reine Doku- und TODO-Commits sollen keinen Deploy auslösen). Vergleich mit
# VERCEL_GIT_PREVIOUS_SHA, damit ein am Tageslimit gescheitertes Deploy beim nächsten Push nachgeholt wird.
# Die Pfade sind alles, was scripts/build-download-site.mjs liest.
cd "$(git rev-parse --show-toplevel)" || exit 1
[ "$VERCEL_ENV" = "production" ] || exit 0
vorher="${VERCEL_GIT_PREVIOUS_SHA:-}"
[ -n "$vorher" ] || exit 1
git cat-file -e "$vorher^{commit}" 2>/dev/null || git fetch -q --depth=50 origin "$vorher" 2>/dev/null || exit 1
git cat-file -e "$vorher^{commit}" 2>/dev/null || exit 1
git diff --quiet "$vorher" HEAD -- website api scripts/site scripts/build-download-site.mjs scripts/download-site.config.json \
  scripts/website-bauen.sh vercel.json package.json package-lock.json assets/favicon.png assets/illustrations/kater.svg \
  src/components/icons src/data/legal.ts src/data/kater-sprueche.json src/lib/businessCardWeb.ts \
  src/data/cardActions.mjs src/data/digitalCard.mjs src/data/vcard.mjs src/data/paymentLinks.mjs && exit 0
exit 1
