/*
  Warnings:

  - A unique constraint covering the columns `[lote_id,fecha]` on the table `indicadores_lote` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "indicadores_lote_lote_id_fecha_key" ON "indicadores_lote"("lote_id", "fecha");
