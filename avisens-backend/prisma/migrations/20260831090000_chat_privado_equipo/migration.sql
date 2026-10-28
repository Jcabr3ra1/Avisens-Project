CREATE TABLE "conversaciones_privadas_equipo" (
  "id" SERIAL NOT NULL,
  "galpon_id" INTEGER NOT NULL,
  "participante_uno_id" INTEGER NOT NULL,
  "participante_dos_id" INTEGER NOT NULL,
  "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ultimo_mensaje_en" TIMESTAMP(3),
  CONSTRAINT "conversaciones_privadas_equipo_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "conversaciones_privadas_equipo_participantes_distintos" CHECK ("participante_uno_id" < "participante_dos_id")
);

CREATE TABLE "mensajes_privados_equipo" (
  "id" SERIAL NOT NULL,
  "conversacion_id" INTEGER NOT NULL,
  "emisor_id" INTEGER NOT NULL,
  "contenido" TEXT NOT NULL,
  "fecha_envio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fecha_lectura" TIMESTAMP(3),
  CONSTRAINT "mensajes_privados_equipo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "conversaciones_privadas_equipo_galpon_id_participante_uno_id_participante_dos_id_key" ON "conversaciones_privadas_equipo"("galpon_id", "participante_uno_id", "participante_dos_id");
CREATE INDEX "conversaciones_privadas_equipo_participante_uno_id_idx" ON "conversaciones_privadas_equipo"("participante_uno_id");
CREATE INDEX "conversaciones_privadas_equipo_participante_dos_id_idx" ON "conversaciones_privadas_equipo"("participante_dos_id");
CREATE INDEX "conversaciones_privadas_equipo_galpon_id_idx" ON "conversaciones_privadas_equipo"("galpon_id");
CREATE INDEX "mensajes_privados_equipo_conversacion_id_fecha_envio_idx" ON "mensajes_privados_equipo"("conversacion_id", "fecha_envio");
CREATE INDEX "mensajes_privados_equipo_emisor_id_idx" ON "mensajes_privados_equipo"("emisor_id");

ALTER TABLE "conversaciones_privadas_equipo" ADD CONSTRAINT "conversaciones_privadas_equipo_galpon_id_fkey" FOREIGN KEY ("galpon_id") REFERENCES "galpones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "conversaciones_privadas_equipo" ADD CONSTRAINT "conversaciones_privadas_equipo_participante_uno_id_fkey" FOREIGN KEY ("participante_uno_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "conversaciones_privadas_equipo" ADD CONSTRAINT "conversaciones_privadas_equipo_participante_dos_id_fkey" FOREIGN KEY ("participante_dos_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "mensajes_privados_equipo" ADD CONSTRAINT "mensajes_privados_equipo_conversacion_id_fkey" FOREIGN KEY ("conversacion_id") REFERENCES "conversaciones_privadas_equipo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mensajes_privados_equipo" ADD CONSTRAINT "mensajes_privados_equipo_emisor_id_fkey" FOREIGN KEY ("emisor_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
