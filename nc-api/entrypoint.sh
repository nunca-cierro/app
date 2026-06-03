#!/bin/sh
# ── Entrypoint for nc-api container ────────────────────────────────────
# 1. Wait for PostgreSQL to be ready
# 2. Run Alembic migrations
# 3. Start uvicorn

set -e

# Extract host from DATABASE_URL if not already in DB_HOST
if [ -z "$DB_HOST" ]; then
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*://[^:]*:[^@]*@\([^:]*\).*|\1|p')
fi
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"

echo "Waiting for PostgreSQL at $DB_HOST:$DB_PORT..."

# Busybox-compatible wait loop (works in Alpine/slim)
for i in $(seq 1 30); do
    if python -c "import socket; s=socket.socket(); s.settimeout(2); s.connect(('$DB_HOST', $DB_PORT)); s.close()" 2>/dev/null; then
        echo "PostgreSQL is ready!"
        break
    fi
    if [ "$i" -eq 30 ]; then
        echo "ERROR: PostgreSQL did not become ready in time"
        exit 1
    fi
    echo "Waiting... ($i/30)"
    sleep 2
done

# Run migrations
echo "Running Alembic migrations..."
alembic upgrade head

# Optional: run seed (idempotent — safe to run every time)
echo "Running seed..."
python -m app.seed

# Start server
echo "Starting uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --log-level "${LOG_LEVEL:-info}"
