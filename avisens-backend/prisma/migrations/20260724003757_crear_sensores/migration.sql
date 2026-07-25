-- CreateTable
CREATE TABLE "sensores" (
    "id" SERIAL NOT NULL,
    "galpon_id" INTEGER NOT NULL,
    "dispositivo_id" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "unidad_medida" TEXT NOT NULL,
    "modelo" TEXT,
    "fabricante" TEXT,
    "coordenada_x" DOUBLE PRECISION,
    "coordenada_y" DOUBLE PRECISION,
    "altura_metros" DOUBLE PRECISION,
    "fecha_instalacion" DATE,
    "ultima_calibracion" DATE,
    "proxima_calibracion" DATE,
    "estado" TEXT NOT NULL DEFAULT 'activo',

    CONSTRAINT "sensores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sensores_codigo_key" ON "sensores"("codigo");

-- AddForeignKey
ALTER TABLE "sensores" ADD CONSTRAINT "sensores_galpon_id_fkey" FOREIGN KEY ("galpon_id") REFERENCES "galpones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensores" ADD CONSTRAINT "sensores_dispositivo_id_fkey" FOREIGN KEY ("dispositivo_id") REFERENCES "dispositivos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
