#!/bin/sh
# Punto de entrada del contenedor del backend.
# Prisma es la única fuente de verdad del esquema: antes de arrancar la app,
# aplicamos las migraciones pendientes contra la base de datos. Es idempotente,
# así que es seguro correrlo en cada arranque.
#
# Se usan los binarios de node_modules/.bin directamente (no npm ni pnpm), así
# el runtime no depende de ningún gestor de paquetes.
set -e

echo "==> Aplicando migraciones de Prisma..."
./node_modules/.bin/prisma migrate deploy

# Siembra opcional: crea el usuario admin si RUN_SEED=true. El seed es
# idempotente (no duplica), así que es seguro en cada arranque. Se activa en
# el docker-compose local; en producción se deja apagado (o solo el 1er deploy).
if [ "$RUN_SEED" = "true" ]; then
  echo "==> Ejecutando seed (idempotente)..."
  ./node_modules/.bin/tsx prisma/seeds/seed.ts
fi

echo "==> Iniciando la aplicación..."
exec node dist/main
