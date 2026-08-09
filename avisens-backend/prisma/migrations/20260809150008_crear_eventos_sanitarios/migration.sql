-- CreateTable
CREATE TABLE "eventos_sanitarios" (
    "id" SERIAL NOT NULL,
    "lote_id" INTEGER NOT NULL,
    "insumo_id" INTEGER,
    "tipo" TEXT NOT NULL,
    "diagnostico" TEXT,
    "producto" TEXT,
    "dosis" TEXT,
    "via_aplicacion" TEXT,
    "cantidad_aves" INTEGER,
    "fecha" DATE NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "metodo_registro" TEXT,
    "observaciones" TEXT,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_sanitarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "eventos_sanitarios_lote_id_idx" ON "eventos_sanitarios"("lote_id");

-- AddForeignKey
ALTER TABLE "eventos_sanitarios" ADD CONSTRAINT "eventos_sanitarios_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_sanitarios" ADD CONSTRAINT "eventos_sanitarios_insumo_id_fkey" FOREIGN KEY ("insumo_id") REFERENCES "inventario_insumos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_sanitarios" ADD CONSTRAINT "eventos_sanitarios_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
