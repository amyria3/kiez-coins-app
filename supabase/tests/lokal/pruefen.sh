#!/usr/bin/env bash
# Spielt alle Migrationen in einen frischen lokalen Postgres und führt die Tests aus.
# Aufruf: supabase/tests/lokal/pruefen.sh   (braucht initdb, pg_ctl und psql, z. B. Postgres 16)
# Die Datenbank liegt in einem temporären Ordner und wird am Ende gestoppt.
set -euo pipefail
cd "$(dirname "$0")/../../.."
BIN=${PG_BIN:-$(dirname "$(command -v initdb || echo /usr/lib/postgresql/16/bin/initdb)")}
DIR=$(mktemp -d); PORT=${PORT:-5499}
"$BIN/initdb" -D "$DIR/data" -A trust -U postgres >/dev/null
"$BIN/pg_ctl" -D "$DIR/data" -o "-p $PORT -k $DIR" -l "$DIR/log" start >/dev/null
trap '"$BIN/pg_ctl" -D "$DIR/data" stop >/dev/null' EXIT
P=(psql -h "$DIR" -p "$PORT" -U postgres -d postgres -q -v ON_ERROR_STOP=1)
"${P[@]}" -f supabase/tests/lokal/supabase-ersatz.sql
for f in supabase/migrations/*.sql; do
  # pg_cron gibt es lokal nicht, cron.schedule ersetzt die Ersatzdatei
  sed -E 's/^create extension if not exists pg_cron.*$//' "$f" | "${P[@]}" >/dev/null 2>&1 || { echo "FEHLER in $f"; sed -E 's/^create extension if not exists pg_cron.*$//' "$f" | "${P[@]}"; exit 1; }
  echo "ok $f"
done
for t in supabase/tests/*.sql; do echo "== $t"; "${P[@]}" -f "$t"; done
