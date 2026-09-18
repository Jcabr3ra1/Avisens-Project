-- CreateEnum
CREATE TYPE "EstadoCalculoPlan" AS ENUM ('calculado', 'sin_curva', 'fuera_de_rango', 'datos_insuficientes');

-- AlterTable
ALTER TABLE "lotes" ADD COLUMN     "linea_genetica_id" INTEGER;

-- CreateTable
CREATE TABLE "planes_lote" (
    "id" SERIAL NOT NULL,
    "lote_id" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "vigente" BOOLEAN NOT NULL DEFAULT true,
    "peso_objetivo_g" DECIMAL(10,2) NOT NULL,
    "estado_dia" "EstadoCalculoPlan" NOT NULL,
    "curva_version_id" INTEGER,
    "linea_genetica_id_snapshot" INTEGER,
    "sexo_curva_snapshot" "SexoCurva" NOT NULL,
    "fecha_ingreso_snapshot" DATE NOT NULL,
    "dia_objetivo" INTEGER,
    "dia_objetivo_interpolado" DECIMAL(9,6),
    "fecha_salida_calculada" DATE,
    "motivo" TEXT,
    "creado_por_id" INTEGER NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "planes_lote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "planes_lote_lote_id_idx" ON "planes_lote"("lote_id");

-- CreateIndex
CREATE UNIQUE INDEX "planes_lote_lote_id_version_key" ON "planes_lote"("lote_id", "version");

-- AddForeignKey
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_linea_genetica_id_fkey" FOREIGN KEY ("linea_genetica_id") REFERENCES "lineas_geneticas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planes_lote" ADD CONSTRAINT "planes_lote_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planes_lote" ADD CONSTRAINT "planes_lote_curva_version_id_fkey" FOREIGN KEY ("curva_version_id") REFERENCES "curvas_geneticas_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planes_lote" ADD CONSTRAINT "planes_lote_linea_genetica_id_snapshot_fkey" FOREIGN KEY ("linea_genetica_id_snapshot") REFERENCES "lineas_geneticas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planes_lote" ADD CONSTRAINT "planes_lote_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Garantiza un solo PlanLote vigente por lote.
-- Indice unico parcial via SQL manual -- partialIndexes sigue en preview en
-- Prisma 7.8 y se decidio no activarla solo por este indice (misma decision
-- que en curvas_geneticas_una_vigente_por_linea_sexo, umbrales_un_vigente_por_semana
-- y alertas_una_automatica_activa_por_sensor).
CREATE UNIQUE INDEX "planes_lote_una_vigente_por_lote"
  ON "planes_lote" ("lote_id")
  WHERE "vigente";

-- version siempre positiva.
ALTER TABLE "planes_lote"
  ADD CONSTRAINT "planes_lote_version_positiva"
  CHECK ("version" >= 1);

-- peso objetivo siempre positivo.
ALTER TABLE "planes_lote"
  ADD CONSTRAINT "planes_lote_peso_objetivo_positivo"
  CHECK ("peso_objetivo_g" > 0);

-- dia objetivo, cuando existe, siempre positivo (dia 1 = primer dia de vida).
ALTER TABLE "planes_lote"
  ADD CONSTRAINT "planes_lote_dia_objetivo_positivo"
  CHECK ("dia_objetivo" IS NULL OR "dia_objetivo" >= 1);

-- Matriz de estado <-> presencia de curva y resultados derivados:
--   calculado            -> curva y los tres resultados derivados obligatorios
--   sin_curva             -> curva y resultados derivados nulos
--   fuera_de_rango        -> curva obligatoria, resultados derivados nulos
--   datos_insuficientes   -> curva obligatoria, resultados derivados nulos
-- Si esta CHECK no existiera, una escritura directa (o un bug futuro en el
-- servicio) podria dejar un plan "calculado" sin dia_objetivo, o un plan
-- "sin_curva" con una curva_version_id colgada.
ALTER TABLE "planes_lote"
  ADD CONSTRAINT "planes_lote_matriz_estado_dia"
  CHECK (
    (
      "estado_dia" = 'calculado'::"EstadoCalculoPlan"
      AND "curva_version_id" IS NOT NULL
      AND "dia_objetivo" IS NOT NULL
      AND "dia_objetivo_interpolado" IS NOT NULL
      AND "fecha_salida_calculada" IS NOT NULL
    )
    OR (
      "estado_dia" = 'sin_curva'::"EstadoCalculoPlan"
      AND "curva_version_id" IS NULL
      AND "dia_objetivo" IS NULL
      AND "dia_objetivo_interpolado" IS NULL
      AND "fecha_salida_calculada" IS NULL
    )
    OR (
      "estado_dia" IN ('fuera_de_rango'::"EstadoCalculoPlan", 'datos_insuficientes'::"EstadoCalculoPlan")
      AND "curva_version_id" IS NOT NULL
      AND "dia_objetivo" IS NULL
      AND "dia_objetivo_interpolado" IS NULL
      AND "fecha_salida_calculada" IS NULL
    )
  );
