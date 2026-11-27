-- CreateEnum
CREATE TYPE "EstadoCalculoAlimento" AS ENUM ('calculado', 'plan_sin_dia_objetivo', 'sin_consumo_en_curva', 'consumo_insuficiente', 'consumo_fuera_de_rango');

-- CreateTable
CREATE TABLE "estimaciones_alimento_plan" (
    "id" SERIAL NOT NULL,
    "plan_lote_id" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "vigente" BOOLEAN NOT NULL DEFAULT true,
    "estado_alimento" "EstadoCalculoAlimento" NOT NULL,
    "version_algoritmo" TEXT NOT NULL,
    "cantidad_inicial_snapshot" INTEGER NOT NULL,
    "dia_corte" INTEGER NOT NULL,
    "mortalidad_snapshot" JSONB,
    "muertes_al_corte" INTEGER,
    "aves_vivas_al_corte" INTEGER,
    "dia_objetivo_snapshot" INTEGER,
    "curva_version_id_snapshot" INTEGER,
    "consumo_por_ave_g" DECIMAL(12,2),
    "consumo_total_kg" DECIMAL(14,3),
    "motivo" TEXT,
    "creado_por_id" INTEGER NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "estimaciones_alimento_plan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "estimaciones_alimento_plan_plan_lote_id_idx" ON "estimaciones_alimento_plan"("plan_lote_id");

-- CreateIndex
CREATE UNIQUE INDEX "estimaciones_alimento_plan_plan_lote_id_version_key" ON "estimaciones_alimento_plan"("plan_lote_id", "version");

-- AddForeignKey
ALTER TABLE "estimaciones_alimento_plan" ADD CONSTRAINT "estimaciones_alimento_plan_plan_lote_id_fkey" FOREIGN KEY ("plan_lote_id") REFERENCES "planes_lote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimaciones_alimento_plan" ADD CONSTRAINT "estimaciones_alimento_plan_curva_version_id_snapshot_fkey" FOREIGN KEY ("curva_version_id_snapshot") REFERENCES "curvas_geneticas_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimaciones_alimento_plan" ADD CONSTRAINT "estimaciones_alimento_plan_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Garantiza una sola EstimacionAlimentoPlan vigente por plan de lote.
-- Indice unico parcial via SQL manual -- partialIndexes sigue en preview en
-- Prisma 7.8 y se decidio no activarla solo por este indice (misma decision
-- que en curvas_geneticas_una_vigente_por_linea_sexo, planes_lote_una_vigente_por_lote,
-- umbrales_un_vigente_por_semana y alertas_una_automatica_activa_por_sensor).
CREATE UNIQUE INDEX "estimaciones_alimento_una_vigente_por_plan"
  ON "estimaciones_alimento_plan" ("plan_lote_id")
  WHERE "vigente";

-- version siempre positiva.
ALTER TABLE "estimaciones_alimento_plan"
  ADD CONSTRAINT "estimaciones_alimento_version_positiva"
  CHECK ("version" >= 1);

-- version_algoritmo nunca vacio: identifica la formula exacta que produjo
-- esta fila (interpolacion + convencion de mortalidad + redondeo), para que
-- un cambio futuro de algoritmo sea auditable sin ambiguedad.
ALTER TABLE "estimaciones_alimento_plan"
  ADD CONSTRAINT "estimaciones_alimento_algoritmo_no_vacio"
  CHECK (length(trim("version_algoritmo")) > 0);

-- cantidad_inicial_snapshot siempre positiva; dia_corte puede ser 0 (lote
-- que aun no ingresa: la estimacion es de planificacion, ver diseno Fase 2A).
ALTER TABLE "estimaciones_alimento_plan"
  ADD CONSTRAINT "estimaciones_alimento_escalares"
  CHECK ("cantidad_inicial_snapshot" >= 1
     AND "dia_corte" >= 0
     AND ("dia_objetivo_snapshot" IS NULL OR "dia_objetivo_snapshot" >= 1)
     AND ("consumo_por_ave_g" IS NULL OR "consumo_por_ave_g" >= 0)
     AND ("consumo_total_kg"  IS NULL OR "consumo_total_kg"  >= 0));

-- El conteo de aves se ata a su origen: aves_vivas_al_corte es siempre
-- cantidad_inicial_snapshot menos las muertes vistas hasta el corte. Un lote
-- puede extinguirse (0 aves vivas es valido); nunca puede haber un conteo
-- negativo.
ALTER TABLE "estimaciones_alimento_plan"
  ADD CONSTRAINT "estimaciones_alimento_aves_coherentes"
  CHECK (
    ("muertes_al_corte" IS NULL AND "aves_vivas_al_corte" IS NULL)
    OR (
      "muertes_al_corte" >= 0
      AND "aves_vivas_al_corte" >= 0
      AND "aves_vivas_al_corte" = "cantidad_inicial_snapshot" - "muertes_al_corte"
    )
  );

-- mortalidad_snapshot, cuando existe, es un arreglo JSON (lista de
-- {dia, muertes}). No se puede expresar en SQL que la suma de "muertes"
-- coincida con muertes_al_corte (agregado entre elementos de un jsonb); esa
-- invariante la protege el validador puro en TypeScript, con su propia prueba.
ALTER TABLE "estimaciones_alimento_plan"
  ADD CONSTRAINT "estimaciones_alimento_snapshot_es_arreglo"
  CHECK ("mortalidad_snapshot" IS NULL OR jsonb_typeof("mortalidad_snapshot") = 'array');

-- Matriz de estado <-> presencia de snapshot del plan, snapshot de mortalidad
-- y resultados derivados:
--   calculado               -> snapshot del plan + snapshot de mortalidad +
--                               los dos resultados, todos obligatorios
--   plan_sin_dia_objetivo   -> el plan vigente no esta en 'calculado': sin
--                              horizonte no hay nada que fotografiar ni integrar
--   sin_consumo_en_curva
--   | consumo_insuficiente
--   | consumo_fuera_de_rango -> snapshot del plan y de mortalidad obligatorios
--                               (ya se leyo el lote y la curva), resultados nulos
-- Si esta CHECK no existiera, una escritura directa (o un bug futuro en el
-- servicio) podria dejar un plan "calculado" sin consumo_total_kg, o una fila
-- "plan_sin_dia_objetivo" cargando una fotografia de mortalidad que nadie usa.
ALTER TABLE "estimaciones_alimento_plan"
  ADD CONSTRAINT "estimaciones_alimento_matriz_estado"
  CHECK (
    (
      "estado_alimento" = 'calculado'::"EstadoCalculoAlimento"
      AND "dia_objetivo_snapshot" IS NOT NULL
      AND "curva_version_id_snapshot" IS NOT NULL
      AND "mortalidad_snapshot" IS NOT NULL
      AND "muertes_al_corte" IS NOT NULL
      AND "aves_vivas_al_corte" IS NOT NULL
      AND "consumo_por_ave_g" IS NOT NULL
      AND "consumo_total_kg" IS NOT NULL
    )
    OR (
      "estado_alimento" = 'plan_sin_dia_objetivo'::"EstadoCalculoAlimento"
      AND "dia_objetivo_snapshot" IS NULL
      AND "curva_version_id_snapshot" IS NULL
      AND "mortalidad_snapshot" IS NULL
      AND "muertes_al_corte" IS NULL
      AND "aves_vivas_al_corte" IS NULL
      AND "consumo_por_ave_g" IS NULL
      AND "consumo_total_kg" IS NULL
    )
    OR (
      "estado_alimento" IN (
        'sin_consumo_en_curva'::"EstadoCalculoAlimento",
        'consumo_insuficiente'::"EstadoCalculoAlimento",
        'consumo_fuera_de_rango'::"EstadoCalculoAlimento"
      )
      AND "dia_objetivo_snapshot" IS NOT NULL
      AND "curva_version_id_snapshot" IS NOT NULL
      AND "mortalidad_snapshot" IS NOT NULL
      AND "muertes_al_corte" IS NOT NULL
      AND "aves_vivas_al_corte" IS NOT NULL
      AND "consumo_por_ave_g" IS NULL
      AND "consumo_total_kg" IS NULL
    )
  );
