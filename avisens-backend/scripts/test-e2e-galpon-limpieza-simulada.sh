#!/usr/bin/env bash
# Comprobaciones COMPLETAMENTE SIMULADAS de la limpieza de
# scripts/test-e2e-galpon-asignaciones.sh: docker y pnpm se sustituyen en el
# PATH por scripts/docker-simulado.sh y un pnpm vacío. No se llama al Docker
# real (la suite lo garantiza con un docker centinela al final del PATH que
# falla si alguien lo invoca), no se crean contenedores ni volúmenes reales y
# todo el estado vive en un directorio temporal que se borra con un trap.
#
# Las pruebas con Docker real aislado están en
# scripts/test-e2e-galpon-limpieza-real.sh.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$REPO_ROOT/scripts/test-e2e-galpon-asignaciones.sh"
SIMULADOR="$REPO_ROOT/scripts/docker-simulado.sh"
DIR_TMP="$(mktemp -d)"
FALLOS=0
PID_ACTUAL=""

terminar() {
  local codigo="$1"
  trap - EXIT INT TERM
  if [ -n "$PID_ACTUAL" ]; then
    kill "$PID_ACTUAL" 2>/dev/null || true
    wait "$PID_ACTUAL" 2>/dev/null || true
  fi
  rm -rf "$DIR_TMP"
  if [ -e "$DIR_TMP" ]; then
    echo "ERROR: no se pudo borrar el directorio temporal $DIR_TMP" >&2
    exit 1
  fi
  exit "$codigo"
}
trap 'terminar $?' EXIT
trap 'echo "Interrumpida" >&2; terminar 130' INT
trap 'echo "Interrumpida" >&2; terminar 143' TERM

mkdir -p "$DIR_TMP/bin" "$DIR_TMP/centinela"
cat >"$DIR_TMP/bin/docker" <<EOF
#!/usr/bin/env bash
exec bash "$SIMULADOR" "\$@"
EOF
cat >"$DIR_TMP/bin/pnpm" <<'EOF'
#!/usr/bin/env bash
echo "pnpm simulado: $*"
EOF
cat >"$DIR_TMP/centinela/docker" <<EOF
#!/usr/bin/env bash
echo "\$*" >>"$DIR_TMP/docker-real-invocado"
exit 99
EOF
chmod +x "$DIR_TMP/bin/docker" "$DIR_TMP/bin/pnpm" "$DIR_TMP/centinela/docker"
PATH_SIMULADO="$DIR_TMP/bin:$(printf '%s' "$PATH" | tr ':' '\n' | grep -v -x -F "$(dirname "$(command -v docker 2>/dev/null || echo /nonexistent/docker)")" | paste -sd: -):$DIR_TMP/centinela"

verificar() {
  local descripcion="$1" condicion="$2"
  if [ "$condicion" = "ok" ]; then
    echo "  OK    $descripcion"
  else
    echo "  FALLA $descripcion"
    FALLOS=$((FALLOS + 1))
  fi
}

ESTADO=""
nuevo_estado() {
  ESTADO="$DIR_TMP/estado-$1"
  mkdir -p "$ESTADO"
  [ -n "${2:-}" ] && echo "$2" >"$ESTADO/modo"
  return 0
}

sim() {
  DOCKER_SIM_DIR="$ESTADO" bash "$SIMULADOR" "$@"
}

correr() {
  local log="$1" nombre="$2" comando="$3"
  PATH="$PATH_SIMULADO" DOCKER_SIM_DIR="$ESTADO" \
    AVISENS_E2E_NOMBRE="$nombre" AVISENS_E2E_COMANDO="$comando" \
    bash "$SCRIPT" >"$log" 2>&1
}

sin_recursos() {
  [ -z "$(ls -A "$ESTADO/contenedores" 2>/dev/null)" ] && [ -z "$(ls -A "$ESTADO/volumenes" 2>/dev/null)" ]
}

existe_contenedor() { [ -d "$ESTADO/contenedores/$1" ]; }
existe_volumen() { [ -d "$ESTADO/volumenes/$1" ]; }
llamo() { grep -qE "$1" "$ESTADO/llamadas" 2>/dev/null; }

echo "S1: nombre fuera del espacio de pruebas (avisens-db, que existe)"
nuevo_estado s1
AJENO="$(sim sim-crear-contenedor avisens-db com.docker.compose.project=avisens-project)"
correr "$DIR_TMP/s1.log" avisens-db true
COD=$?
verificar "sale con 2" "$([ "$COD" -eq 2 ] && echo ok)"
verificar "explica que está fuera del espacio de pruebas" "$(grep -q 'fuera del espacio de pruebas' "$DIR_TMP/s1.log" && echo ok)"
verificar "el contenedor avisens-db sigue intacto" "$(existe_contenedor "$AJENO" && echo ok)"
verificar "no se llamó a docker para crear ni borrar" "$(llamo '^(rm|run|volume (create|rm))' || echo ok)"
verificar "NO declara limpieza verificada" "$(grep -q '^Limpieza verificada' "$DIR_TMP/s1.log" || echo ok)"

