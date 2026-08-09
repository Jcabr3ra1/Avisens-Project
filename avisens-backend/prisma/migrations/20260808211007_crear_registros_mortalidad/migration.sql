-- CreateTable
CREATE TABLE "registros_mortalidad" (
    "id" SERIAL NOT NULL,
    "lote_id" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "cantidad_aves" INTEGER NOT NULL,
    "causa_presuntiva" TEXT,
    "disposicion" TEXT,
    "alerta_generada" BOOLEAN NOT NULL DEFAULT false,
    "usuario_id" INTEGER NOT NULL,
    "metodo_registro" TEXT,
    "observaciones" TEXT,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registros_mortalidad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "registros_mortalidad_lote_id_idx" ON "registros_mortalidad"("lote_id");

-- AddForeignKey
ALTER TABLE "registros_mortalidad" ADD CONSTRAINT "registros_mortalidad_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_mortalidad" ADD CONSTRAINT "registros_mortalidad_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
