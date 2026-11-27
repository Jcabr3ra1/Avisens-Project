-- Retira la columna plano_url de galpones (campo sin uso en el producto).
ALTER TABLE "galpones"
  DROP COLUMN IF EXISTS "plano_url";
