#!/usr/bin/env bash
# Corre la suite e2e de "galpón: desactivar revoca asignaciones" (F1) contra
# un Postgres DESECHABLE, exclusivo de esta corrida: levanta un solo
# contenedor postgres:17-alpine con su propio volumen, aplica las migraciones
# reales (prisma migrate deploy), ejecuta las pruebas y elimina al terminar
# -- con éxito, con fallo o con INT/TERM -- SOLO lo que esta corrida creó.
#
# Propiedad de los recursos: un nombre no demuestra propiedad. Cada corrida
# genera un token aleatorio y etiqueta con él lo que crea
# (avisens.f1.token=<token>). Antes de crear, exige que no exista nada con
# su nombre ni con su token; después de crear, comprueba que el recurso
# lleva SU token (docker volume create sobre un nombre existente devuelve 0
# y conserva las etiquetas ajenas, así que sin esa comprobación se adoptaría
# un volumen ajeno). Antes de borrar, vuelve a comprobar el token. Un recurso
# sin el token de la corrida nunca se borra, aunque tenga el mismo nombre.
#
# Variables opcionales:
#   AVISENS_E2E_NOMBRE   nombre base; debe empezar por avisens-f1-e2e- (si
#                        no, se rechaza sin crear ni borrar nada)
#   AVISENS_E2E_TOKEN    token de propiedad (32 hex); por defecto, aleatorio
#   AVISENS_E2E_COMANDO  comando a ejecutar en lugar de jest
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CORRIDA="${AVISENS_E2E_NOMBRE:-avisens-f1-e2e-$(date +%s)-$$}"
if ! [[ "$CORRIDA" =~ ^avisens-f1-e2e-[a-z0-9][a-z0-9-]{0,62}$ ]]; then
  echo "ERROR: el nombre '$CORRIDA' está fuera del espacio de pruebas (debe cumplir ^avisens-f1-e2e-[a-z0-9][a-z0-9-]*\$). No se crea ni se borra nada." >&2
  exit 2
fi
TOKEN="${AVISENS_E2E_TOKEN:-$(od -An -N16 -tx1 /dev/urandom | tr -d ' \n')}"
if ! [[ "$TOKEN" =~ ^[0-9a-f]{32}$ ]]; then
  echo "ERROR: AVISENS_E2E_TOKEN debe tener 32 caracteres hexadecimales. No se crea ni se borra nada." >&2
  exit 2
fi
CONTENEDOR="$CORRIDA"
VOLUMEN="$CORRIDA-data"
ETIQUETA_CORRIDA="avisens.corrida=$CORRIDA"
ETIQUETA_TOKEN="avisens.f1.token=$TOKEN"
CONTENEDOR_ID=""
VOLUMEN_PROPIO=0
FASE_VOLUMEN=0
FASE_CONTENEDOR=0
PID_PRUEBA=""

# Distingue "Docker confirmó que no existe" de "no se pudo preguntar".
# Devuelve 0 si existe (salida en $SALIDA_DOCKER), 1 si su ausencia está
# CONFIRMADA, 2 si no se pudo determinar (detalle en $DETALLE_DOCKER).
SALIDA_DOCKER=""
DETALLE_DOCKER=""
consultar() {
  local salida
  if salida="$("$@" 2>&1)"; then
    SALIDA_DOCKER="$salida"
    DETALLE_DOCKER=""
    return 0
  fi
  SALIDA_DOCKER=""
  if printf '%s' "$salida" | grep -qiE "no such (object|container|volume|network)"; then
    DETALLE_DOCKER=""
    return 1
  fi
  DETALLE_DOCKER="$salida"
  return 2
}

# Lista (ids o nombres) de recursos con el token de esta corrida.
# Devuelve 1 si Docker no respondió.
listar_con_token() {
  local tipo="$1" salida
  case "$tipo" in
    contenedor) salida="$(docker ps -a -q --filter "label=$ETIQUETA_TOKEN" 2>&1)" || { DETALLE_DOCKER="$salida"; return 1; } ;;
    volumen) salida="$(docker volume ls -q --filter "label=$ETIQUETA_TOKEN" 2>&1)" || { DETALLE_DOCKER="$salida"; return 1; } ;;
    red) salida="$(docker network ls -q --filter "label=$ETIQUETA_TOKEN" 2>&1)" || { DETALLE_DOCKER="$salida"; return 1; } ;;
  esac
  SALIDA_DOCKER="$salida"
  return 0
}

