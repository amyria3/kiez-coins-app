#!/bin/sh
# Holt jede Minute den neuesten Stand von GitHub. Läuft daneben `npx expo start`, lädt Expo Go die Änderungen
# von selbst neu (Fast Refresh). So kommen Updates aufs Handy, ohne dass jemand am Mac tippen muss.
#   sh scripts/auto-pull.sh        (in einem zweiten Terminal-Fenster, beenden mit ctrl+C)
cd "$(dirname "$0")/.." || exit 1
while true; do
  git pull --ff-only --quiet && echo "$(date +%H:%M) aktuell: $(git log -1 --format=%s | cut -c1-70)"
  sleep 60
done
