CREATE TABLE "detalles_ordenes_compra" (
  "id" SERIAL NOT NULL,
  "orden_compra_id" INTEGER NOT NULL,
  "insumo_id" INTEGER NOT NULL,
  "cantidad" DECIMAL(14,3) NOT NULL,
  "cantidad_recibida" DECIMAL(14,3) NOT NULL DEFAULT 0,
  "unidad_medida" TEXT NOT NULL,
  "precio_unitario_cop" DECIMAL(14,2) NOT NULL,
  "subtotal_cop" DECIMAL(14,2) NOT NULL,
  CONSTRAINT "detalles_ordenes_compra_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "movimientos_inventario"
ADD COLUMN "detalle_orden_compra_id" INTEGER,
ADD COLUMN "clave_idempotencia" TEXT;

CREATE UNIQUE INDEX "detalles_ordenes_compra_orden_compra_id_insumo_id_key"
ON "detalles_ordenes_compra"("orden_compra_id", "insumo_id");
CREATE INDEX "detalles_ordenes_compra_insumo_id_idx"
ON "detalles_ordenes_compra"("insumo_id");
CREATE UNIQUE INDEX "mov_inv_detalle_clave_key"
ON "movimientos_inventario"("detalle_orden_compra_id", "clave_idempotencia");
CREATE INDEX "mov_inv_detalle_idx"
ON "movimientos_inventario"("detalle_orden_compra_id");

ALTER TABLE "detalles_ordenes_compra"
ADD CONSTRAINT "detalles_ordenes_compra_orden_compra_id_fkey"
FOREIGN KEY ("orden_compra_id") REFERENCES "ordenes_compra"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "detalles_ordenes_compra"
ADD CONSTRAINT "detalles_ordenes_compra_insumo_id_fkey"
FOREIGN KEY ("insumo_id") REFERENCES "inventario_insumos"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "movimientos_inventario"
ADD CONSTRAINT "movimientos_inventario_detalle_orden_compra_id_fkey"
FOREIGN KEY ("detalle_orden_compra_id") REFERENCES "detalles_ordenes_compra"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
