#!/usr/bin/env bash
# Pruebas REALES AISLADAS de la limpieza de
# scripts/test-e2e-galpon-asignaciones.sh: usan el Docker real y crean, por
# escenario, un Postgres desechable con nombre avisens-f1-e2e-limpieza-* y
# un token propio (AVISENS_E2E_TOKEN) generado aquí. Comprueban éxito, fallo
# provocado y TERM. Los casos de colisión, etiqueta ajena, Docker
# inaccesible y fallo de borrado están en
# scripts/test-e2e-galpon-limpieza-simulada.sh (sin Docker real).
#
# Si la suite falla o se interrumpe, un trap elimina SOLO los recursos que
# llevan los tokens de sus escenarios, verifica su ausencia y, si no puede,
# termina con error. Al final compara avisens-project y avisens-db-aislada-2
# por ID y StartedAt (contenedores) y CreatedAt (volúmenes): una recreación
# con los mismos nombres se detecta. Solo se leen esos campos de inspect,
# nunca la configuración ni las variables de entorno.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$REPO_ROOT/scripts/test-e2e-galpon-asignaciones.sh"
BASE="avisens-f1-e2e-limpieza-$(date +%s)-$$"
DIR_TMP="$(mktemp -d)"
FALLOS=0
TOKENS=()
PID_ACTUAL=""

nuevo_token() { od -An -N16 -tx1 /dev/urandom | tr -d ' \n'; }

# 0 si existe algún contenedor o volumen con el token, 1 si su ausencia está
# confirmada, 2 si Docker no respondió.
existe_recurso() {
  local token="$1" contenedores volumenes
  contenedores="$(docker ps -a -q --filter "label=avisens.f1.token=$token" 2>&1)" || return 2
  volumenes="$(docker volume ls -q --filter "label=avisens.f1.token=$token" 2>&1)" || return 2
  [ -n "$contenedores$volumenes" ] && return 0
  return 1
}

limpiar_token() {
  local token="$1" ids nombres estado=0
  ids="$(docker ps -a -q --filter "label=avisens.f1.token=$token" 2>&1)" || { echo "ERROR: no se pudieron listar contenedores del token $token: $ids" >&2; return 1; }
  if [ -n "$ids" ]; then
    echo "  AVISO: quedaban contenedores del token $token; se eliminan" >&2
    docker rm -f -v $ids >/dev/null || estado=1
  fi
  nombres="$(docker volume ls -q --filter "label=avisens.f1.token=$token" 2>&1)" || { echo "ERROR: no se pudieron listar volúmenes del token $token: $nombres" >&2; return 1; }
  if [ -n "$nombres" ]; then
    echo "  AVISO: quedaban volúmenes del token $token; se eliminan" >&2
    docker volume rm $nombres >/dev/null || estado=1
  fi
  estado=0
  existe_recurso "$token" || estado=$?
  if [ "$estado" -ne 1 ]; then
    echo "ERROR: no se pudo confirmar la ausencia de los recursos del token $token" >&2
    return 1
  fi
  return 0
}

terminar() {
  local codigo="$1" token
  trap - EXIT
  trap '' INT TERM
  if [ -n "$PID_ACTUAL" ]; then
    kill -TERM "$PID_ACTUAL" 2>/dev/null || true
    wait "$PID_ACTUAL" 2>/dev/null || true
  fi
  for token in ${TOKENS[@]+"${TOKENS[@]}"}; do
    limpiar_token "$token" || codigo=1
  done
  rm -rf "$DIR_TMP"
  exit "$codigo"
}
trap 'terminar $?' EXIT
trap 'echo "Interrumpida: limpiando los recursos de la suite" >&2; terminar 130' INT
trap 'echo "Interrumpida: limpiando los recursos de la suite" >&2; terminar 143' TERM

foto_ajena() {
  local ids volumenes
  ids="$(docker ps -a -q --no-trunc --filter label=com.docker.compose.project=avisens-project)" || return 1
  ids="$ids $(docker container inspect --format '{{.Id}}' avisens-db-aislada-2)" || return 1
  volumenes="$(docker volume ls -q --filter label=com.docker.compose.project=avisens-project)" || return 1
  {
    docker container inspect --format '{{.Name}}|{{.Id}}|{{.State.StartedAt}}|{{.State.Status}}' $ids || return 1
    docker volume inspect --format '{{.Name}}|{{.CreatedAt}}' $volumenes avisens_pg_data_aislada_2 || return 1
  } | sort
}

