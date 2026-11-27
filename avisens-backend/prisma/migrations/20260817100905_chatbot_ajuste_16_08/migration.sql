-- AlterTable
ALTER TABLE "prospectos" ADD COLUMN     "area_galpon_m2" DOUBLE PRECISION,
ADD COLUMN     "area_granja_m2" DOUBLE PRECISION,
ADD COLUMN     "clasificacion" TEXT,
ADD COLUMN     "departamento" TEXT,
ADD COLUMN     "documento" TEXT,
ADD COLUMN     "nombre_granja" TEXT,
ADD COLUMN     "puntaje_total" INTEGER;

-- CreateTable
CREATE TABLE "solicitudes_pqrs" (
    "id" SERIAL NOT NULL,
    "prospecto_id" INTEGER NOT NULL,
    "categoria" TEXT NOT NULL,
    "codigo_pregunta" TEXT,
    "asunto" TEXT,
    "mensaje" TEXT,
    "respuesta" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'abierta',
    "responsable_id" INTEGER,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_cierre" TIMESTAMP(3),

    CONSTRAINT "solicitudes_pqrs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "solicitudes_pqrs_prospecto_id_idx" ON "solicitudes_pqrs"("prospecto_id");

-- CreateIndex
CREATE INDEX "solicitudes_pqrs_responsable_id_idx" ON "solicitudes_pqrs"("responsable_id");

-- AddForeignKey
ALTER TABLE "solicitudes_pqrs" ADD CONSTRAINT "solicitudes_pqrs_prospecto_id_fkey" FOREIGN KEY ("prospecto_id") REFERENCES "prospectos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_pqrs" ADD CONSTRAINT "solicitudes_pqrs_responsable_id_fkey" FOREIGN KEY ("responsable_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

