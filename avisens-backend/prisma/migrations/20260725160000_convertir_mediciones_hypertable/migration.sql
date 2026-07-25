-- Convierte `mediciones` en una hypertable de TimescaleDB.
--
-- TimescaleDB es una EXTENSION de PostgreSQL (no lo reemplaza): la tabla sigue
-- siendo una tabla normal de Postgres, pero se particiona automaticamente por
-- `fecha_hora` en chunks. Asi las consultas por rango de tiempo escalan a
-- millones de filas sin degradarse.
--
-- Requisito que ya dejamos listo: la columna de particion (fecha_hora) hace
-- parte de la PK compuesta (id, fecha_hora). create_hypertable lo exige.

-- 1. Habilitar la extension (idempotente).
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- 2. Convertir la tabla existente en hypertable. Se ejecuta con la tabla vacia,
--    asi que no hace falta migrar datos.
SELECT create_hypertable('mediciones', 'fecha_hora', if_not_exists => TRUE);
