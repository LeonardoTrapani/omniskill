#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/apps/server/.env"
DUMP_FILE="$ROOT_DIR/tmp/neon.dump"
LOCAL_URL="postgresql://omniskill:omniskill@localhost:5432/omniskill"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE"
  exit 1
fi

mkdir -p "$ROOT_DIR/tmp"

REMOTE_URL="$(python3 - "$ENV_FILE" <<'PY'
import sys
from pathlib import Path

env_path = Path(sys.argv[1])
value = ""
for raw in env_path.read_text().splitlines():
    line = raw.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    key, v = line.split("=", 1)
    if key == "NEON_DATABASE_URL_DIRECT":
        value = v
        break
    if key == "NEON_DATABASE_URL" and not value:
        value = v

if not value:
    sys.exit(1)

print(value)
PY
)"

if [[ -z "$REMOTE_URL" ]]; then
  echo "Missing NEON_DATABASE_URL_DIRECT or NEON_DATABASE_URL in apps/server/.env"
  exit 1
fi

echo "Dumping Neon database..."
pg_dump --no-owner --no-privileges --format=custom --file "$DUMP_FILE" "$REMOTE_URL"

echo "Recreating local database..."
psql postgres -v ON_ERROR_STOP=1 -c "DO \$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'omniskill') THEN CREATE ROLE omniskill WITH LOGIN PASSWORD 'omniskill'; END IF; END \$\$;"
psql postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS omniskill;"
psql postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE omniskill OWNER omniskill;"

echo "Restoring dump into local database..."
pg_restore --no-owner --no-privileges --clean --if-exists --dbname "$LOCAL_URL" "$DUMP_FILE"

echo "Done. Local DB is synced from Neon."
