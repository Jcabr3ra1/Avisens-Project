-- CreateEnum
CREATE TYPE "EstadoDesgloseAlimento" AS ENUM ('legado_sin_desglose', 'lote_sin_marca_alimento', 'marca_sin_catalogo', 'catalogo_invalido', 'catalogo_ambiguo', 'catalogo_incompleto', 'calculado');

-- AlterTable
ALTER TABLE "estimaciones_alimento_plan" ADD COLUMN     "estado_desglose" "EstadoDesgloseAlimento",
ADD COLUMN     "marca_alimento_snapshot" TEXT,
ADD COLUMN     "version_desglose" TEXT;

-- Backfill: las estimaciones calculadas antes de Fase 2B nunca tuvieron desglose
UPDATE "estimaciones_alimento_plan"
SET "estado_desglose" = 'legado_sin_desglose'
WHERE "estado_alimento" = 'calculado' AND "estado_desglose" IS NULL;

-- CreateTable
CREATE TABLE "renglones_estimacion_alimento" (
    "id" SERIAL NOT NULL,
    "estimacion_id" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,
    "tipo_alimento_id" INTEGER,
    "tipo_alimento_nombre_snapshot" TEXT,
    "etapa_snapshot" TEXT,
    "dia_inicio" INTEGER NOT NULL,
    "dia_fin" INTEGER NOT NULL,
    "extendido_hasta_dia_objetivo" BOOLEAN NOT NULL DEFAULT false,
    "consumo_por_ave_g" DECIMAL(12,2) NOT NULL,
    "consumo_total_kg" DECIMAL(14,3) NOT NULL,

    CONSTRAINT "renglones_estimacion_alimento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "renglones_estimacion_alimento_estimacion_id_idx" ON "renglones_estimacion_alimento"("estimacion_id");

-- CreateIndex
CREATE INDEX "renglones_estimacion_alimento_tipo_alimento_id_idx" ON "renglones_estimacion_alimento"("tipo_alimento_id");

-- CreateIndex
CREATE UNIQUE INDEX "renglones_estimacion_alimento_estimacion_id_orden_key" ON "renglones_estimacion_alimento"("estimacion_id", "orden");

-- AddForeignKey
ALTER TABLE "renglones_estimacion_alimento" ADD CONSTRAINT "renglones_estimacion_alimento_estimacion_id_fkey" FOREIGN KEY ("estimacion_id") REFERENCES "estimaciones_alimento_plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renglones_estimacion_alimento" ADD CONSTRAINT "renglones_estimacion_alimento_tipo_alimento_id_fkey" FOREIGN KEY ("tipo_alimento_id") REFERENCES "tipos_alimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CheckConstraint: invariantes escalares por renglon (Fase 2B)
ALTER TABLE "renglones_estimacion_alimento" ADD CONSTRAINT "renglones_alimento_escalares" CHECK (
  orden >= 1
  AND dia_inicio >= 1
  AND dia_fin >= dia_inicio
  AND consumo_por_ave_g >= 0
  AND consumo_total_kg >= 0
);

-- CheckConstraint: coherencia del snapshot por renglon -- las tres columnas
-- del catalogo van juntas (renglon real) o las tres en NULL (renglon
-- sintetico de un hueco); "extendido" solo tiene sentido en un renglon real
ALTER TABLE "renglones_estimacion_alimento" ADD CONSTRAINT "renglones_alimento_snapshot_coherente" CHECK (
  (tipo_alimento_id IS NULL AND tipo_alimento_nombre_snapshot IS NULL AND etapa_snapshot IS NULL AND extendido_hasta_dia_objetivo = false)
  OR
  (tipo_alimento_id IS NOT NULL AND tipo_alimento_nombre_snapshot IS NOT NULL AND btrim(tipo_alimento_nombre_snapshot) <> '' AND etapa_snapshot IN ('preiniciacion', 'iniciacion', 'engorde'))
);

-- CheckConstraint: matriz de estado del desglose (Fase 2B) -- separada de la
-- matriz de estado_alimento de Fase 2A, no la reinterpreta ni la reemplaza
ALTER TABLE "estimaciones_alimento_plan" ADD CONSTRAINT "estimaciones_alimento_matriz_desglose" CHECK (
  (estado_alimento <> 'calculado' AND estado_desglose IS NULL AND version_desglose IS NULL AND marca_alimento_snapshot IS NULL)
  OR
  (estado_alimento = 'calculado' AND estado_desglose = 'legado_sin_desglose' AND version_desglose IS NULL AND marca_alimento_snapshot IS NULL)
  OR
  (estado_alimento = 'calculado' AND estado_desglose = 'lote_sin_marca_alimento' AND version_desglose IS NOT NULL AND btrim(version_desglose) <> '' AND marca_alimento_snapshot IS NULL)
  OR
  (estado_alimento = 'calculado' AND estado_desglose IN ('marca_sin_catalogo', 'catalogo_invalido', 'catalogo_ambiguo', 'catalogo_incompleto', 'calculado')
   AND version_desglose IS NOT NULL AND btrim(version_desglose) <> ''
   AND marca_alimento_snapshot IS NOT NULL AND btrim(marca_alimento_snapshot) <> '')
);
