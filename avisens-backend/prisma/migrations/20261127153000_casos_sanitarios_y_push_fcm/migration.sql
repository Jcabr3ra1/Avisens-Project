-- Casos sanitarios (seguimientos, cierre de caso y descuento de bodega)
ALTER TABLE "eventos_sanitarios"
  ADD COLUMN "evento_padre_id" INTEGER,
  ADD COLUMN "estado" TEXT NOT NULL DEFAULT 'activo',
  ADD COLUMN "fecha_cierre" TIMESTAMP(3),
  ADD COLUMN "observaciones_cierre" TEXT,
  ADD COLUMN "cantidad_insumo" DECIMAL(14, 3),
  ADD COLUMN "movimiento_inventario_id" INTEGER;

CREATE UNIQUE INDEX "eventos_sanitarios_movimiento_inventario_id_key"
  ON "eventos_sanitarios"("movimiento_inventario_id");

CREATE INDEX "eventos_sanitarios_evento_padre_id_idx"
  ON "eventos_sanitarios"("evento_padre_id");

CREATE INDEX "eventos_sanitarios_estado_idx"
  ON "eventos_sanitarios"("estado");

ALTER TABLE "eventos_sanitarios"
  ADD CONSTRAINT "eventos_sanitarios_evento_padre_id_fkey"
  FOREIGN KEY ("evento_padre_id") REFERENCES "eventos_sanitarios"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "eventos_sanitarios"
  ADD CONSTRAINT "eventos_sanitarios_movimiento_inventario_id_fkey"
  FOREIGN KEY ("movimiento_inventario_id") REFERENCES "movimientos_inventario"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Dispositivos registrados para notificaciones push (FCM)
CREATE TABLE "dispositivos_push" (
  "id" SERIAL NOT NULL,
  "usuario_id" INTEGER NOT NULL,
  "token" TEXT NOT NULL,
  "plataforma" TEXT NOT NULL DEFAULT 'android',
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ultima_actualizacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "dispositivos_push_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "dispositivos_push_token_key"
  ON "dispositivos_push"("token");

CREATE INDEX "dispositivos_push_usuario_id_activo_idx"
  ON "dispositivos_push"("usuario_id", "activo");

ALTER TABLE "dispositivos_push"
  ADD CONSTRAINT "dispositivos_push_usuario_id_fkey"
  FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
