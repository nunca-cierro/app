# ── Stage 1: Dependencies ──────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /app

# Install uv (fast Python package manager)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy only dependency files first (layer caching)
    COPY pyproject.toml uv.lock ./
    RUN uv sync --frozen --no-dev

# ── Stage 2: Runtime ──────────────────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

# Runtime deps: libpq for asyncpg (if needed in slim)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy venv from builder
COPY --from=builder /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"

# Copy application code
COPY app/ ./app/
COPY alembic.ini ./
COPY pyproject.toml ./

# Copy entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
