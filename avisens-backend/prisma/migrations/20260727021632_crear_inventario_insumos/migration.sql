-- CreateTable
CREATE TABLE "inventario_insumos" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT,
    "unidad_medida" TEXT NOT NULL,
    "stock_actual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stock_minimo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "precio_unitario_cop" DOUBLE PRECISION,
    "proveedor_habitual_id" INTEGER,
    "ubicacion_almacen" TEXT,
    "fecha_vencimiento" DATE,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventario_insumos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventario_insumos_proveedor_habitual_id_idx" ON "inventario_insumos"("proveedor_habitual_id");

-- AddForeignKey
ALTER TABLE "inventario_insumos" ADD CONSTRAINT "inventario_insumos_proveedor_habitual_id_fkey" FOREIGN KEY ("proveedor_habitual_id") REFERENCES "proveedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
