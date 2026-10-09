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

limpiar() {
  docker rm -f "$CONTENEDOR" >/dev/null 2>&1 || true
}
trap limpiar EXIT INT TERM

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