echo "S2: corrida exitosa"
nuevo_estado s2
correr "$DIR_TMP/s2.log" avisens-f1-e2e-sim-ok true
COD=$?
verificar "sale con 0" "$([ "$COD" -eq 0 ] && echo ok)"
verificar "registra los recursos creados" "$(grep -q '^Recursos creados por esta corrida: contenedor [0-9a-f]\{64\}' "$DIR_TMP/s2.log" && echo ok)"
verificar "declara limpieza verificada" "$(grep -q '^Limpieza verificada' "$DIR_TMP/s2.log" && echo ok)"
verificar "no queda ningún recurso" "$(sin_recursos && echo ok)"
verificar "borró el contenedor por su id" "$(llamo '^rm -f -v [0-9a-f]{64}$' && echo ok)"

echo "S3: fallo provocado en las pruebas (exit 7)"
nuevo_estado s3
correr "$DIR_TMP/s3.log" avisens-f1-e2e-sim-fallo 'exit 7'
COD=$?
verificar "propaga el código 7" "$([ "$COD" -eq 7 ] && echo ok)"
verificar "declara limpieza verificada" "$(grep -q '^Limpieza verificada' "$DIR_TMP/s3.log" && echo ok)"
verificar "no queda ningún recurso" "$(sin_recursos && echo ok)"

echo "S4: TERM mientras corren las pruebas"
nuevo_estado s4
PATH="$PATH_SIMULADO" DOCKER_SIM_DIR="$ESTADO" AVISENS_E2E_NOMBRE=avisens-f1-e2e-sim-term \
  AVISENS_E2E_COMANDO='sleep 30' bash "$SCRIPT" >"$DIR_TMP/s4.log" 2>&1 &
PID_ACTUAL=$!
for _ in $(seq 1 50); do
  grep -q '^Ejecutando las pruebas de F1' "$DIR_TMP/s4.log" 2>/dev/null && break
  sleep 0.2
done
verificar "había recursos al enviar TERM" "$(sin_recursos || echo ok)"
kill -TERM "$PID_ACTUAL" 2>/dev/null
wait "$PID_ACTUAL"
COD=$?
PID_ACTUAL=""
verificar "sale con 143" "$([ "$COD" -eq 143 ] && echo ok)"
verificar "declara limpieza verificada" "$(grep -q '^Limpieza verificada' "$DIR_TMP/s4.log" && echo ok)"
verificar "no queda ningún recurso" "$(sin_recursos && echo ok)"

echo "S5: Docker inaccesible"
nuevo_estado s5 inaccesible
correr "$DIR_TMP/s5.log" avisens-f1-e2e-sim-sindocker true
COD=$?
verificar "sale con error" "$([ "$COD" -ne 0 ] && echo ok)"
verificar "informa que Docker puede estar inaccesible" "$(grep -q 'Docker puede estar inaccesible' "$DIR_TMP/s5.log" && echo ok)"
verificar "NO declara limpieza verificada" "$(grep -q '^Limpieza verificada' "$DIR_TMP/s5.log" || echo ok)"

echo "S6: falla el borrado del contenedor propio"
nuevo_estado s6
correr "$DIR_TMP/s6.log" avisens-f1-e2e-sim-rmfalla 'echo rm_falla > "$DOCKER_SIM_DIR/modo"'
COD=$?
verificar "sale con error" "$([ "$COD" -ne 0 ] && echo ok)"
verificar "informa que no se pudo eliminar el contenedor" "$(grep -q 'no se pudo eliminar el contenedor desechable' "$DIR_TMP/s6.log" && echo ok)"
verificar "NO declara limpieza verificada" "$(grep -q '^Limpieza verificada' "$DIR_TMP/s6.log" || echo ok)"

echo "S7: colisión de contenedor (ya existe uno con el mismo nombre)"
nuevo_estado s7
AJENO="$(sim sim-crear-contenedor avisens-f1-e2e-sim-colision)"
correr "$DIR_TMP/s7.log" avisens-f1-e2e-sim-colision true
COD=$?
verificar "sale con error" "$([ "$COD" -ne 0 ] && echo ok)"
verificar "el contenedor preexistente sigue intacto" "$(existe_contenedor "$AJENO" && echo ok)"
verificar "no intentó crear ni borrar nada" "$(llamo '^(rm|run|volume (create|rm))' || echo ok)"

echo "S7b: colisión en docker run (otro proceso crea el contenedor tras la comprobación)"
nuevo_estado s7b carrera_contenedor
correr "$DIR_TMP/s7b.log" avisens-f1-e2e-sim-carrera true
COD=$?
AJENO="$(ls "$ESTADO/contenedores")"
verificar "sale con error" "$([ "$COD" -ne 0 ] && echo ok)"
verificar "el contenedor que causó la colisión sigue intacto" "$([ -n "$AJENO" ] && existe_contenedor "$AJENO" && echo ok)"
verificar "nunca llamó a docker rm" "$(llamo '^rm ' || echo ok)"
verificar "avisa que no lleva el token y no lo toca" "$(grep -q 'no lleva el token de esta corrida; no se toca' "$DIR_TMP/s7b.log" && echo ok)"
verificar "sí borró su propio volumen" "$(existe_volumen avisens-f1-e2e-sim-carrera-data || echo ok)"

