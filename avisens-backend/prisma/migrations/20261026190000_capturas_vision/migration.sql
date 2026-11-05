-- CreateTable
CREATE TABLE "capturas_vision" (
    "id" SERIAL NOT NULL,
    "analisis_id" INTEGER NOT NULL,
    "galpon_id" INTEGER NOT NULL,
    "dispositivo_id" INTEGER,
    "imagen" BYTEA NOT NULL,
    "tamano" INTEGER NOT NULL,
    "con_alerta" BOOLEAN NOT NULL DEFAULT false,
    "fecha_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "capturas_vision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "capturas_vision_analisis_id_key" ON "capturas_vision"("analisis_id");

-- CreateIndex
CREATE INDEX "capturas_vision_galpon_id_fecha_hora_idx" ON "capturas_vision"("galpon_id", "fecha_hora");

-- AddForeignKey
ALTER TABLE "capturas_vision" ADD CONSTRAINT "capturas_vision_analisis_id_fkey" FOREIGN KEY ("analisis_id") REFERENCES "analisis_vision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capturas_vision" ADD CONSTRAINT "capturas_vision_galpon_id_fkey" FOREIGN KEY ("galpon_id") REFERENCES "galpones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capturas_vision" ADD CONSTRAINT "capturas_vision_dispositivo_id_fkey" FOREIGN KEY ("dispositivo_id") REFERENCES "dispositivos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

