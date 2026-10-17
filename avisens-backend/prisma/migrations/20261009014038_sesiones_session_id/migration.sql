-- Identidad estable de sesión: separada del hash del refresh token (que sí
-- cambia en cada rotación) para que logout pueda revocar una sesión
-- concreta aunque el token presentado ya haya rotado.
--
-- Transaccional de forma EXPLÍCITA (BEGIN/COMMIT propios, no se asume el
-- comportamiento de la herramienta que la aplique): los tres pasos se
-- confirman o se revierten juntos. Probado con un fallo deliberado
-- introducido a propósito después del backfill, en una base desechable
-- (ver evidencia en el PR/docs de diseño) -- una corrida exitosa, por sí
-- sola, no demuestra que haya una reversión real ante un fallo a mitad de
-- camino; esta migración se verificó forzando ese fallo y confirmando que
-- la columna no quedó a medio crear.
--
-- No borra ni revoca ninguna fila existente: las sesiones ya creadas
-- conservan su refresh_token_hash (formato bcrypt viejo) y su estado de
-- revocada tal cual estaban -- solo ganan un session_id nuevo.

BEGIN;

-- 1) Columna nullable primero: no se puede agregar NOT NULL + UNIQUE de
--    una sola vez contra una tabla con filas existentes sin valor.
ALTER TABLE "sesiones" ADD COLUMN "session_id" UUID;

-- 2) Backfill: un UUID distinto por fila ya existente. gen_random_uuid()
--    es nativo en Postgres (disponible desde la versión 13, sin necesitar
--    la extensión pgcrypto) -- es lo que corre la propia imagen del
--    servicio "database" (postgres:16-alpine, ver database/Dockerfile).
UPDATE "sesiones" SET "session_id" = gen_random_uuid() WHERE "session_id" IS NULL;

-- 3) Recién ahora las restricciones, con todas las filas ya pobladas.
ALTER TABLE "sesiones" ALTER COLUMN "session_id" SET NOT NULL;
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_session_id_key" UNIQUE ("session_id");

COMMIT;
