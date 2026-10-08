#!/usr/bin/env bash
# Arranque habitual: `docker compose up -d` con espera acotada y un mensaje
# claro si algun servicio no llega a "healthy" a tiempo. No migra ni siembra
# -- eso ya lo hace el propio contenedor del backend (migrar) o es un paso
# explicito aparte (sembrar, ver scripts/dev-setup.sh).
#
# Variables de entorno para pruebas (apuntan a un compose y un proyecto
# distintos del real -- asi se puede probar la espera sin tocar el stack
# de avisens-project):
#   AVISENS_COMPOSE_FILE, AVISENS_COMPOSE_PROJECT, AVISENS_SERVICIOS (csv),
#   AVISENS_UP_TIMEOUT (segundos, default 120)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${AVISENS_COMPOSE_FILE:-$REPO_ROOT/docker-compose.yml}"
COMPOSE_PROJECT="${AVISENS_COMPOSE_PROJECT:-}"
TIMEOUT="${AVISENS_UP_TIMEOUT:-120}"
IFS=',' read -r -a SERVICIOS <<< "${AVISENS_SERVICIOS:-database,redis,backend,ml,frontend}"

compose() {
  if [ -n "$COMPOSE_PROJECT" ]; then
    docker compose -f "$COMPOSE_FILE" -p "$COMPOSE_PROJECT" "$@"
  else
    docker compose -f "$COMPOSE_FILE" "$@"
  fi
}

echo "Levantando Avisens (docker compose up -d)..."
compose up -d

echo "Esperando a que los servicios estén listos (máximo ${TIMEOUT}s): ${SERVICIOS[*]}"
inicio=$(date +%s)
while true; do
  pendientes=()
  for s in "${SERVICIOS[@]}"; do
    cid=$(compose ps -q "$s" 2>/dev/null || true)
    if [ -z "$cid" ]; then
      pendientes+=("$s=sin_contenedor")
      continue
    fi
    # Si el contenedor no declara HEALTHCHECK, esto nunca se vuelve "healthy"
    # -- se queda esperando hasta el timeout, en vez de aceptar "running" en
    # silencio como si fuera lo mismo.
    estado=$(docker inspect --format \
      '{{if .State.Health}}{{.State.Health.Status}}{{else}}sin_healthcheck:{{.State.Status}}{{end}}' \
      "$cid" 2>/dev/null || echo "desconocido")
    [ "$estado" = "healthy" ] || pendientes+=("$s=$estado")
  done

  if [ ${#pendientes[@]} -eq 0 ]; then
    echo "Todos los servicios están arriba y healthy."
    exit 0
  fi

  ahora=$(date +%s)
  transcurrido=$((ahora - inicio))
  if [ "$transcurrido" -ge "$TIMEOUT" ]; then
    echo "ERROR: se agotó el tiempo (${TIMEOUT}s) esperando: ${pendientes[*]}" >&2
    echo "Revisa los logs del servicio que falló: docker compose logs -f <servicio>" >&2
    exit 1
  fi
  sleep 3
done
