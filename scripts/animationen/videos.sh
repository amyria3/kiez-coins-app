#!/usr/bin/env bash
# Die Kopie der Szene steht in AUS/video; die Schleife beginnt bei 6 s, damit die Tropfen gefallen sind.
# Videos für die App: je Abzeichen Einstieg (6 s, einmal) und Schleife (25,6 s, nahtlos), 540 × 508, 25 fps.
# Aufruf aus dem Repo: bash scripts/animationen/videos.sh   Ergebnis: assets/abzeichen/<kind>-einstieg.mp4 und -schleife.mp4
set -e
H="$(cd "$(dirname "$0")" && pwd)"; R="$H/../.."; export AUS="${AUS:-$H/aus}"
for n in Ocular Steuerrad Anchor Bitseps; do VIDEO=1 python3 "$H/szene.py" $n received; done
VIDEO=1 python3 "$H/empor.py" '#F3EEE8' 'video/Bottle – Badge Received.svg'
r(){ n="$1"; k="$2"; o="$AUS/fr_$k"; rm -rf "${o}_e" "${o}_s"
  python3 "$H/vframes.py" "$AUS/video/$n – Badge Received.svg" "${o}_e" 0 150
  ffmpeg -y -loglevel error -framerate 25 -i "${o}_e/%04d.png" -c:v libx264 -preset veryfast -crf 24 -pix_fmt yuv420p -movflags +faststart "$R/assets/abzeichen/$k-einstieg.mp4"
  python3 "$H/vframes.py" "$AUS/video/$n – Badge Received.svg" "${o}_s" 6 640
  ffmpeg -y -loglevel error -framerate 25 -i "${o}_s/%04d.png" -c:v libx264 -preset veryfast -crf 24 -pix_fmt yuv420p -movflags +faststart "$R/assets/abzeichen/$k-schleife.mp4"
  cp "$AUS/video/$n – Badge Received.svg" "$R/public/animations/$k.svg"
  rm -rf "${o}_e" "${o}_s"; echo fertig $k; }
r Ocular pionier & r Bottle lotse & r Steuerrad anfuehrer & r Anchor seebaer & r Bitseps macher &
wait
