/*
  Warnings:

  - A unique constraint covering the columns `[sexo,dia]` on the table `curvas_objetivo` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "curvas_objetivo_sexo_dia_key" ON "curvas_objetivo"("sexo", "dia");