verificar() {
  local descripcion="$1" condicion="$2"
  if [ "$condicion" = "ok" ]; then
    echo "  OK    $descripcion"
  else
    echo "  FALLA $descripcion"
    FALLOS=$((FALLOS + 1))
  fi
}

ausente() {
  local estado=0
  existe_recurso "$1" || estado=$?
  [ "$estado" -eq 1 ] && echo ok
}

if ! AJENO_ANTES="$(foto_ajena)" || [ -z "$AJENO_ANTES" ]; then
  echo "ERROR: no se pudo tomar la foto de avisens-project y avisens-db-aislada-2 (Docker inaccesible o recursos ausentes)" >&2
  exit 1
fi
echo "Foto previa: $(printf '%s\n' "$AJENO_ANTES" | wc -l | tr -d ' ') recursos ajenos (nombre|id|StartedAt|estado, volumen|CreatedAt)"

echo "R1: corrida exitosa"
T1="$(nuevo_token)"; TOKENS+=("$T1")
AVISENS_E2E_NOMBRE="$BASE-ok" AVISENS_E2E_TOKEN="$T1" AVISENS_E2E_COMANDO='true' bash "$SCRIPT" >"$DIR_TMP/1.log" 2>&1 &
PID_ACTUAL=$!; wait "$PID_ACTUAL"; COD=$?; PID_ACTUAL=""
verificar "sale con 0" "$([ "$COD" -eq 0 ] && echo ok)"
verificar "declara limpieza verificada" "$(grep -q '^Limpieza verificada' "$DIR_TMP/1.log" && echo ok)"
verificar "Docker confirma que no queda nada con su token" "$(ausente "$T1")"

echo "R2: fallo provocado en las pruebas (exit 7)"
T2="$(nuevo_token)"; TOKENS+=("$T2")
AVISENS_E2E_NOMBRE="$BASE-fallo" AVISENS_E2E_TOKEN="$T2" AVISENS_E2E_COMANDO='exit 7' bash "$SCRIPT" >"$DIR_TMP/2.log" 2>&1 &
PID_ACTUAL=$!; wait "$PID_ACTUAL"; COD=$?; PID_ACTUAL=""
verificar "propaga el código 7" "$([ "$COD" -eq 7 ] && echo ok)"
verificar "declara limpieza verificada" "$(grep -q '^Limpieza verificada' "$DIR_TMP/2.log" && echo ok)"
verificar "Docker confirma que no queda nada con su token" "$(ausente "$T2")"

echo "R3: TERM mientras corren las pruebas"
T3="$(nuevo_token)"; TOKENS+=("$T3")
AVISENS_E2E_NOMBRE="$BASE-term" AVISENS_E2E_TOKEN="$T3" AVISENS_E2E_COMANDO='sleep 120' bash "$SCRIPT" >"$DIR_TMP/3.log" 2>&1 &
PID_ACTUAL=$!
for _ in $(seq 1 120); do
  grep -q '^Ejecutando las pruebas de F1' "$DIR_TMP/3.log" 2>/dev/null && break
  sleep 1
done
verificar "había recursos con su token al enviar TERM" "$(existe_recurso "$T3" && echo ok)"
kill -TERM "$PID_ACTUAL" 2>/dev/null
wait "$PID_ACTUAL"; COD=$?; PID_ACTUAL=""
verificar "sale con 143" "$([ "$COD" -eq 143 ] && echo ok)"
verificar "declara limpieza verificada" "$(grep -q '^Limpieza verificada' "$DIR_TMP/3.log" && echo ok)"
verificar "Docker confirma que no queda nada con su token" "$(ausente "$T3")"

echo "Recursos ajenos"
if AJENO_DESPUES="$(foto_ajena)"; then
  verificar "avisens-project y avisens-db-aislada-2: mismos ID, StartedAt y CreatedAt" "$([ "$AJENO_ANTES" = "$AJENO_DESPUES" ] && echo ok)"
else
  verificar "se pudo tomar la foto posterior de los recursos ajenos" ""
fi

if [ "$FALLOS" -ne 0 ]; then
  echo "RESULTADO: $FALLOS comprobación(es) reales fallaron" >&2
  exit 1
fi
echo "RESULTADO: todas las comprobaciones reales de limpieza pasaron"
