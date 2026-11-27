ALTER TABLE "mantenimientos_repuestos"
ALTER COLUMN "cantidad" SET DATA TYPE DECIMAL(14,3)
USING "cantidad"::DECIMAL(14,3),
ADD COLUMN "unidad_medida" TEXT,
ADD COLUMN "clave_idempotencia" TEXT,
ADD COLUMN "movimiento_salida_id" INTEGER,
ADD COLUMN "movimiento_reversion_id" INTEGER,
ADD COLUMN "revertido" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "mantenimientos_repuestos" repuesto
SET "unidad_medida" = insumo."unidad_medida",
    "clave_idempotencia" = 'legado-' || repuesto."id"::TEXT
FROM "inventario_insumos" insumo
WHERE insumo."id" = repuesto."insumo_id";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "mantenimientos_repuestos"
    WHERE "cantidad" IS NULL OR "unidad_medida" IS NULL
  ) THEN
    RAISE EXCEPTION 'Hay repuestos históricos sin cantidad o unidad; deben corregirse antes de migrar';
  END IF;
END $$;

ALTER TABLE "mantenimientos_repuestos"
ALTER COLUMN "cantidad" SET NOT NULL,
ALTER COLUMN "unidad_medida" SET NOT NULL,
ALTER COLUMN "clave_idempotencia" SET NOT NULL;

CREATE UNIQUE INDEX "mant_repuesto_clave_key"
ON "mantenimientos_repuestos"("mantenimiento_id", "clave_idempotencia");
CREATE UNIQUE INDEX "mant_repuesto_salida_key"
ON "mantenimientos_repuestos"("movimiento_salida_id");
CREATE UNIQUE INDEX "mant_repuesto_reversion_key"
ON "mantenimientos_repuestos"("movimiento_reversion_id");
CREATE INDEX "mantenimientos_repuestos_insumo_id_idx"
ON "mantenimientos_repuestos"("insumo_id");

ALTER TABLE "mantenimientos_repuestos"
ADD CONSTRAINT "mantenimientos_repuestos_movimiento_salida_id_fkey"
FOREIGN KEY ("movimiento_salida_id") REFERENCES "movimientos_inventario"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "mantenimientos_repuestos"
ADD CONSTRAINT "mantenimientos_repuestos_movimiento_reversion_id_fkey"
FOREIGN KEY ("movimiento_reversion_id") REFERENCES "movimientos_inventario"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
