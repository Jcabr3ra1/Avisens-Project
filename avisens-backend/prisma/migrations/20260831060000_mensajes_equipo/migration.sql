-- Chat interno del equipo, con el hilo colgando del GALPON.
--
-- En una granja lo que importa es "que pasa en el galpon 3", no "que me dijo
-- Pedro": el operario que entra manana necesita leer lo que se hablo ahi
-- aunque no estuviera en la conversacion. Y el alcance por rol sale solo,
-- porque los operarios ya estan asignados a galpones.
--
-- fecha_lectura nullable: null significa sin leer.

-- CreateTable
CREATE TABLE "mensajes_equipo" (
    "id" SERIAL NOT NULL,
    "galpon_id" INTEGER NOT NULL,
    "emisor_id" INTEGER NOT NULL,
    "contenido" TEXT NOT NULL,
    "fecha_envio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_lectura" TIMESTAMP(3),
    CONSTRAINT "mensajes_equipo_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "mensajes_equipo_galpon_id_fecha_envio_idx" ON "mensajes_equipo"("galpon_id", "fecha_envio");
-- CreateIndex
CREATE INDEX "mensajes_equipo_emisor_id_idx" ON "mensajes_equipo"("emisor_id");
-- AddForeignKey
ALTER TABLE "mensajes_equipo" ADD CONSTRAINT "mensajes_equipo_galpon_id_fkey" FOREIGN KEY ("galpon_id") REFERENCES "galpones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "mensajes_equipo" ADD CONSTRAINT "mensajes_equipo_emisor_id_fkey" FOREIGN KEY ("emisor_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
