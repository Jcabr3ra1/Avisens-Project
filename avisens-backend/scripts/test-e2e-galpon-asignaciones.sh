#!/usr/bin/env bash
# Corre la suite e2e de "galpón: desactivar revoca asignaciones" (F1) contra
# un Postgres DESECHABLE, exclusivo de esta corrida: levanta un solo
# contenedor postgres:17-alpine con su propio volumen con nombre, aplica las
# migraciones reales (prisma migrate deploy), ejecuta las pruebas y lo elimina
# todo al terminar -- con éxito, con fallo o con INT/TERM. Nunca toca
# avisens-project, avisens-db ni avisens-db-aislada-2, y no usa prune global.
#
# Variables opcionales (pensadas para las pruebas de limpieza versionadas):
#   AVISENS_E2E_COMANDO  comando a ejecutar en lugar de jest (por defecto, la
#                        suite de F1)
#   AVISENS_E2E_NOMBRE   nombre base de los recursos (por defecto, uno único
#                        por corrida)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CORRIDA="${AVISENS_E2E_NOMBRE:-avisens-f1-galpon-e2e-$(date +%s)-$$}"
CONTENEDOR="$CORRIDA"
VOLUMEN="$CORRIDA-data"
ETIQUETA="avisens.corrida=$CORRIDA"
PID_PRUEBA=""

# Distingue "Docker confirmó que no existe" de "no se pudo preguntar".
# Devuelve 0 si existe, 1 si su ausencia está CONFIRMADA, 2 si no se pudo
# determinar (Docker inaccesible u otro error), dejando el detalle en
# $DETALLE_DOCKER.
DETALLE_DOCKER=""
consultar() {
  local salida
  if salida="$("$@" 2>&1)"; then
    DETALLE_DOCKER=""
    return 0
  fi
  if printf '%s' "$salida" | grep -qiE "no such (object|container|volume|network)"; then
    DETALLE_DOCKER=""
    return 1
  fi
  DETALLE_DOCKER="$salida"
  return 2
}

# Elimina SOLO los recursos con el nombre de esta corrida y luego comprueba,
# preguntándole a Docker, que ya no existen. Solo devuelve 0 con ausencia
# confirmada; cualquier otra cosa (Docker inaccesible, fallo al borrar,
# recurso que sigue ahí) es un error explícito.
limpiar() {
  local estado=0

  consultar docker container inspect "$CONTENEDOR" || estado=$?
  if [ "$estado" -eq 0 ]; then
    if ! docker rm -f -v "$CONTENEDOR" >/dev/null 2>&1; then
      echo "ERROR: no se pudo eliminar el contenedor desechable $CONTENEDOR -- revisa a mano: docker rm -f -v $CONTENEDOR" >&2
      return 1
    fi
  elif [ "$estado" -eq 2 ]; then
    echo "ERROR: no se pudo consultar el contenedor desechable $CONTENEDOR (Docker puede estar inaccesible) -- no se asume que no hay nada que limpiar. Detalle: $DETALLE_DOCKER" >&2
    return 1
  fi

  estado=0
  consultar docker volume inspect "$VOLUMEN" || estado=$?
  if [ "$estado" -eq 0 ]; then
    if ! docker volume rm -f "$VOLUMEN" >/dev/null 2>&1; then
      echo "ERROR: no se pudo eliminar el volumen desechable $VOLUMEN -- revisa a mano: docker volume rm $VOLUMEN" >&2
      return 1
    fi
  elif [ "$estado" -eq 2 ]; then
    echo "ERROR: no se pudo consultar el volumen desechable $VOLUMEN (Docker puede estar inaccesible). Detalle: $DETALLE_DOCKER" >&2
    return 1
  fi

  verificar_ausencia
}

