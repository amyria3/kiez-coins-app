#!/bin/zsh -l
# Neuen Stand holen, z. B. vom iPhone über die Kurzbefehle-App („Skript über SSH ausführen“).
# Läuft `npx expo start` auf dem Mac, lädt Expo Go die Änderungen danach von selbst neu.
# Haben sich Pakete geändert, installiert das Skript sie mit; dann einmal Expo neu starten (steht in der Ausgabe).
cd "$(dirname "$0")/.." || exit 1
vorher=$(git rev-parse HEAD)
git pull --ff-only --quiet || { echo "git pull hat nicht geklappt"; exit 1; }
nachher=$(git rev-parse HEAD)
if [ "$vorher" = "$nachher" ]; then
  echo "Schon aktuell: $(git log -1 --format=%s | cut -c1-80)"
  exit 0
fi
echo "Neu: $(git log --oneline "$vorher..$nachher" | wc -l | tr -d ' ') Änderungen"
git log --format='· %s' "$vorher..$nachher" | cut -c1-80 | head -8
if git diff --name-only "$vorher" "$nachher" | grep -q '^package\(-lock\)\?\.json$'; then
  echo "Pakete geändert, installiere …"
  npm install --silent && echo "Pakete da. Bitte Expo einmal neu starten."
fi
