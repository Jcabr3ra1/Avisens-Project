-- Órdenes remotas sobre los relés del ESP32. La orden se guarda aquí, viaja
-- en la respuesta de POST /ingest y solo pasa a "aplicada" cuando el propio
-- ESP32 lo confirma: guardarla no enciende nada. estados_actuadores guarda lo
-- que el ESP32 informa del relé en cada envío (modo y salida actuales).

-- CreateEnum
CREATE TYPE "AccionOrdenActuador" AS ENUM ('encender', 'apagar', 'automatico');

-- CreateEnum
CREATE TYPE "EstadoOrdenActuador" AS ENUM ('pendiente', 'enviada', 'aplicada', 'rechazada', 'revertida', 'expirada');

-- CreateEnum
CREATE TYPE "ModoActuador" AS ENUM ('automatico', 'manual_remoto', 'manual_local');

-- CreateTable
CREATE TABLE "ordenes_actuadores" (
    "id" SERIAL NOT NULL,
    "dispositivo_id" INTEGER NOT NULL,
    "galpon_id" INTEGER NOT NULL,
    "sensor_id" INTEGER NOT NULL,
    "accion" "AccionOrdenActuador" NOT NULL,
    "estado" "EstadoOrdenActuador" NOT NULL DEFAULT 'pendiente',
    "estado_real" BOOLEAN,
    "motivo" TEXT,
    "usuario_id" INTEGER,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_envio" TIMESTAMP(3),
    "fecha_resultado" TIMESTAMP(3),
    "actualizada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ordenes_actuadores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estados_actuadores" (
    "sensor_id" INTEGER NOT NULL,
    "modo" "ModoActuador" NOT NULL,
    "encendido" BOOLEAN NOT NULL,
    "orden_id" INTEGER,
    "reportado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estados_actuadores_pkey" PRIMARY KEY ("sensor_id")
);

-- CreateIndex
CREATE INDEX "ordenes_actuadores_dispositivo_id_estado_idx" ON "ordenes_actuadores"("dispositivo_id", "estado");

-- CreateIndex
CREATE INDEX "ordenes_actuadores_sensor_id_fecha_creacion_idx" ON "ordenes_actuadores"("sensor_id", "fecha_creacion");

-- AddForeignKey
ALTER TABLE "ordenes_actuadores" ADD CONSTRAINT "ordenes_actuadores_dispositivo_id_galpon_id_fkey" FOREIGN KEY ("dispositivo_id", "galpon_id") REFERENCES "dispositivos"("id", "galpon_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_actuadores" ADD CONSTRAINT "ordenes_actuadores_sensor_id_fkey" FOREIGN KEY ("sensor_id") REFERENCES "sensores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_actuadores" ADD CONSTRAINT "ordenes_actuadores_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estados_actuadores" ADD CONSTRAINT "estados_actuadores_sensor_id_fkey" FOREIGN KEY ("sensor_id") REFERENCES "sensores"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Nunca dos órdenes en curso sobre el mismo relé: el chequeo previo del
-- servicio no basta con dos peticiones simultáneas, el índice sí. crear()
-- traduce la violación (P2002) a un 409.
--
-- SQL manual, no declarado en schema.prisma: mismo motivo que en lotes,
-- umbrales y alertas -- partialIndexes sigue en preview en Prisma 7.8.
CREATE UNIQUE INDEX "ordenes_actuadores_una_en_curso"
  ON "ordenes_actuadores" ("sensor_id")
  WHERE "estado" IN ('pendiente'::"EstadoOrdenActuador", 'enviada'::"EstadoOrdenActuador");
