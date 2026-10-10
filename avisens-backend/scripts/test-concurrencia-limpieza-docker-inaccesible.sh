#!/usr/bin/env bash
# Prueba que la limpieza de test-concurrencia-sesiones.sh NUNCA convierte
# "no pude preguntarle a Docker" en "no hay nada que limpiar". Corre el
# script real apuntando a un DOCKER_HOST que no existe: debe fallar de
# forma observable (código de salida distinto de cero, con un mensaje que
# diga que Docker puede estar inaccesible) -- nunca declarar éxito en
# silencio. No crea ni toca ningún contenedor real (Docker es inalcanzable
# desde el principio).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCKER_HOST_FALSO="unix:///tmp/avisens-concurrencia-socket-inexistente-$$.sock"

log="$(mktemp)"
trap 'rm -f "$log"' EXIT

codigo=0
DOCKER_HOST="$DOCKER_HOST_FALSO" "$REPO_ROOT/scripts/test-concurrencia-sesiones.sh" >"$log" 2>&1 || codigo=$?

if [ "$codigo" -eq 0 ]; then
  echo "FALLO: el script terminó con éxito (código 0) aunque Docker era inaccesible -- no debía pasar." >&2
  cat "$log" >&2
  exit 1
fi

if grep -q "^Contenedor desechable:" "$log" && ! grep -qi "no se pudo consultar si el contenedor desechable" "$log" && grep -qi "nada que limpiar" "$log"; then
  echo "FALLO: reportó éxito de limpieza con Docker inaccesible." >&2
  cat "$log" >&2
  exit 1
fi

if grep -qi "Docker puede estar inaccesible" "$log"; then
  echo "OK: el script falla de forma observable (código $codigo) y explica que Docker puede estar inaccesible, sin declarar limpieza exitosa."
  exit 0
fi

echo "FALLO: el script falló (código $codigo) pero sin el mensaje esperado sobre Docker inaccesible." >&2
cat "$log" >&2
exit 1