# Comprobación final, independiente del borrado: nada con el nombre ni la
# etiqueta de esta corrida (contenedores, volúmenes, redes) debe quedar.
verificar_ausencia() {
  local estado=0 restos

  consultar docker container inspect "$CONTENEDOR" || estado=$?
  if [ "$estado" -ne 1 ]; then
    echo "ERROR: el contenedor $CONTENEDOR sigue existiendo o no se pudo confirmar su ausencia. $DETALLE_DOCKER" >&2
    return 1
  fi
  estado=0
  consultar docker volume inspect "$VOLUMEN" || estado=$?
  if [ "$estado" -ne 1 ]; then
    echo "ERROR: el volumen $VOLUMEN sigue existiendo o no se pudo confirmar su ausencia. $DETALLE_DOCKER" >&2
    return 1
  fi

  if ! restos="$(docker ps -a -q --filter "label=$ETIQUETA" 2>&1)"; then
    echo "ERROR: no se pudo listar contenedores de esta corrida: $restos" >&2
    return 1
  fi
  if [ -n "$restos" ]; then
    echo "ERROR: quedan contenedores con la etiqueta $ETIQUETA: $restos" >&2
    return 1
  fi
  if ! restos="$(docker volume ls -q --filter "label=$ETIQUETA" 2>&1)"; then
    echo "ERROR: no se pudo listar volúmenes de esta corrida: $restos" >&2
    return 1
  fi
  if [ -n "$restos" ]; then
    echo "ERROR: quedan volúmenes con la etiqueta $ETIQUETA: $restos" >&2
    return 1
  fi
  if ! restos="$(docker network ls -q --filter "label=$ETIQUETA" 2>&1)"; then
    echo "ERROR: no se pudo listar redes de esta corrida: $restos" >&2
    return 1
  fi
  if [ -n "$restos" ]; then
    echo "ERROR: quedan redes con la etiqueta $ETIQUETA: $restos" >&2
    return 1
  fi
  return 0
}

manejar_salida() {
  local codigo_previo=$?
  local codigo_limpieza=0
  limpiar || codigo_limpieza=$?
  if [ "$codigo_limpieza" -eq 0 ]; then
    echo "Limpieza verificada: sin contenedores, volúmenes ni redes de $CORRIDA."
  fi
  if [ "$codigo_previo" -eq 0 ] && [ "$codigo_limpieza" -ne 0 ]; then
    exit 1
  fi
  exit "$codigo_previo"
}

manejar_senal() {
  local codigo="$1"
  trap - EXIT INT TERM
  if [ -n "$PID_PRUEBA" ]; then
    kill "$PID_PRUEBA" 2>/dev/null || true
    wait "$PID_PRUEBA" 2>/dev/null || true
  fi
  limpiar || true
  exit "$codigo"
}

trap manejar_salida EXIT
trap 'manejar_senal 130' INT
trap 'manejar_senal 143' TERM

echo "Corrida desechable: $CORRIDA"
docker volume create --label "$ETIQUETA" "$VOLUMEN" >/dev/null
docker run -d --name "$CONTENEDOR" --label "$ETIQUETA" \
  -e POSTGRES_USER=avisens -e POSTGRES_PASSWORD=f1_desechable \
  -e POSTGRES_DB=avisens_test \
  -v "$VOLUMEN":/var/lib/postgresql/data \
  -p 127.0.0.1::5432 postgres:17-alpine >/dev/null

echo "Esperando a que Postgres esté listo..."
LISTO=0
for _ in $(seq 1 60); do
  if docker exec "$CONTENEDOR" pg_isready -U avisens -d avisens_test >/dev/null 2>&1; then
    LISTO=1
    break
  fi
  sleep 1
done
if [ "$LISTO" -ne 1 ]; then
  echo "ERROR: Postgres desechable no estuvo listo a tiempo" >&2
  exit 1
fi

PUERTO_HOST="$(docker port "$CONTENEDOR" 5432/tcp | head -1 | sed 's/.*://')"
export DATABASE_URL="postgresql://avisens:f1_desechable@127.0.0.1:${PUERTO_HOST}/avisens_test"
export NODE_ENV=test
export JWT_SECRET="e2e-access-secret-at-least-32-characters"
export JWT_REFRESH_SECRET="e2e-refresh-secret-at-least-32-characters"

echo "Aplicando las migraciones reales (prisma migrate deploy)..."
(cd "$REPO_ROOT" && pnpm exec prisma migrate deploy)

echo "Ejecutando las pruebas de F1..."
if [ -n "${AVISENS_E2E_COMANDO:-}" ]; then
  (cd "$REPO_ROOT" && bash -c "$AVISENS_E2E_COMANDO") &
else
  (cd "$REPO_ROOT" && pnpm exec jest --config ./test/jest-e2e.json test/galpon-asignaciones) &
fi
PID_PRUEBA=$!
CODIGO_PRUEBA=0
wait "$PID_PRUEBA" || CODIGO_PRUEBA=$?
PID_PRUEBA=""
exit "$CODIGO_PRUEBA"
