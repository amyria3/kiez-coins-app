#!/usr/bin/env bash
# Ignored Build Step des Vercel-Projekts für app.kiezcoins.de (web-app/vercel.json).
# Vercel baut bei Exit-Code 1 und überspringt den Build bei 0.
# Ein übersprungener Build zählt trotzdem als Deployment zum Tageslimit (100). Für die Branches claude/* legt Vercel
# deshalb gar keins an: "git.deploymentEnabled" in vercel.json (Daria, 2026-11-24).
# Gebaut wird nur auf main und nur, wenn sich seit dem letzten erfolgreichen Deploy etwas an der App geändert hat.
# So zählen Branches und reine Doku-Änderungen nicht gegen das Tageslimit. Vergleich mit VERCEL_GIT_PREVIOUS_SHA,
# damit ein Deploy, das am Tageslimit gescheitert ist, beim nächsten Push nachgeholt wird.
cd "$(git rev-parse --show-toplevel)" || exit 1
[ "$VERCEL_ENV" = "production" ] || exit 0
vorher="${VERCEL_GIT_PREVIOUS_SHA:-}"
[ -n "$vorher" ] || exit 1
git cat-file -e "$vorher^{commit}" 2>/dev/null || git fetch -q --depth=50 origin "$vorher" 2>/dev/null || exit 1
git cat-file -e "$vorher^{commit}" 2>/dev/null || exit 1
git diff --quiet "$vorher" HEAD -- src assets public app.json app.config.js package.json package-lock.json \
  scripts/build-web-app.mjs scripts/web-app-bauen.sh web-app && exit 0
exit 1
