#!/usr/bin/env bash
# Arranque habitual: `docker compose up -d` con espera acotada y un mensaje
# claro si algun servicio no llega a "healthy" a tiempo. No migra ni siembra
# -- eso ya lo hace el propio contenedor del backend (migrar) o es un paso
# explicito aparte (sembrar, ver scripts/dev-setup.sh).
#
# Por defecto carga EXPLICITAMENTE docker-compose.yml + docker-compose.
# override.yml -- los dos, siempre juntos. Pasar "-f" a mano (como hace este
# script) desactiva el autodescubrimiento de Compose del override; si solo
# se listara el primero, el "up" real correria el perfil de PRODUCCION sin
# querer (NODE_ENV=production, build target por defecto -- no "dev", sin
# bind mounts, sin el puerto de Postgres en loopback). Confirmado con
# `docker compose config` antes de corregir esto.
#
# Variables de entorno para pruebas (reemplazan el camino real por uno
# propio -- asi se puede probar sin tocar el stack de avisens-project):
#   AVISENS_COMPOSE_FILE     un unico archivo explicito, SIN el override
#                            real (para compose desechables de prueba).
#   AVISENS_COMPOSE_PROJECT, AVISENS_SERVICIOS (csv), AVISENS_UP_TIMEOUT
#   AVISENS_DRY_RUN=1        no levanta nada: solo resuelve e imprime la
#                            configuracion final (docker compose config),
#                            para que una prueba pueda confirmar que el
#                            camino real selecciona development/dev/los
#                            bind mounts/el puerto en loopback, sin arrancar
#                            un solo contenedor.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_PROJECT="${AVISENS_COMPOSE_PROJECT:-}"
TIMEOUT="${AVISENS_UP_TIMEOUT:-120}"
IFS=',' read -r -a SERVICIOS <<< "${AVISENS_SERVICIOS:-database,redis,backend,ml,frontend}"

if [ -n "${AVISENS_COMPOSE_FILE:-}" ]; then
  # Camino de prueba: un solo archivo explicito, sin merge con nada mas.
  COMPOSE_ARGS=(-f "$AVISENS_COMPOSE_FILE")
else
  # Camino real: base + override de desarrollo, SIEMPRE los dos juntos.
  COMPOSE_ARGS=(-f "$REPO_ROOT/docker-compose.yml" -f "$REPO_ROOT/docker-compose.override.yml")
fi
[ -n "$COMPOSE_PROJECT" ] && COMPOSE_ARGS+=(-p "$COMPOSE_PROJECT")

compose() { docker compose "${COMPOSE_ARGS[@]}" "$@"; }

if [ "${AVISENS_DRY_RUN:-0}" = "1" ]; then
  compose config --no-interpolate
  exit 0
fi

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
