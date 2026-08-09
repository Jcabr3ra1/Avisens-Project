-- CreateTable
CREATE TABLE "consumos_diarios" (
    "id" SERIAL NOT NULL,
    "lote_id" INTEGER NOT NULL,
    "tipo_alimento_id" INTEGER,
    "usuario_id" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "alimento_kg" DOUBLE PRECISION,
    "agua_litros" DOUBLE PRECISION,
    "alerta_agua_baja" BOOLEAN NOT NULL DEFAULT false,
    "metodo_registro" TEXT,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consumos_diarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registros_plagas" (
    "id" SERIAL NOT NULL,
    "lote_id" INTEGER NOT NULL,
    "insumo_id" INTEGER,
    "usuario_id" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "tipo_plaga" TEXT NOT NULL,
    "descripcion" TEXT,
    "control_aplicado" TEXT,
    "metodo_registro" TEXT,
    "observaciones" TEXT,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registros_plagas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consumos_diarios_lote_id_idx" ON "consumos_diarios"("lote_id");

-- CreateIndex
CREATE INDEX "registros_plagas_lote_id_idx" ON "registros_plagas"("lote_id");

-- AddForeignKey
ALTER TABLE "consumos_diarios" ADD CONSTRAINT "consumos_diarios_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumos_diarios" ADD CONSTRAINT "consumos_diarios_tipo_alimento_id_fkey" FOREIGN KEY ("tipo_alimento_id") REFERENCES "tipos_alimento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumos_diarios" ADD CONSTRAINT "consumos_diarios_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_plagas" ADD CONSTRAINT "registros_plagas_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_plagas" ADD CONSTRAINT "registros_plagas_insumo_id_fkey" FOREIGN KEY ("insumo_id") REFERENCES "inventario_insumos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_plagas" ADD CONSTRAINT "registros_plagas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
