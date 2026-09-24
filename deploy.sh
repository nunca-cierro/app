#!/usr/bin/env bash
# ── NuncaCierro — Deploy de un solo comando ──────────────────────────────
# Uso:        ./deploy.sh
# Requiere:   correr en /home/ubuntu/nuncacierro (Hetzner 62.238.47.178)
#             con .env configurado (docker compose ya lo lee).
#
# Qué hace:
#   1. git pull                        → trae el código nuevo
#   2. build nc-api + nc-dashboard     → reconstruye SOLO lo que cambió
#   3. up -d --no-deps                 → reemplaza solo esos servicios,
#                                        NO reinicia Caddy (evita el 502)
#   4. health check nc-api (/ready)    → espera hasta 60s a que responda
#   5. verificación del sitio          → curl a nuncacierro.com
#
# Diferencias vs `docker compose up -d` directo:
#   El directo reinicia TODOS los contenedores (incluido Caddy) → el sitio
#   devuelve 502 durante la reconstrucción. Con --no-deps solo se recrean
#   los servicios que cambiaron y Caddy sigue sirviendo tráfico.
set -euo pipefail

cd "$(dirname "$0")"

# ── Guard n8n (Capa 3) ──────────────────────────────────────────────────────
# n8n es INTOCABLE en deploys: su flujo corre 24/7 y sus credenciales no deben
# depender de este pipeline. Capturamos su StartedAt ANTES de tocar nada; si al
# final cambió, el deploy se considera fallido y se investiga.
n8n_started_at() {
  local id
  id=$(docker compose ps -q n8n 2>/dev/null | head -n1)
  if [ -z "$id" ]; then echo "absent"; else docker inspect -f '{{.State.StartedAt}}' "$id"; fi
}
N8N_STARTED_BEFORE=$(n8n_started_at)

echo "── 1/5 git pull ──"
git pull

echo "── 2/5 docker compose build nc-api nc-dashboard ──"
docker compose build nc-api nc-dashboard

echo "── 3/5 docker compose up -d --no-deps nc-api nc-dashboard ──"
docker compose up -d --no-deps nc-api nc-dashboard

echo "── 4/5 health check nc-api (/ready) ──"
OK=0
for i in $(seq 1 12); do
  if curl -fsS http://127.0.0.1:8000/ready >/dev/null 2>&1; then
    echo "   nc-api listo (intento $i)"
    OK=1
    break
  fi
  echo "   esperando nc-api... ($i/12)"
  sleep 5
done

if [ "$OK" -ne 1 ]; then
  echo "✗ nc-api no respondió en 60s. Revisa: docker compose logs nc-api"
  exit 1
fi

N8N_STARTED_AFTER=$(n8n_started_at)
if [ "$N8N_STARTED_BEFORE" != "$N8N_STARTED_AFTER" ]; then
  echo "✗ n8n cambió durante el deploy ($N8N_STARTED_BEFORE -> $N8N_STARTED_AFTER)"
  echo "  Un deploy NO debe tocar n8n. Revisa: docker compose logs n8n"
  exit 1
fi
echo "✓ n8n intacto (StartedAt sin cambios)"

echo "── 5/5 verificación sitio ──"
if curl -fsSI https://nuncacierro.com >/dev/null 2>&1; then
  echo "✓ nuncacierro.com responde"
else
  echo "⚠ nuncacierro.com no responde. Revisa: docker compose logs caddy"
fi

echo ""
echo "✓ Deploy completado"