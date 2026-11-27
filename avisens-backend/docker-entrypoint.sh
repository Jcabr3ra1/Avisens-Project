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
# Si una migracion falla no se arranca la app: el codigo nuevo espera un
# esquema o unos datos que no estan. Con el healthcheck configurado en Railway
# (railway.json), esta salida marca el despliegue como fallido y el ANTERIOR
# sigue sirviendo, asi que fallar aqui ya no deja la API caida.
if ! ./node_modules/.bin/prisma migrate deploy; then
  echo "!!> Las migraciones fallaron. No se arranca la aplicacion."
  echo "!!> El despliegue anterior sigue sirviendo. Revisa el error de arriba:"
  echo "!!>   - P3009 = quedo una migracion fallida; hay que resolverla."
  echo "!!>   - un choque de constraint = la migracion asume datos que no son."
  exit 1
fi

# Siembra opcional: crea el usuario admin si RUN_SEED=true. El seed es
# idempotente (no duplica), así que es seguro en cada arranque. Se activa en
# el docker-compose local; en producción se deja apagado (o solo el 1er deploy).
if [ "$RUN_SEED" = "true" ]; then
  echo "==> Ejecutando seed (idempotente)..."
  ./node_modules/.bin/tsx prisma/seeds/seed.ts
fi

echo "==> Iniciando la aplicación..."
exec node dist/main
