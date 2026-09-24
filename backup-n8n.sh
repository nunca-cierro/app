#!/bin/bash
# Backup diario del volumen n8n (Capa 5).
# - Pausa n8n SOLO durante el tar (consistencia con WAL) y lo reanuda SIEMPRE
#   via trap, aunque el tar falle.
# - Retencion KEEP_DAYS. chmod 600: el tarball incluye la encryption key
#   (config del volumen) y las credenciales cifradas - material sensible.
# - Instalado en cron: 0 4 * * * /bin/bash .../backup-n8n.sh >> /home/ubuntu/backup-n8n.log 2>&1
set -euo pipefail

CTR="nuncacierro-n8n-1"
VOL="nuncacierro_n8n_data"
OUT="/home/ubuntu/backups"
KEEP_DAYS=14
STAMP=$(date -u +%Y%m%d_%H%M%S)
FILE="$OUT/n8n_data_${STAMP}.tar.gz"

mkdir -p "$OUT"
echo "[$(date -u '+%F %T')] iniciando backup n8n -> $FILE"

PAUSED=0
if [ "$(docker inspect -f '{{.State.Running}}' "$CTR" 2>/dev/null)" = "true" ]; then
  docker pause "$CTR" >/dev/null
  PAUSED=1
  trap 'if [ "$PAUSED" = 1 ]; then docker unpause "$CTR" >/dev/null 2>&1 || true; fi' EXIT
fi

docker run --rm -v "${VOL}:/data:ro" -v "${OUT}:/out" alpine \
  sh -c "tar czf /out/n8n_data_${STAMP}.tar.gz -C /data . && chown $(id -u):$(id -g) /out/n8n_data_${STAMP}.tar.gz"

if [ "$PAUSED" = 1 ]; then
  docker unpause "$CTR" >/dev/null
  PAUSED=0
  trap - EXIT
fi

chmod 600 "$FILE"

# Retencion: borra los backups de n8n con mas de KEEP_DAYS dias (ambos formatos
# de nombre: n8n_data_YYYY-MM-DD.tar.gz y n8n_data_YYYYMMDD_HHMMSS.tar.gz).
find "$OUT" -maxdepth 1 -name 'n8n_data_*.tar.gz' -mtime +$KEEP_DAYS -delete

echo "[$(date -u '+%F %T')] ok: $FILE ($(du -h "$FILE" | cut -f1)), retencion ${KEEP_DAYS}d"
