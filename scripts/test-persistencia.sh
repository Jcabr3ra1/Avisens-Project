#!/usr/bin/env bash
# Demuestra que "docker compose down" (sin -v) conserva los datos de
# Postgres. Corre por completo en un proyecto Compose desechable y unico
# por ejecucion -- nunca toca avisens-project ni sus volumenes/contenedores
# reales. No demuestra que AVISENS completo arranca; solo este mecanismo.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/scripts/docker-compose.persistencia-test.yml"
PROYECTO="avisens-persistencia-test-$(date +%s)-$$"

compose() { docker compose -f "$COMPOSE_FILE" -p "$PROYECTO" "$@"; }

# Limpieza endurecida: revisa contenedores, volumenes Y redes (no solo
# contenedores); funciona igual si "up" nunca llego a crear nada; nunca
# oculta un fallo real de "down" como si fuera exito; y termina de verdad
# (exit explicito) ante INT/TERM en vez de dejar que el script siga
# corriendo despues del trap.
limpiar() {
  local fallo=0
  local contenedores volumenes redes id etiqueta

  contenedores="$(compose ps -aq 2>/dev/null || true)"
  volumenes="$(docker volume ls -q --filter "label=com.docker.compose.project=$PROYECTO" 2>/dev/null || true)"
  redes="$(docker network ls -q --filter "label=com.docker.compose.project=$PROYECTO" 2>/dev/null || true)"

  for id in $contenedores; do
    etiqueta="$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}' "$id" 2>/dev/null || true)"
    if [ "$etiqueta" != "$PROYECTO" ]; then
      echo "ERROR: el contenedor $id no lleva la etiqueta de este proyecto ($PROYECTO) -- no se limpia nada, revisa a mano." >&2
      return 1
    fi
  done

  if [ -z "$contenedores" ] && [ -z "$volumenes" ] && [ -z "$redes" ]; then
    echo "Nada que limpiar: no hay contenedores, volúmenes ni redes de $PROYECTO." >&2
    return 0
  fi

  if ! compose down -v --remove-orphans; then
    echo "ERROR: 'docker compose down' terminó con error limpiando $PROYECTO -- puede haber quedado algo a medias, revisa a mano." >&2
    fallo=1
  fi

  volumenes="$(docker volume ls -q --filter "label=com.docker.compose.project=$PROYECTO" 2>/dev/null || true)"
  redes="$(docker network ls -q --filter "label=com.docker.compose.project=$PROYECTO" 2>/dev/null || true)"
  if [ -n "$volumenes" ] || [ -n "$redes" ]; then
    echo "ERROR: quedaron recursos de $PROYECTO sin limpiar (volúmenes: ${volumenes:-ninguno} / redes: ${redes:-ninguna}) -- revisa a mano." >&2
    fallo=1
  fi

  return "$fallo"
}

manejar_salida() {
  local codigo_previo=$?
  limpiar
  local codigo_limpieza=$?
  if [ "$codigo_previo" -eq 0 ] && [ "$codigo_limpieza" -ne 0 ]; then
    exit 1
  fi
  exit "$codigo_previo"
}

manejar_senal() {
  trap - EXIT INT TERM
  limpiar || true
  exit "$1"
}

trap manejar_salida EXIT
trap 'manejar_senal 130' INT
trap 'manejar_senal 143' TERM

echo "Proyecto desechable: $PROYECTO"

echo "1) Arrancando Postgres desechable..."
compose up -d

echo "2) Esperando a que esté healthy..."
inicio=$(date +%s)
while true; do
  cid="$(compose ps -q postgres)"
  estado="$(docker inspect --format '{{.State.Health.Status}}' "$cid" 2>/dev/null || echo "desconocido")"
  [ "$estado" = "healthy" ] && break
  if [ $(( $(date +%s) - inicio )) -ge 30 ]; then
    echo "ERROR: Postgres desechable no llegó a healthy en 30s" >&2
    exit 1
  fi
  sleep 1
done

echo "3) Insertando una fila de control..."
compose exec -T postgres psql -U test -d test -c \
  "CREATE TABLE control (id serial primary key, marca text); INSERT INTO control (marca) VALUES ('antes-del-down');" >/dev/null

echo "4) docker compose down (SIN -v)..."
compose down

echo "5) Arrancando de nuevo..."
compose up -d
inicio=$(date +%s)
while true; do
  cid="$(compose ps -q postgres)"
  estado="$(docker inspect --format '{{.State.Health.Status}}' "$cid" 2>/dev/null || echo "desconocido")"
  [ "$estado" = "healthy" ] && break
  if [ $(( $(date +%s) - inicio )) -ge 30 ]; then
    echo "ERROR: Postgres desechable no volvió a healthy en 30s" >&2
    exit 1
  fi
  sleep 1
done

echo "6) Verificando que la fila sigue ahí..."
resultado="$(compose exec -T postgres psql -U test -d test -tAc "SELECT marca FROM control WHERE marca='antes-del-down';")"
if [ "$(printf '%s' "$resultado" | tr -d '[:space:]')" = "antes-del-down" ]; then
  echo "OK: la fila sobrevivió a 'docker compose down' sin -v. La persistencia del mecanismo de Compose/Postgres queda demostrada."
  echo "(Esto NO demuestra que el stack completo de AVISENS arranca de punta a punta -- esa es una prueba distinta.)"
else
  echo "FALLO: la fila no está. 'down' sin -v no conservó los datos." >&2
  exit 1
fi