# Antes de crear: nada con el nombre de la corrida ni con su token puede
# existir. Si algo existe, no se adopta ni se borra: la corrida se detiene.
exigir_terreno_libre() {
  local estado tipo
  for par in "container:$CONTENEDOR" "volume:$VOLUMEN"; do
    tipo="${par%%:*}"
    estado=0
    consultar docker "$tipo" inspect "${par#*:}" || estado=$?
    if [ "$estado" -eq 0 ]; then
      echo "ERROR: ya existe un $tipo llamado ${par#*:} que esta corrida no creó; no se adopta ni se borra. Usa otro AVISENS_E2E_NOMBRE." >&2
      return 1
    elif [ "$estado" -eq 2 ]; then
      echo "ERROR: no se pudo consultar el $tipo ${par#*:} (Docker puede estar inaccesible). No se crea nada. Detalle: $DETALLE_DOCKER" >&2
      return 1
    fi
  done
  for tipo in contenedor volumen red; do
    if ! listar_con_token "$tipo"; then
      echo "ERROR: no se pudo listar ${tipo}es por etiqueta (Docker puede estar inaccesible). Detalle: $DETALLE_DOCKER" >&2
      return 1
    fi
    if [ -n "$SALIDA_DOCKER" ]; then
      echo "ERROR: ya existen recursos ($tipo) con el token de esta corrida; no se adoptan ni se borran: $SALIDA_DOCKER" >&2
      return 1
    fi
  done
}

# Devuelve 0 si el recurso existe Y lleva el token de esta corrida (en
# $SALIDA_DOCKER queda su id o nombre), 1 si no existe o no es propio, 2 si
# no se pudo determinar.
es_propio() {
  local tipo="$1" ref="$2" formato estado=0 token id
  if [ "$tipo" = "container" ]; then
    formato='{{.Id}}|{{index .Config.Labels "avisens.f1.token"}}'
  else
    formato='{{.Name}}|{{index .Labels "avisens.f1.token"}}'
  fi
  consultar docker "$tipo" inspect --format "$formato" "$ref" || estado=$?
  [ "$estado" -ne 0 ] && return "$estado"
  id="${SALIDA_DOCKER%%|*}"
  token="${SALIDA_DOCKER#*|}"
  if [ "$token" = "$TOKEN" ]; then
    SALIDA_DOCKER="$id"
    return 0
  fi
  echo "AVISO: $tipo $ref existe pero no lleva el token de esta corrida; no se toca." >&2
  return 1
}

# Elimina SOLO lo que esta corrida creó (verificando el token justo antes
# de borrar) y luego comprueba con Docker que ya no queda nada suyo.
limpiar() {
  local estado ref

  if [ "$FASE_CONTENEDOR" -eq 1 ]; then
    ref="${CONTENEDOR_ID:-$CONTENEDOR}"
    estado=0
    es_propio container "$ref" || estado=$?
    if [ "$estado" -eq 0 ]; then
      if ! docker rm -f -v "$SALIDA_DOCKER" >/dev/null 2>&1; then
        echo "ERROR: no se pudo eliminar el contenedor desechable $CONTENEDOR ($SALIDA_DOCKER) -- revisa a mano: docker rm -f -v $SALIDA_DOCKER" >&2
        return 1
      fi
    elif [ "$estado" -eq 2 ]; then
      echo "ERROR: no se pudo consultar el contenedor desechable $ref (Docker puede estar inaccesible) -- no se asume que no hay nada que limpiar. Detalle: $DETALLE_DOCKER" >&2
      return 1
    fi
  fi

  if [ "$FASE_VOLUMEN" -eq 1 ]; then
    estado=0
    es_propio volume "$VOLUMEN" || estado=$?
    if [ "$estado" -eq 0 ]; then
      if ! docker volume rm -f "$VOLUMEN" >/dev/null 2>&1; then
        echo "ERROR: no se pudo eliminar el volumen desechable $VOLUMEN -- revisa a mano: docker volume rm $VOLUMEN" >&2
        return 1
      fi
    elif [ "$estado" -eq 2 ]; then
      echo "ERROR: no se pudo consultar el volumen desechable $VOLUMEN (Docker puede estar inaccesible). Detalle: $DETALLE_DOCKER" >&2
      return 1
    fi
  fi

  verificar_ausencia
}

