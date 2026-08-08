-- CreateTable
CREATE TABLE "tipos_alimento" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "marca" TEXT,
    "etapa" TEXT,
    "presentacion" TEXT,
    "dia_inicio" INTEGER,
    "dia_fin" INTEGER,
    "consumo_total_esperado_g" DOUBLE PRECISION,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tipos_alimento_pkey" PRIMARY KEY ("id")
);
