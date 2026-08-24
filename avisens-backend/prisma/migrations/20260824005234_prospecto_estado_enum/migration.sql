-- CreateEnum
CREATE TYPE "EstadoProspecto" AS ENUM (
  'nuevo',
  'en_proceso',
  'calificado',
  'asignado',
  'cerrado',
  'abandonado',
  'cancelado',
  'pqrs',
  'consulta_atendida',
  'sin_consentimiento'
);

-- AlterTable
-- Escrita a mano a proposito: Prisma proponia borrar y recrear la columna, lo
-- que habria perdido el estado de todos los prospectos. El USING convierte los
-- valores existentes. El default se quita antes porque el literal de texto no
-- es compatible con el tipo nuevo, y se vuelve a poner ya como enum.
ALTER TABLE "prospectos" ALTER COLUMN "estado" DROP DEFAULT;

ALTER TABLE "prospectos"
  ALTER COLUMN "estado" TYPE "EstadoProspecto"
  USING "estado"::"EstadoProspecto";

ALTER TABLE "prospectos" ALTER COLUMN "estado" SET DEFAULT 'nuevo';
