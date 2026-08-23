-- AlterTable
ALTER TABLE "prospectos" ADD COLUMN     "accion_siguiente" TEXT,
ADD COLUMN     "conectividad_limitada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "senal_caliente" BOOLEAN NOT NULL DEFAULT false;
