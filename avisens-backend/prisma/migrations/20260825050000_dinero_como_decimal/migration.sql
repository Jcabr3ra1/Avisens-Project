-- El dinero pasa de double precision a numeric(14, 2).
--
-- double precision guarda en binario: 0.1 + 0.2 no da 0.3, y el error se
-- acumula al sumar y multiplicar. numeric guarda en base 10, digito a digito,
-- y no lo hace. Solo se cambian las columnas que son dinero; las medidas
-- fisicas (peso, temperatura, area) siguen en Float a proposito.
--
-- No hace falta USING: de double precision a numeric existe conversion
-- estandar en PostgreSQL. Tampoco hay DEFAULT que quitar y reponer, porque
-- ninguna de estas columnas lo tiene.

-- AlterTable
ALTER TABLE "catalogo_sensores" ALTER COLUMN "precio_unitario_cop" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "cotizaciones" ALTER COLUMN "valor_total_cop" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "equipos" ALTER COLUMN "costo_cop" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "inventario_insumos" ALTER COLUMN "precio_unitario_cop" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "lotes" ALTER COLUMN "costo_pollito_unitario" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "presupuesto_total_cop" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "mantenimientos" ALTER COLUMN "costo_cop" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "mantenimientos_repuestos" ALTER COLUMN "costo_cop" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "movimientos_financieros" ALTER COLUMN "valor_cop" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "ordenes_compra" ALTER COLUMN "valor_total_cop" SET DATA TYPE DECIMAL(14,2);
