-- DropIndex
DROP INDEX "curvas_objetivo_sexo_dia_key";
-- AlterTable
ALTER TABLE "curvas_objetivo" ADD COLUMN     "fuente" TEXT,
ADD COLUMN     "marca" TEXT NOT NULL DEFAULT 'italcol';
-- CreateIndex
CREATE UNIQUE INDEX "curvas_objetivo_marca_sexo_dia_key" ON "curvas_objetivo"("marca", "sexo", "dia");
