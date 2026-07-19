-- CreateTable
CREATE TABLE "granjas" (
    "id" SERIAL NOT NULL,
    "propietario_id" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "municipio" TEXT,
    "departamento" TEXT,
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "area_total_m2" DOUBLE PRECISION,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "granjas_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "granjas" ADD CONSTRAINT "granjas_propietario_id_fkey" FOREIGN KEY ("propietario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

