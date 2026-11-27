ALTER TABLE "cotizaciones"
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "snapshot_precios" JSONB;

ALTER TABLE "catalogo_sensores"
ADD COLUMN "estado_revision" TEXT NOT NULL DEFAULT 'provisional';

CREATE TABLE "tarifas_comerciales" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "precio_unitario_cop" DECIMAL(14,2) NOT NULL,
    "estado_revision" TEXT NOT NULL DEFAULT 'provisional',
    "version" INTEGER NOT NULL DEFAULT 1,
    "vigente" BOOLEAN NOT NULL DEFAULT false,
    "actualizado_en" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tarifas_comerciales_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tarifas_comerciales_codigo_version_key" ON "tarifas_comerciales"("codigo", "version");
CREATE INDEX "tarifas_comerciales_codigo_estado_revision_vigente_version_idx" ON "tarifas_comerciales"("codigo", "estado_revision", "vigente", "version");

ALTER TABLE "prospectos"
ADD COLUMN "intencion_comercial" TEXT,
ADD COLUMN "plazo_comercial" TEXT,
ADD COLUMN "conectividad_comercial" TEXT,
ADD COLUMN "energia_comercial" TEXT;

ALTER TABLE "cotizaciones"
ADD COLUMN "idempotency_key" TEXT;
CREATE UNIQUE INDEX "cotizaciones_idempotency_key_key" ON "cotizaciones"("idempotency_key");
WITH cotizaciones_versionadas AS (
    SELECT "id", ROW_NUMBER() OVER (PARTITION BY "prospecto_id" ORDER BY "fecha_generacion", "id") AS "version_calculada"
    FROM "cotizaciones"
)
UPDATE "cotizaciones" AS c
SET "version" = v."version_calculada"
FROM cotizaciones_versionadas AS v
WHERE c."id" = v."id";
CREATE UNIQUE INDEX "cotizaciones_prospecto_id_version_key" ON "cotizaciones"("prospecto_id", "version");

CREATE TABLE "conocimiento_comercial" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "tema" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "estado_revision" TEXT NOT NULL DEFAULT 'borrador',
    "estado_capacidad" TEXT NOT NULL DEFAULT 'desconocido',
    "version" INTEGER NOT NULL DEFAULT 1,
    "vigente" BOOLEAN NOT NULL DEFAULT false,
    "actualizado_en" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "conocimiento_comercial_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "conocimiento_comercial_codigo_key" ON "conocimiento_comercial"("codigo");
CREATE INDEX "conocimiento_comercial_estado_revision_vigente_tema_idx" ON "conocimiento_comercial"("estado_revision", "vigente", "tema");

CREATE TABLE "conversaciones_comerciales" (
    "id" SERIAL NOT NULL,
    "session_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "prospecto_id" INTEGER,
    "canal" TEXT NOT NULL DEFAULT 'web',
    "estado" TEXT NOT NULL DEFAULT 'abierta',
    "resumen" TEXT,
    "objetivo_pendiente" TEXT,
    "version_estado" INTEGER NOT NULL DEFAULT 1,
    "ultima_actividad" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expira_en" TIMESTAMP(3) NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "conversaciones_comerciales_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mensajes_comerciales" (
    "id" SERIAL NOT NULL,
    "conversacion_id" INTEGER NOT NULL,
    "remitente" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "client_message_id" TEXT,
    "proveedor_message_id" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'confirmado',
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mensajes_comerciales_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "autorizaciones_comerciales" (
    "id" SERIAL NOT NULL,
    "prospecto_id" INTEGER NOT NULL,
    "conversacion_id" INTEGER NOT NULL,
    "proposito" TEXT NOT NULL,
    "version_texto" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "fecha_respuesta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "autorizaciones_comerciales_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "galpones_comerciales" (
    "id" SERIAL NOT NULL,
    "prospecto_id" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "superficie_m2" DOUBLE PRECISION,
    "estado_dato" TEXT NOT NULL DEFAULT 'pendiente',
    "evidencia" TEXT,
    CONSTRAINT "galpones_comerciales_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "conversaciones_comerciales_session_id_key" ON "conversaciones_comerciales"("session_id");
CREATE INDEX "conversaciones_comerciales_prospecto_id_ultima_actividad_idx" ON "conversaciones_comerciales"("prospecto_id", "ultima_actividad");
CREATE INDEX "conversaciones_comerciales_expira_en_idx" ON "conversaciones_comerciales"("expira_en");
CREATE UNIQUE INDEX "mensajes_comerciales_conversacion_id_client_message_id_key" ON "mensajes_comerciales"("conversacion_id", "client_message_id");
CREATE INDEX "mensajes_comerciales_conversacion_id_fecha_creacion_idx" ON "mensajes_comerciales"("conversacion_id", "fecha_creacion");
CREATE INDEX "autorizaciones_comerciales_prospecto_id_proposito_idx" ON "autorizaciones_comerciales"("prospecto_id", "proposito");
CREATE UNIQUE INDEX "galpones_comerciales_prospecto_id_numero_key" ON "galpones_comerciales"("prospecto_id", "numero");

ALTER TABLE "conversaciones_comerciales" ADD CONSTRAINT "conversaciones_comerciales_prospecto_id_fkey" FOREIGN KEY ("prospecto_id") REFERENCES "prospectos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "mensajes_comerciales" ADD CONSTRAINT "mensajes_comerciales_conversacion_id_fkey" FOREIGN KEY ("conversacion_id") REFERENCES "conversaciones_comerciales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "autorizaciones_comerciales" ADD CONSTRAINT "autorizaciones_comerciales_prospecto_id_fkey" FOREIGN KEY ("prospecto_id") REFERENCES "prospectos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "autorizaciones_comerciales" ADD CONSTRAINT "autorizaciones_comerciales_conversacion_id_fkey" FOREIGN KEY ("conversacion_id") REFERENCES "conversaciones_comerciales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "galpones_comerciales" ADD CONSTRAINT "galpones_comerciales_prospecto_id_fkey" FOREIGN KEY ("prospecto_id") REFERENCES "prospectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
