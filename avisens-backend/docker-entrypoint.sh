#!/bin/sh
# Punto de entrada del contenedor del backend.
# Prisma es la única fuente de verdad del esquema: antes de arrancar la app,
# aplicamos las migraciones pendientes contra la base de datos. Es idempotente,
# así que es seguro correrlo en cada arranque.
set -e

echo "==> Aplicando migraciones de Prisma..."
npx prisma migrate deploy

echo "==> Iniciando la aplicación..."
exec node dist/main
