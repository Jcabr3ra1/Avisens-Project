#!/usr/bin/env bash
# Prueba de concurrencia real contra Postgres para la rotación/revocación de
# sesiones (session_id + hash SHA-256, compare-and-swap). Corre por completo
# en un contenedor Postgres DESECHABLE, propio de esta corrida -- nunca toca
# avisens-project ni su base. El bloqueo se confirma con pg_blocking_pids
# desde Postgres mismo (ver concurrencia-sesiones.mjs), no con que una
# promesa de JS tarde en resolver.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTENEDOR="avisens-concurrencia-sesiones-test-$(date +%s)-$$"
PUERTO_HOST=""

# Limpieza endurecida, acotada exclusivamente a ESTE contenedor (nunca un
# prune global, que afectaría recursos de otras corridas o del propio
# avisens-project):
#   - "-v" en "docker rm" se lleva también el volumen anónimo que la propia
#     imagen de postgres declara para /var/lib/postgresql/data -- sin esto
#     quedaba huérfano en disco en cada corrida.
#   - Si el contenedor nunca llegó a crearse, no hay nada que limpiar (no
#     es un fallo).
#   - Un fallo real de "docker rm" NO se oculta con "|| true": se informa y
#     se refleja en el código de salida.
#   - INT/TERM limpian y terminan con exit explícito -- sin eso, el script
#     podría seguir corriendo después de atender la señal.
limpiar() {
  if ! docker inspect "$CONTENEDOR" >/dev/null 2>&1; then
    return 0
  fi
  if ! docker rm -f -v "$CONTENEDOR" >/dev/null 2>&1; then
    echo "ERROR: no se pudo eliminar el contenedor desechable $CONTENEDOR (ni su volumen anónimo) -- revisa a mano: docker rm -f -v $CONTENEDOR" >&2
    return 1
  fi
  return 0
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

echo "Contenedor desechable: $CONTENEDOR"
docker run -d --name "$CONTENEDOR" \
  -e POSTGRES_PASSWORD=test -e POSTGRES_DB=test \
  -p 127.0.0.1::5432 postgres:16-alpine >/dev/null

echo "Esperando a que Postgres esté listo..."
for _ in $(seq 1 30); do
  docker exec "$CONTENEDOR" pg_isready -U postgres >/dev/null 2>&1 && break
  sleep 1
done

PUERTO_HOST="$(docker port "$CONTENEDOR" 5432/tcp | cut -d: -f2)"
DATABASE_URL="postgresql://postgres:test@127.0.0.1:${PUERTO_HOST}/test"
export DATABASE_URL

echo "Aplicando las migraciones reales (prisma migrate deploy)..."
(cd "$REPO_ROOT" && npx prisma migrate deploy)

echo "Sembrando datos mínimos (un usuario y un rol ficticios)..."
docker exec "$CONTENEDOR" psql -U postgres -d test -c "
INSERT INTO roles (id, nombre) VALUES (1, 'Propietario') ON CONFLICT DO NOTHING;
INSERT INTO usuarios (id, rol_id, nombre_completo, cedula, email, password_hash)
VALUES (1, 1, 'Ficticio de prueba', '0000000000', 'concurrencia@ejemplo.test', 'x')
ON CONFLICT DO NOTHING;
" >/dev/null

echo "Corriendo los escenarios de concurrencia..."
node "$REPO_ROOT/scripts/concurrencia-sesiones.mjs"
