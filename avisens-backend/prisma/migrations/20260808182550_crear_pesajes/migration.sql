-- CreateTable
CREATE TABLE "pesajes" (
    "id" SERIAL NOT NULL,
    "lote_id" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "peso_promedio_g" DOUBLE PRECISION NOT NULL,
    "cantadidad_aves_pesadas" INTEGER,
    "peso_minimo_g" DOUBLE PRECISION,
    "peso_maximo_g" DOUBLE PRECISION,
    "peso_objetivo_g" DOUBLE PRECISION,
    "alerta_generada" BOOLEAN NOT NULL DEFAULT false,
    "usuario_id" INTEGER NOT NULL,
    "metodo_registro" TEXT,
    "observaciones" TEXT,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pesajes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pesajes_lote_id_idx" ON "pesajes"("lote_id");

-- AddForeignKey
ALTER TABLE "pesajes" ADD CONSTRAINT "pesajes_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesajes" ADD CONSTRAINT "pesajes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
