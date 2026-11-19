-- Datos de liquidación y cierre de lote: guarda las aves vendidas, peso
-- promedio final, ingreso total y precio por kg, métricas finales definitivas
-- (mortalidad acumulada y FCR) y trazabilidad de quién cerró el lote y cuándo.

ALTER TABLE "lotes"
  ADD COLUMN "cantidad_aves_vendidas" INTEGER,
  ADD COLUMN "peso_promedio_final_g" DOUBLE PRECISION,
  ADD COLUMN "valor_venta_total_cop" DECIMAL(14, 2),
  ADD COLUMN "precio_venta_kg_cop" DECIMAL(14, 2),
  ADD COLUMN "mortalidad_acumulada_final_pct" DOUBLE PRECISION,
  ADD COLUMN "fcr_final" DOUBLE PRECISION,
  ADD COLUMN "cerrado_por_id" INTEGER,
  ADD COLUMN "fecha_cierre" TIMESTAMP(3);

ALTER TABLE "lotes"
  ADD CONSTRAINT "lotes_cerrado_por_id_fkey"
  FOREIGN KEY ("cerrado_por_id") REFERENCES "usuarios"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "lotes_cerrado_por_id_idx" ON "lotes"("cerrado_por_id");
