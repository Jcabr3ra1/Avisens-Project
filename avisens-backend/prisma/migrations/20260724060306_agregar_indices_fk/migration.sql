-- CreateIndex
CREATE INDEX "dispositivos_galpon_id_idx" ON "dispositivos"("galpon_id");

-- CreateIndex
CREATE INDEX "granjas_propietario_id_idx" ON "granjas"("propietario_id");

-- CreateIndex
CREATE INDEX "sensores_galpon_id_idx" ON "sensores"("galpon_id");

-- CreateIndex
CREATE INDEX "sensores_dispositivo_id_idx" ON "sensores"("dispositivo_id");

-- CreateIndex
CREATE INDEX "sesiones_usuario_id_idx" ON "sesiones"("usuario_id");
