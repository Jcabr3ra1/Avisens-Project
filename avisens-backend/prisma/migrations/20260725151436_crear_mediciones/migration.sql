-- CreateTable
CREATE TABLE "mediciones" (
    "id" BIGSERIAL NOT NULL,
    "sensor_id" INTEGER NOT NULL,
    "fecha_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valor" DOUBLE PRECISION NOT NULL,
    "calidad" TEXT NOT NULL DEFAULT 'ok',

    CONSTRAINT "mediciones_pkey" PRIMARY KEY ("id","fecha_hora")
);

-- CreateIndex
CREATE INDEX "mediciones_sensor_id_fecha_hora_idx" ON "mediciones"("sensor_id", "fecha_hora");

-- AddForeignKey
ALTER TABLE "mediciones" ADD CONSTRAINT "mediciones_sensor_id_fkey" FOREIGN KEY ("sensor_id") REFERENCES "sensores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
