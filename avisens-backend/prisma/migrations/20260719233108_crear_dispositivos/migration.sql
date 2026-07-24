-- CreateTable
CREATE TABLE "dispositivos" (
    "id" SERIAL NOT NULL,
    "galpon_id" INTEGER NOT NULL,
    "mac_address" TEXT NOT NULL,
    "codigo_topic" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "version_firmware" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'offline',
    "ip_local" TEXT,
    "ultima_conexion" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispositivos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dispositivos_mac_address_key" ON "dispositivos"("mac_address");

-- CreateIndex
CREATE UNIQUE INDEX "dispositivos_codigo_topic_key" ON "dispositivos"("codigo_topic");

-- AddForeignKey
ALTER TABLE "dispositivos" ADD CONSTRAINT "dispositivos_galpon_id_fkey" FOREIGN KEY ("galpon_id") REFERENCES "galpones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
