-- CreateTable
CREATE TABLE "galpones" (
    "id" SERIAL NOT NULL,
    "granja_id" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "capacidad_aves" INTEGER,
    "ancho_metros" DOUBLE PRECISION,
    "largo_metros" DOUBLE PRECISION,
    "orientacion" TEXT,
    "tipo_techo" TEXT,
    "plano_url" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_construccion" DATE,

    CONSTRAINT "galpones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "galpones_granja_id_codigo_key" ON "galpones"("granja_id", "codigo");

-- AddForeignKey
ALTER TABLE "galpones" ADD CONSTRAINT "galpones_granja_id_fkey" FOREIGN KEY ("granja_id") REFERENCES "granjas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

