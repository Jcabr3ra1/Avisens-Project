-- Los tokens existentes permanecen temporalmente en token_ingesta. El guard
-- los migra a SHA-256 al primer uso, sin cambiar el secreto configurado en el
-- dispositivo. Los tokens creados desde esta versión solo usan el hash.
ALTER TABLE "dispositivos" ADD COLUMN "token_ingesta_hash" TEXT;

CREATE UNIQUE INDEX "dispositivos_token_ingesta_hash_key"
  ON "dispositivos"("token_ingesta_hash");

CREATE TYPE "EstadoEjecucionJob" AS ENUM ('ejecutando', 'completado', 'fallido');

CREATE TABLE "ingestas_dispositivos" (
  "id" BIGSERIAL NOT NULL,
  "dispositivo_id" INTEGER NOT NULL,
  "clave_idempotencia" TEXT NOT NULL,
  "fecha_dispositivo" TIMESTAMP(3),
  "fecha_recepcion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ip_origen" TEXT,
  "cantidad_recibida" INTEGER NOT NULL,
  "cantidad_registrada" INTEGER NOT NULL,
  "codigos_ignorados" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  CONSTRAINT "ingestas_dispositivos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ejecuciones_jobs" (
  "id" BIGSERIAL NOT NULL,
  "nombre" TEXT NOT NULL,
  "clave_ventana" TEXT NOT NULL,
  "propietario" TEXT NOT NULL,
  "estado" "EstadoEjecucionJob" NOT NULL DEFAULT 'ejecutando',
  "intentos" INTEGER NOT NULL DEFAULT 1,
  "iniciada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expira_en" TIMESTAMP(3) NOT NULL,
  "finalizada_en" TIMESTAMP(3),
  "error" TEXT,
  CONSTRAINT "ejecuciones_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ingestas_dispositivos_dispositivo_id_clave_idempotencia_key"
  ON "ingestas_dispositivos"("dispositivo_id", "clave_idempotencia");
CREATE INDEX "ingestas_dispositivos_dispositivo_id_fecha_recepcion_idx"
  ON "ingestas_dispositivos"("dispositivo_id", "fecha_recepcion");
CREATE UNIQUE INDEX "ejecuciones_jobs_nombre_clave_ventana_key"
  ON "ejecuciones_jobs"("nombre", "clave_ventana");
CREATE INDEX "ejecuciones_jobs_estado_expira_en_idx"
  ON "ejecuciones_jobs"("estado", "expira_en");

ALTER TABLE "ingestas_dispositivos"
  ADD CONSTRAINT "ingestas_dispositivos_dispositivo_id_fkey"
  FOREIGN KEY ("dispositivo_id") REFERENCES "dispositivos"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
