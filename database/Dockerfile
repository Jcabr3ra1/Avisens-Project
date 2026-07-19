# Imagen de la base de datos PostgreSQL para Avisens.
#
# El esquema lo administra ÚNICAMENTE Prisma: el backend ejecuta
# `prisma migrate deploy` al arrancar (ver avisens-backend/docker-entrypoint.sh).
# Por eso aquí ya NO hay scripts de creación de tablas.
#
# Este Dockerfile queda como punto de extensión para configuración a nivel de
# servidor que Prisma no maneja; por ejemplo, cuando implementemos las series de
# tiempo de `mediciones` habrá que habilitar la extensión TimescaleDB.
FROM postgres:16-alpine
