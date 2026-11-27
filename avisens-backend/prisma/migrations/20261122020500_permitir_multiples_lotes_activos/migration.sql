-- Permite múltiples lotes en estado 'activo' dentro de un mismo galpón
-- (hallazgo de campo con avicultores que alojan más de un lote bajo un mismo techo).
DROP INDEX IF EXISTS "lotes_un_activo_por_galpon";
