# Imagen de la base de datos PostgreSQL para Avisens.
#
# El esquema lo administra ÚNICAMENTE Prisma: el backend ejecuta
# `prisma migrate deploy` al arrancar (ver avisens-backend/docker-entrypoint.sh).
# Por eso aquí ya NO hay scripts de creación de tablas.
#
# PostgreSQL 16 estándar. Se usó TimescaleDB para `mediciones`, pero se revirtió
# a Postgres normal para poder desplegar en hosts gestionados (Supabase) que no
# ofrecen esa extensión. A la escala del proyecto no se necesita partición por
# tiempo; `mediciones` es una tabla normal (con PK compuesta, inofensiva).
FROM postgres:16-alpine
