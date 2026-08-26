CREATE TYPE "EstadoRecuperacionPassword" AS ENUM (
  'pendiente',
  'aprobada',
  'rechazada',
  'completada'
);

ALTER TABLE "seguridad_cuenta"
ADD COLUMN "debe_cambiar_password" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "password_temporal_expira_en" TIMESTAMP(3);

-- Se conserva la tabla histórica, pero pasa de tokens públicos a solicitudes
-- atendidas por un administrador. Las columnas antiguas quedan solo para poder
-- leer registros previos sin perderlos.
ALTER TABLE "recuperaciones_password"
ALTER COLUMN "token_hash" DROP NOT NULL,
ALTER COLUMN "expira_en" DROP NOT NULL,
ADD COLUMN "estado" "EstadoRecuperacionPassword" NOT NULL DEFAULT 'pendiente',
ADD COLUMN "motivo" TEXT,
ADD COLUMN "ip_solicitud" TEXT,
ADD COLUMN "atendida_por_id" INTEGER,
ADD COLUMN "atendida_en" TIMESTAMP(3),
ADD COLUMN "observacion" TEXT;

DROP INDEX IF EXISTS "recuperaciones_password_usuario_id_idx";
CREATE INDEX "recuperaciones_password_usuario_id_estado_idx"
ON "recuperaciones_password"("usuario_id", "estado");
CREATE INDEX "recuperaciones_password_atendida_por_id_idx"
ON "recuperaciones_password"("atendida_por_id");
CREATE UNIQUE INDEX "recuperaciones_password_usuario_pendiente_key"
ON "recuperaciones_password"("usuario_id")
WHERE "estado" = 'pendiente';

ALTER TABLE "recuperaciones_password"
ADD CONSTRAINT "recuperaciones_password_atendida_por_id_fkey"
FOREIGN KEY ("atendida_por_id") REFERENCES "usuarios"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
