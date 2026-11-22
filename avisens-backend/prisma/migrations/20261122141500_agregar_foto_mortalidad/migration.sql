-- Agregar almacenamiento de evidencia fotográfica a registros de mortalidad
ALTER TABLE "registros_mortalidad"
  ADD COLUMN "foto" BYTEA,
  ADD COLUMN "foto_mime_type" TEXT;
