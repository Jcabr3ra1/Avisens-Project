#!/usr/bin/env bash
# Comprueba que scripts/test-e2e-galpon-asignaciones.sh limpia SUS recursos
# (contenedor y volumen) en éxito, en fallo, ante TERM y que se niega a
# declarar limpieza si Docker está inaccesible o el borrado falla. Cada
# escenario usa un nombre propio (prefijo avisens-f1-limpieza-test-) y nunca
# toca recursos ajenos: al final comprueba que avisens-project y
# avisens-db-aislada-2 siguen exactamente como estaban.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$REPO_ROOT/scripts/test-e2e-galpon-asignaciones.sh"
BASE="avisens-f1-limpieza-test-$(date +%s)-$$"
DIR_TMP="$(mktemp -d)"
FALLOS=0
ESCENARIOS=()

foto_ajena() {
  {
    docker ps -a --format '{{.Names}}|{{.Status}}' | grep -E '^(avisens-project|avisens-(db|backend|frontend|ml|redis)|avisens-db-aislada-2)' | sed -E 's/Up [^|]*/Up/'
    docker volume ls -q | grep -E '^(avisens-project_|avisens_pg_data_aislada_2$)'
  } | sort
}

existe_recurso() {
  local nombre="$1"
  docker container inspect "$nombre" >/dev/null 2>&1 && return 0
  docker volume inspect "$nombre-data" >/dev/null 2>&1 && return 0
  return 1
}

limpiar_escenario() {
  local nombre="$1"
  docker rm -f -v "$nombre" >/dev/null 2>&1
  docker volume rm -f "$nombre-data" >/dev/null 2>&1
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

AJENO_ANTES="$(foto_ajena)"

echo "Escenario 1: corrida exitosa"
N1="$BASE-ok"
AVISENS_E2E_NOMBRE="$N1" AVISENS_E2E_COMANDO='true' bash "$SCRIPT" >"$DIR_TMP/1.log" 2>&1
COD=$?
verificar "sale con 0" "$([ "$COD" -eq 0 ] && echo ok)"
verificar "declara limpieza verificada" "$(grep -q '^Limpieza verificada' "$DIR_TMP/1.log" && echo ok)"
verificar "no quedan contenedor ni volumen" "$(existe_recurso "$N1" || echo ok)"

echo "Escenario 2: fallo provocado en las pruebas (exit 7)"
N2="$BASE-fallo"
AVISENS_E2E_NOMBRE="$N2" AVISENS_E2E_COMANDO='exit 7' bash "$SCRIPT" >"$DIR_TMP/2.log" 2>&1
COD=$?
verificar "propaga el código 7 de las pruebas" "$([ "$COD" -eq 7 ] && echo ok)"
verificar "declara limpieza verificada" "$(grep -q '^Limpieza verificada' "$DIR_TMP/2.log" && echo ok)"
verificar "no quedan contenedor ni volumen" "$(existe_recurso "$N2" || echo ok)"

echo "Escenario 3: TERM mientras corren las pruebas"
N3="$BASE-term"
AVISENS_E2E_NOMBRE="$N3" AVISENS_E2E_COMANDO='sleep 120' bash "$SCRIPT" >"$DIR_TMP/3.log" 2>&1 &
PID=$!
for _ in $(seq 1 120); do
  grep -q '^Ejecutando las pruebas de F1' "$DIR_TMP/3.log" 2>/dev/null && break
  sleep 1
done
verificar "el recurso existía al enviar TERM" "$(existe_recurso "$N3" && echo ok)"
kill -TERM "$PID" 2>/dev/null
wait "$PID"
COD=$?
verificar "sale con 143" "$([ "$COD" -eq 143 ] && echo ok)"
verificar "no quedan contenedor ni volumen" "$(existe_recurso "$N3" || echo ok)"

echo "Escenario 4: Docker inaccesible"
N4="$BASE-sindocker"
DOCKER_HOST="tcp://127.0.0.1:1" AVISENS_E2E_NOMBRE="$N4" AVISENS_E2E_COMANDO='true' bash "$SCRIPT" >"$DIR_TMP/4.log" 2>&1
COD=$?
verificar "sale con error (distinto de 0)" "$([ "$COD" -ne 0 ] && echo ok)"
verificar "informa que Docker puede estar inaccesible" "$(grep -q 'Docker puede estar inaccesible' "$DIR_TMP/4.log" && echo ok)"
verificar "NO declara limpieza verificada" "$(grep -q '^Limpieza verificada' "$DIR_TMP/4.log" || echo ok)"

echo "Escenario 5: falla el borrado del contenedor"
N5="$BASE-rmfalla"
DOCKER_REAL="$(command -v docker)"
cat >"$DIR_TMP/docker" <<EOF
#!/usr/bin/env bash
if [ "\$1" = "rm" ]; then
  echo "fallo simulado de docker rm" >&2
  exit 1
fi
exec "$DOCKER_REAL" "\$@"
EOF
chmod +x "$DIR_TMP/docker"
PATH="$DIR_TMP:$PATH" AVISENS_E2E_NOMBRE="$N5" AVISENS_E2E_COMANDO='true' bash "$SCRIPT" >"$DIR_TMP/5.log" 2>&1
COD=$?
verificar "sale con error (distinto de 0)" "$([ "$COD" -ne 0 ] && echo ok)"
verificar "informa que no se pudo eliminar el contenedor" "$(grep -q 'no se pudo eliminar el contenedor desechable' "$DIR_TMP/5.log" && echo ok)"
verificar "NO declara limpieza verificada" "$(grep -q '^Limpieza verificada' "$DIR_TMP/5.log" || echo ok)"
limpiar_escenario "$N5"
verificar "el resto del escenario 5 se limpió a mano (propio)" "$(existe_recurso "$N5" || echo ok)"

echo "Recursos ajenos"
AJENO_DESPUES="$(foto_ajena)"
verificar "avisens-project y avisens-db-aislada-2 quedaron intactos" "$([ "$AJENO_ANTES" = "$AJENO_DESPUES" ] && echo ok)"

for n in "$N1" "$N2" "$N3" "$N4" "$N5"; do
  if existe_recurso "$n"; then
    echo "  AVISO: quedó algo de $n; se elimina por su nombre exacto (propio de esta prueba)"
    limpiar_escenario "$n"
  fi
done

rm -rf "$DIR_TMP"
if [ "$FALLOS" -ne 0 ]; then
  echo "RESULTADO: $FALLOS comprobación(es) fallaron" >&2
  exit 1
fi
echo "RESULTADO: todas las comprobaciones de limpieza pasaron"
