#!/usr/bin/env bash
# Prueba automatizada y versionada de scripts/dev-up.sh: confirma que su
# CAMINO REAL por defecto (sin AVISENS_COMPOSE_FILE) resuelve el perfil de
# desarrollo -- no un compose desechable aparte, que no demostraria nada
# sobre el merge real de docker-compose.yml + docker-compose.override.yml.
# Usa AVISENS_DRY_RUN=1: solo "docker compose config", nunca "up" -- no
# arranca un solo contenedor ni toca el stack real de avisens-project.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="$REPO_ROOT/scripts/dev-up.sh"

fallos=0
ok() { echo "OK: $*"; }
mal() { echo "FALLO: $*" >&2; fallos=$((fallos + 1)); }

salida="$(AVISENS_DRY_RUN=1 AVISENS_COMPOSE_PROJECT="avisens-dryrun-test-$$" "$SCRIPT")"

verificar() {
  local patron="$1" descripcion="$2"
  if printf '%s' "$salida" | grep -qE "$patron"; then
    ok "$descripcion"
  else
    mal "$descripcion (no se encontró: $patron)"
  fi
}

echo "=== Camino real por defecto de dev-up.sh (sin AVISENS_COMPOSE_FILE) ==="
verificar '^\s*target:\s*dev\s*$' "selecciona el target 'dev' (no el de producción)"
verificar '^\s*-\s*NODE_ENV=development\s*$' "NODE_ENV queda en 'development'"
verificar '^\s*-?\s*host_ip:\s*127\.0\.0\.1\s*$' "Postgres publicado con host_ip 127.0.0.1 (loopback), no en todas las interfaces"
verificar '^\s*published:\s*"5433"\s*$' "Postgres publicado en el puerto 5433"
verificar 'target:\s*/app' "hay un bind mount hacia /app (código fuente montado, propio de dev)"

# El camino de prueba (con AVISENS_COMPOSE_FILE) debe seguir aislado: nunca
# debe mezclar el override real ni resolver production por accidente.
d="$(mktemp -d)"; trap 'rm -rf "$d"' EXIT
cat > "$d/mini.yml" <<'EOF'
services:
  prueba:
    image: busybox
    command: ["true"]
EOF
salida_aislada="$(AVISENS_DRY_RUN=1 AVISENS_COMPOSE_FILE="$d/mini.yml" AVISENS_COMPOSE_PROJECT="avisens-dryrun-aislado-$$" "$SCRIPT")"
if printf '%s' "$salida_aislada" | grep -q "image: busybox" && ! printf '%s' "$salida_aislada" | grep -q "127.0.0.1:5433"; then
  ok "camino de prueba (AVISENS_COMPOSE_FILE): usa solo el archivo indicado, sin mezclar el override real"
else
  mal "camino de prueba (AVISENS_COMPOSE_FILE): no quedó aislado del compose real"
fi

echo ""
if [ "$fallos" -eq 0 ]; then
  echo "RESULTADO: dev-up.sh resuelve el perfil de desarrollo por defecto, y el camino de prueba sigue aislado."
  exit 0
else
  echo "RESULTADO: $fallos verificación(es) fallaron." >&2
  exit 1
fi
