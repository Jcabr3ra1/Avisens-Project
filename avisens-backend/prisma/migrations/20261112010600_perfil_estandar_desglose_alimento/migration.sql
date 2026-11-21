BEGIN;

-- El perfil estándar puede guardar el nombre y la etapa sin una fila de catálogo.
ALTER TABLE "renglones_estimacion_alimento"
  DROP CONSTRAINT "renglones_alimento_snapshot_coherente",
  ADD CONSTRAINT "renglones_alimento_snapshot_coherente" CHECK (
    (
      tipo_alimento_id IS NULL
      AND tipo_alimento_nombre_snapshot IS NULL
      AND etapa_snapshot IS NULL
      AND extendido_hasta_dia_objetivo = false
    )
    OR
    (
      tipo_alimento_nombre_snapshot IS NOT NULL
      AND btrim(tipo_alimento_nombre_snapshot) <> ''
      AND etapa_snapshot IS NOT NULL
      AND etapa_snapshot IN ('preiniciacion', 'iniciacion', 'engorde', 'finalizacion')
    )
  );

-- Con el perfil estándar, la marca del lote puede diferir de la del desglose.
ALTER TABLE "estimaciones_alimento_plan" ADD COLUMN "marca_alimento_lote_snapshot" TEXT;

COMMIT;
