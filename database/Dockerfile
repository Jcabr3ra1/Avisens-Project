# Imagen de la base de datos PostgreSQL para Avisens.
# Parte de la imagen oficial y carga el esquema inicial automáticamente:
# todo script en /docker-entrypoint-initdb.d se ejecuta UNA sola vez, cuando
# el volumen de datos está vacío (primer arranque).
FROM postgres:16-alpine

COPY init/ /docker-entrypoint-initdb.d/
