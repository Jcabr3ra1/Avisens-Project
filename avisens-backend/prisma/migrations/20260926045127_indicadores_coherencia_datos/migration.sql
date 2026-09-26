-- CreateEnum
CREATE TYPE "EstadoCalculoIndicador" AS ENUM ('legado_sin_verificar', 'calculado', 'mortalidad_incoherente');

-- CreateEnum
CREATE TYPE "EstadoPesoIndicador" AS ENUM ('disponible', 'pesaje_fecha_futura', 'sin_pesaje');

-- AlterTable
ALTER TABLE "indicadores_lote" ADD COLUMN     "estado_calculo" "EstadoCalculoIndicador" NOT NULL DEFAULT 'legado_sin_verificar',
ADD COLUMN     "estado_peso" "EstadoPesoIndicador",
ADD COLUMN     "pesaje_fecha_snapshot" DATE,
ADD COLUMN     "pesaje_id_snapshot" INTEGER,
ADD COLUMN     "revision_calculo" INTEGER NOT NULL DEFAULT 0;

-- Matriz de estados verificada contra Postgres real antes de escribir este
-- CHECK (24 casos, 8 validos + 16 invalidos, mas la version ingenua que
-- demuestra la trampa del NULL). Toda comparacion es total (IS [NOT] NULL,
-- igualdad entre booleanos) para que el CHECK nunca evalue a NULL -- un CASE
-- que terminara en NULL dejaria pasar la fila en vez de rechazarla. Cada
-- CASE cierra en ELSE false: un valor nuevo del enum se rechaza hasta que
-- alguien actualice esta matriz a propósito.
ALTER TABLE "indicadores_lote" ADD CONSTRAINT "indicadores_lote_matriz_estados" CHECK (
  ("pesaje_id_snapshot" IS NULL) = ("pesaje_fecha_snapshot" IS NULL)
  AND CASE "estado_calculo"
    WHEN 'legado_sin_verificar' THEN
      "estado_peso" IS NULL AND "pesaje_id_snapshot" IS NULL
    WHEN 'calculado' THEN
      "estado_peso" IS NOT NULL AND "mortalidad_acumulada_pct" IS NOT NULL
    WHEN 'mortalidad_incoherente' THEN
      "estado_peso" IS NOT NULL
      AND "peso_promedio_g" IS NULL AND "fcr" IS NULL AND "epef" IS NULL
      AND "mortalidad_acumulada_pct" IS NULL AND "consumo_acumulado_g" IS NULL
    ELSE false
  END
  AND CASE
    WHEN "estado_peso" IS NULL THEN true
    WHEN "estado_peso" = 'disponible' THEN
      "pesaje_id_snapshot" IS NOT NULL
      AND ("estado_calculo" <> 'calculado' OR "peso_promedio_g" IS NOT NULL)
    WHEN "estado_peso" = 'pesaje_fecha_futura' THEN
      "pesaje_id_snapshot" IS NOT NULL
      AND "peso_promedio_g" IS NULL AND "fcr" IS NULL AND "epef" IS NULL
    WHEN "estado_peso" = 'sin_pesaje' THEN
      "pesaje_id_snapshot" IS NULL
      AND "peso_promedio_g" IS NULL AND "fcr" IS NULL AND "epef" IS NULL
    ELSE false
  END
);

-- Degradacion de escritores que no siguen el protocolo nuevo. revision_calculo
-- no identifica QUIEN escribio -- distingue si esa escritura la incremento
-- (protocolo nuevo) o no (instancia antigua, script, SQL manual, o un error
-- futuro del codigo nuevo que olvide incrementarla). En cualquiera de esos
-- casos la fila deja de ser confiable: se degrada a legado_sin_verificar y se
-- limpian estado_peso y el snapshot, que es justo lo que exige la matriz de
-- arriba para ese estado.
CREATE OR REPLACE FUNCTION fn_degradar_indicador_legado()
RETURNS trigger AS $$
BEGIN
  IF NEW."revision_calculo" = OLD."revision_calculo" THEN
    NEW."estado_calculo" := 'legado_sin_verificar';
    NEW."estado_peso" := NULL;
    NEW."pesaje_id_snapshot" := NULL;
    NEW."pesaje_fecha_snapshot" := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_degradar_indicador_legado
BEFORE UPDATE ON "indicadores_lote"
FOR EACH ROW
EXECUTE FUNCTION fn_degradar_indicador_legado();
