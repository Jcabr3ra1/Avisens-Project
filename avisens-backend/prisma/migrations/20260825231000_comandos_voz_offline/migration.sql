ALTER TABLE "comandos_voz"
ADD COLUMN "fecha_recepcion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "id_sincronizacion" TEXT;

CREATE UNIQUE INDEX "comandos_voz_usuario_id_id_sincronizacion_key"
ON "comandos_voz"("usuario_id", "id_sincronizacion");
