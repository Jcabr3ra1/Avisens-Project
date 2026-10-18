-- No se adivina el cableado de los sensores existentes.
ALTER TABLE "sensores" ADD COLUMN "canal" TEXT;
CREATE UNIQUE INDEX "sensores_dispositivo_id_tipo_canal_key"
ON "sensores"("dispositivo_id", "tipo", "canal");
