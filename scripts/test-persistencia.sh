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

limpiar() {
  # Antes de borrar, confirma que lo que va a tocar pertenece de verdad a
  # ESTA ejecucion: todo lo que compose cree lleva la etiqueta
  # com.docker.compose.project=$PROYECTO, y "ps -q" bajo el mismo -p solo
  # puede listar justo eso. Si por lo que sea no hay nada que limpiar
  # (por ejemplo, el "up" nunca llego a crear nada), down -v es un no-op.
  local ids
  ids="$(compose ps -aq 2>/dev/null || true)"
  if [ -n "$ids" ]; then
    local ajenos=0
    for id in $ids; do
      etiqueta="$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}' "$id" 2>/dev/null || true)"
      [ "$etiqueta" = "$PROYECTO" ] || ajenos=1
    done
    if [ "$ajenos" -eq 1 ]; then
      echo "ERROR: algun recurso listado no lleva la etiqueta de este proyecto ($PROYECTO) -- no se limpia nada, revisa a mano." >&2
      return 1
    fi
  fi
  compose down -v --remove-orphans >/dev/null 2>&1 || true
}
trap limpiar EXIT INT TERM

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
