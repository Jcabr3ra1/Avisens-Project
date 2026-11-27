-- Toda orden y movimiento financiero pertenece a una granja, incluso cuando
-- no esta asociado a un lote. Esto evita registros sin alcance de propietario.
ALTER TABLE "ordenes_compra" ADD COLUMN "granja_id" INTEGER;
ALTER TABLE "movimientos_financieros" ADD COLUMN "granja_id" INTEGER;

-- El lote determina de forma inequivoca la granja.
UPDATE "ordenes_compra" orden
SET "granja_id" = galpon."granja_id"
FROM "lotes" lote
JOIN "galpones" galpon ON galpon."id" = lote."galpon_id"
WHERE orden."lote_id" = lote."id";

UPDATE "movimientos_financieros" movimiento
SET "granja_id" = galpon."granja_id"
FROM "lotes" lote
JOIN "galpones" galpon ON galpon."id" = lote."galpon_id"
WHERE movimiento."lote_id" = lote."id";

-- Para datos historicos sin lote solo se infiere cuando el usuario pertenece
-- a una organizacion con exactamente una granja. Ante cualquier ambiguedad la
-- migracion se detiene: es preferible corregir el dato a cruzar propietarios.
WITH unica_granja AS (
  SELECT usuario."id" AS "usuario_id", MIN(granja."id") AS "granja_id"
  FROM "usuarios" usuario
  JOIN "granjas" granja
    ON granja."organizacion_id" = usuario."organizacion_id"
  GROUP BY usuario."id"
  HAVING COUNT(granja."id") = 1
)
UPDATE "ordenes_compra" orden
SET "granja_id" = unica_granja."granja_id"
FROM unica_granja
WHERE orden."granja_id" IS NULL
  AND orden."usuario_id" = unica_granja."usuario_id";

WITH unica_granja AS (
  SELECT usuario."id" AS "usuario_id", MIN(granja."id") AS "granja_id"
  FROM "usuarios" usuario
  JOIN "granjas" granja
    ON granja."organizacion_id" = usuario."organizacion_id"
  GROUP BY usuario."id"
  HAVING COUNT(granja."id") = 1
)
UPDATE "movimientos_financieros" movimiento
SET "granja_id" = unica_granja."granja_id"
FROM unica_granja
WHERE movimiento."granja_id" IS NULL
  AND movimiento."usuario_id" = unica_granja."usuario_id";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "ordenes_compra" WHERE "granja_id" IS NULL) THEN
    RAISE EXCEPTION 'Hay ordenes de compra cuya granja no se puede inferir';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "movimientos_financieros" WHERE "granja_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Hay movimientos financieros cuya granja no se puede inferir';
  END IF;
END $$;

ALTER TABLE "ordenes_compra" ALTER COLUMN "granja_id" SET NOT NULL;
ALTER TABLE "movimientos_financieros" ALTER COLUMN "granja_id" SET NOT NULL;

ALTER TABLE "ordenes_compra"
ADD CONSTRAINT "ordenes_compra_granja_id_fkey"
FOREIGN KEY ("granja_id") REFERENCES "granjas"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "movimientos_financieros"
ADD CONSTRAINT "movimientos_financieros_granja_id_fkey"
FOREIGN KEY ("granja_id") REFERENCES "granjas"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "ordenes_compra_granja_id_idx"
ON "ordenes_compra"("granja_id");

CREATE INDEX "movimientos_financieros_granja_id_idx"
ON "movimientos_financieros"("granja_id");

-- El mismo codigo puede existir en granjas diferentes, pero no repetirse
-- dentro de una misma granja.
DROP INDEX "ordenes_compra_codigo_key";
CREATE UNIQUE INDEX "ordenes_compra_granja_id_codigo_key"
ON "ordenes_compra"("granja_id", "codigo");