echo "S8: volumen preexistente sin etiquetas"
nuevo_estado s8
sim sim-crear-volumen avisens-f1-e2e-sim-volumen-data
correr "$DIR_TMP/s8.log" avisens-f1-e2e-sim-volumen true
COD=$?
verificar "sale con error" "$([ "$COD" -ne 0 ] && echo ok)"
verificar "el volumen preexistente sigue intacto" "$(existe_volumen avisens-f1-e2e-sim-volumen-data && echo ok)"
verificar "no intentó crear ni borrar nada" "$(llamo '^(rm|run|volume (create|rm))' || echo ok)"

echo "S8b: volume create adopta un volumen creado por otro proceso"
nuevo_estado s8b carrera_volumen
correr "$DIR_TMP/s8b.log" avisens-f1-e2e-sim-vcarrera true
COD=$?
verificar "sale con error" "$([ "$COD" -ne 0 ] && echo ok)"
verificar "detecta que el volumen no lleva su token" "$(grep -q 'apareció sin el token de esta corrida' "$DIR_TMP/s8b.log" && echo ok)"
verificar "el volumen ajeno sigue intacto" "$(existe_volumen avisens-f1-e2e-sim-vcarrera-data && echo ok)"
verificar "nunca llamó a volume rm ni a run" "$(llamo '^(run|volume rm)' || echo ok)"

echo "S9: etiqueta ajena (mismo nombre y misma etiqueta de corrida, otro token)"
nuevo_estado s9
AJENO="$(sim sim-crear-contenedor avisens-f1-e2e-sim-etiqueta avisens.corrida=avisens-f1-e2e-sim-etiqueta avisens.f1.token=0123456789abcdef0123456789abcdef)"
sim sim-crear-volumen avisens-f1-e2e-sim-etiqueta-data avisens.corrida=avisens-f1-e2e-sim-etiqueta avisens.f1.token=0123456789abcdef0123456789abcdef
correr "$DIR_TMP/s9.log" avisens-f1-e2e-sim-etiqueta true
COD=$?
verificar "sale con error" "$([ "$COD" -ne 0 ] && echo ok)"
verificar "el contenedor con etiqueta ajena sigue intacto" "$(existe_contenedor "$AJENO" && echo ok)"
verificar "el volumen con etiqueta ajena sigue intacto" "$(existe_volumen avisens-f1-e2e-sim-etiqueta-data && echo ok)"
verificar "no intentó crear ni borrar nada" "$(llamo '^(rm|run|volume (create|rm))' || echo ok)"

echo "S10: token ya usado por otro recurso"
nuevo_estado s10
sim sim-crear-volumen otro-volumen avisens.f1.token=fedcba9876543210fedcba9876543210
PATH="$PATH_SIMULADO" DOCKER_SIM_DIR="$ESTADO" AVISENS_E2E_NOMBRE=avisens-f1-e2e-sim-token \
  AVISENS_E2E_TOKEN=fedcba9876543210fedcba9876543210 AVISENS_E2E_COMANDO=true \
  bash "$SCRIPT" >"$DIR_TMP/s10.log" 2>&1
COD=$?
verificar "sale con error" "$([ "$COD" -ne 0 ] && echo ok)"
verificar "el recurso con ese token sigue intacto" "$(existe_volumen otro-volumen && echo ok)"
verificar "no intentó crear ni borrar nada" "$(llamo '^(rm|run|volume (create|rm))' || echo ok)"

echo "S11: el contenedor propio se sustituye por uno ajeno con el mismo nombre"
nuevo_estado s11
correr "$DIR_TMP/s11.log" avisens-f1-e2e-sim-reemplazo \
  'docker sim-borrar-contenedor avisens-f1-e2e-sim-reemplazo && docker sim-crear-contenedor avisens-f1-e2e-sim-reemplazo > "$DOCKER_SIM_DIR/ajeno"'
COD=$?
AJENO="$(cat "$ESTADO/ajeno" 2>/dev/null)"
verificar "sale con 0" "$([ "$COD" -eq 0 ] && echo ok)"
verificar "el contenedor sustituto (ajeno) sigue intacto" "$([ -n "$AJENO" ] && existe_contenedor "$AJENO" && echo ok)"
verificar "nunca llamó a docker rm" "$(llamo '^rm ' || echo ok)"
verificar "su propio volumen sí se borró" "$(existe_volumen avisens-f1-e2e-sim-reemplazo-data || echo ok)"

echo "Aislamiento"
verificar "el Docker real nunca se invocó" "$([ ! -e "$DIR_TMP/docker-real-invocado" ] && echo ok)"

if [ "$FALLOS" -ne 0 ]; then
  echo "RESULTADO: $FALLOS comprobación(es) simuladas fallaron" >&2
  exit 1
fi
echo "RESULTADO: todas las comprobaciones simuladas de limpieza pasaron"
