-- Prepara movimientos_inventario para que el modulo empiece a escribirlo.
--
-- Las cantidades pasan a numeric por la misma razon que el dinero: el stock se
-- acumula movimiento a movimiento, y en double precision ese acumulado deriva.
-- Tres decimales porque se mide en kilos.
--
-- tipo_movimiento pasa de texto libre y nullable a un enum obligatorio: un
-- movimiento sin tipo no significa nada.

-- CreateEnum
CREATE TYPE "TipoMovimientoInventario" AS ENUM ('entrada', 'salida', 'ajuste');

-- AlterTable
ALTER TABLE "inventario_insumos"
  ALTER COLUMN "stock_actual" SET DATA TYPE DECIMAL(14,3),
  ALTER COLUMN "stock_minimo" SET DATA TYPE DECIMAL(14,3);

-- AlterTable
-- Con USING en vez del DROP COLUMN + ADD COLUMN que propone Prisma: la tabla
-- esta vacia (ningun modulo la escribia todavia), pero si tuviera filas el
-- USING las convierte, y falla si alguna tiene el tipo nulo. Preferible a
-- perder los datos sin avisar.
ALTER TABLE "movimientos_inventario"
  ALTER COLUMN "cantidad" SET DATA TYPE DECIMAL(14,3),
  ALTER COLUMN "stock_resultante" SET DATA TYPE DECIMAL(14,3);

ALTER TABLE "movimientos_inventario"
  ALTER COLUMN "tipo_movimiento" TYPE "TipoMovimientoInventario"
  USING "tipo_movimiento"::"TipoMovimientoInventario";

ALTER TABLE "movimientos_inventario"
  ALTER COLUMN "tipo_movimiento" SET NOT NULL;
