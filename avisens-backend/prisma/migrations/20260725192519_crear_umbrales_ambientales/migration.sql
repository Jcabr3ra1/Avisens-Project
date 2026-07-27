-- CreateTable
CREATE TABLE "umbrales_ambientales" (
    "id" SERIAL NOT NULL,
    "galpon_id" INTEGER NOT NULL,
    "variable" TEXT NOT NULL,
    "semana_vida" INTEGER NOT NULL,
    "valor_minimo" DOUBLE PRECISION NOT NULL,
    "valor_maximo" DOUBLE PRECISION NOT NULL,
    "unidad" TEXT NOT NULL,
    "criticidad" TEXT NOT NULL,
    "vigente" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "umbrales_ambientales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "umbrales_ambientales_galpon_id_variable_semana_vida_vigente_idx" ON "umbrales_ambientales"("galpon_id", "variable", "semana_vida", "vigente");

-- CreateIndex
CREATE UNIQUE INDEX "umbrales_ambientales_galpon_id_variable_semana_vida_version_key" ON "umbrales_ambientales"("galpon_id", "variable", "semana_vida", "version");

-- AddForeignKey
ALTER TABLE "umbrales_ambientales" ADD CONSTRAINT "umbrales_ambientales_galpon_id_fkey" FOREIGN KEY ("galpon_id") REFERENCES "galpones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
