-- CreateTable
CREATE TABLE "bitacora_auditoria" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER,
    "accion" TEXT NOT NULL,
    "entidad_afectada" TEXT NOT NULL,
    "registro_id" INTEGER,
    "datos_antes" JSONB,
    "datos_despues" JSONB,
    "ip_origen" TEXT,
    "user_agent" TEXT,
    "fecha_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bitacora_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bitacora_auditoria_usuario_id_idx" ON "bitacora_auditoria"("usuario_id");

-- CreateIndex
CREATE INDEX "bitacora_auditoria_entidad_afectada_registro_id_idx" ON "bitacora_auditoria"("entidad_afectada", "registro_id");

-- AddForeignKey
ALTER TABLE "bitacora_auditoria" ADD CONSTRAINT "bitacora_auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
