#!/usr/bin/env bash
# Prueba que la limpieza de los stacks desechables (test-persistencia.sh,
# test-instalacion-limpia.sh) NUNCA convierte "no pude preguntarle a Docker"
# en "no hay nada que limpiar". Antes del endurecimiento, un listado que
# fallaba (p. ej. Docker inaccesible) se tragaba con "|| true" y se veía
# igual que una lista vacía de verdad -- la limpieza "tenía éxito" en
# silencio sin haber comprobado nada. Corre los scripts REALES apuntando a
# un DOCKER_HOST que no existe: deben fallar de forma observable, nunca
# reportar éxito ni "nada que limpiar".
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DOCKER_HOST_FALSO="unix:///tmp/avisens-test-socket-inexistente-$$.sock"

fallos=0
ok() { echo "OK: $*"; }
mal() { echo "FALLO: $*" >&2; fallos=$((fallos + 1)); }

probar() {
  local script="$1" nombre="$2"
  local log codigo
  log="$(mktemp)"
  if DOCKER_HOST="$DOCKER_HOST_FALSO" "$script" >"$log" 2>&1; then
    codigo=0
  else
    codigo=$?
  fi

  if [ "$codigo" -eq 0 ]; then
    mal "$nombre: terminó con éxito (código 0) aunque Docker era inaccesible -- no debía pasar"
  elif grep -q "^Nada que limpiar:" "$log"; then
    mal "$nombre: reportó el mensaje de éxito 'Nada que limpiar:' con Docker inaccesible -- justo el bug que debía corregirse"
    cat "$log" >&2
  elif grep -qi "Docker puede estar inaccesible\|no se pudieron listar\|no se pudo contactar a Docker\|failed to connect to the docker API" "$log"; then
    ok "$nombre: falla de forma observable y explícita cuando Docker es inaccesible (código $codigo)"
  else
    mal "$nombre: falló (código $codigo) pero sin un mensaje que explique que Docker era inaccesible"
    cat "$log" >&2
  fi
  rm -f "$log"
}

echo "=== Limpieza de test-persistencia.sh con Docker inaccesible ==="
probar "$REPO_ROOT/scripts/test-persistencia.sh" "test-persistencia.sh"

echo "=== Limpieza de test-instalacion-limpia.sh con Docker inaccesible ==="
probar "$REPO_ROOT/scripts/test-instalacion-limpia.sh" "test-instalacion-limpia.sh"

echo ""
if [ "$fallos" -eq 0 ]; then
  echo "RESULTADO: ambas limpiezas reportan un fallo observable ante Docker inaccesible, nunca 'nada que limpiar'."
  exit 0
else
  echo "RESULTADO: $fallos verificación(es) fallaron." >&2
  exit 1
fi
