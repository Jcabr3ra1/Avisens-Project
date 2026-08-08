-- CreateTable
CREATE TABLE "lotes" (
    "id" SERIAL NOT NULL,
    "galpon_id" INTEGER NOT NULL,
    "proveedor_id" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "fecha_ingreso" DATE NOT NULL,
    "cantidad_inicial" INTEGER NOT NULL,
    "raza" TEXT,
    "sexo" TEXT,
    "costo_pollito_unitario" DOUBLE PRECISION,
    "presupuesto_total_cop" DOUBLE PRECISION,
    "fecha_salida_estimada" DATE,
    "fecha_salida_real" DATE,
    "estado" TEXT NOT NULL DEFAULT 'activo',

    CONSTRAINT "lotes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lotes_codigo_key" ON "lotes"("codigo");

-- CreateIndex
CREATE INDEX "lotes_galpon_id_estado_idx" ON "lotes"("galpon_id", "estado");

-- AddForeignKey
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_galpon_id_fkey" FOREIGN KEY ("galpon_id") REFERENCES "galpones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