# Comprobación final, independiente del borrado: el contenedor registrado no
# existe y no queda ningún contenedor, volumen ni red con el token.
verificar_ausencia() {
  local estado tipo
  if [ -n "$CONTENEDOR_ID" ]; then
    estado=0
    consultar docker container inspect "$CONTENEDOR_ID" || estado=$?
    if [ "$estado" -ne 1 ]; then
      echo "ERROR: el contenedor $CONTENEDOR_ID sigue existiendo o no se pudo confirmar su ausencia. $DETALLE_DOCKER" >&2
      return 1
    fi
  fi
  for tipo in contenedor volumen red; do
    if ! listar_con_token "$tipo"; then
      echo "ERROR: no se pudo listar ${tipo}es de esta corrida: $DETALLE_DOCKER" >&2
      return 1
    fi
    if [ -n "$SALIDA_DOCKER" ]; then
      echo "ERROR: quedan recursos ($tipo) con el token de esta corrida: $SALIDA_DOCKER" >&2
      return 1
    fi
  done
  return 0
}

manejar_salida() {
  local codigo_previo=$?
  local codigo_limpieza=0
  trap - EXIT
  trap '' INT TERM
  limpiar || codigo_limpieza=$?
  if [ "$codigo_limpieza" -eq 0 ]; then
    echo "Limpieza verificada: no queda ningún contenedor, volumen ni red de la corrida $CORRIDA."
  fi
  if [ "$codigo_previo" -eq 0 ] && [ "$codigo_limpieza" -ne 0 ]; then
    exit 1
  fi
  exit "$codigo_previo"
}

manejar_senal() {
  local codigo="$1"
  trap - EXIT
  trap '' INT TERM
  if [ -n "$PID_PRUEBA" ]; then
    kill "$PID_PRUEBA" 2>/dev/null || true
    wait "$PID_PRUEBA" 2>/dev/null || true
  fi
  if limpiar; then
    echo "Limpieza verificada: no queda ningún contenedor, volumen ni red de la corrida $CORRIDA."
  fi
  exit "$codigo"
}

echo "Corrida desechable: $CORRIDA"
exigir_terreno_libre || exit 1

trap manejar_salida EXIT
trap 'manejar_senal 130' INT
trap 'manejar_senal 143' TERM

FASE_VOLUMEN=1
docker volume create --label "$ETIQUETA_CORRIDA" --label "$ETIQUETA_TOKEN" "$VOLUMEN" >/dev/null
ESTADO_VOLUMEN=0
es_propio volume "$VOLUMEN" || ESTADO_VOLUMEN=$?
if [ "$ESTADO_VOLUMEN" -eq 1 ]; then
  echo "ERROR: el volumen $VOLUMEN apareció sin el token de esta corrida (lo creó otro proceso); no se adopta ni se borra." >&2
  exit 1
elif [ "$ESTADO_VOLUMEN" -eq 2 ]; then
  echo "ERROR: no se pudo comprobar el volumen recién creado $VOLUMEN (Docker puede estar inaccesible). Detalle: $DETALLE_DOCKER" >&2
  exit 1
fi
VOLUMEN_PROPIO=1

FASE_CONTENEDOR=1
CONTENEDOR_ID="$(docker run -d --name "$CONTENEDOR" \
  --label "$ETIQUETA_CORRIDA" --label "$ETIQUETA_TOKEN" \
  -e POSTGRES_USER=avisens -e POSTGRES_PASSWORD=f1_desechable \
  -e POSTGRES_DB=avisens_test \
  -v "$VOLUMEN":/var/lib/postgresql/data \
  -p 127.0.0.1::5432 postgres:17-alpine)"
echo "Recursos creados por esta corrida: contenedor $CONTENEDOR_ID, volumen $VOLUMEN (propio=$VOLUMEN_PROPIO)."

echo "Esperando a que Postgres esté listo..."
LISTO=0
for _ in $(seq 1 60); do
  if docker exec "$CONTENEDOR_ID" pg_isready -U avisens -d avisens_test >/dev/null 2>&1; then
    LISTO=1
    break
  fi
  sleep 1
done
if [ "$LISTO" -ne 1 ]; then
  echo "ERROR: Postgres desechable no estuvo listo a tiempo" >&2
  exit 1
fi

PUERTO_HOST="$(docker port "$CONTENEDOR_ID" 5432/tcp | head -1 | sed 's/.*://')"
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
