# Imagen de la base de datos PostgreSQL para Avisens.
#
# El esquema lo administra ÚNICAMENTE Prisma: el backend ejecuta
# `prisma migrate deploy` al arrancar (ver avisens-backend/docker-entrypoint.sh).
# Por eso aquí ya NO hay scripts de creación de tablas.
#
# Imagen con la extensión TimescaleDB para las series de tiempo de `mediciones`
# (hypertable). Está basada en PostgreSQL 16, así que es compatible con el resto
# del esquema que administra Prisma. La extensión y la conversión a hypertable
# se aplican vía migración SQL (ver prisma/migrations/..._convertir_mediciones_hypertable).
FROM timescale/timescaledb:latest-pg16
