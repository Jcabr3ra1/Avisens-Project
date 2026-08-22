-- CreateTable
CREATE TABLE "catalogo_sensores" (
    "id" SERIAL NOT NULL,
    "tipo_sensor" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "precio_unitario_cop" DOUBLE PRECISION NOT NULL,
    "cobertura_m2" DOUBLE PRECISION,
    "obligatorio" BOOLEAN NOT NULL DEFAULT true,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalogo_sensores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_sensores_tipo_sensor_key" ON "catalogo_sensores"("tipo_sensor");
