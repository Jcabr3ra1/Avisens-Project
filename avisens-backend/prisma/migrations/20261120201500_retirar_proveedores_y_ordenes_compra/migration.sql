-- Retira el apartado completo de proveedores y órdenes de compra.
-- Las carpetas de migraciones anteriores se conservan para mantener íntegro el
-- historial de _prisma_migrations; los cambios se aplican hacia adelante.

-- 1. Desvincular movimientos_inventario de detalles_ordenes_compra
ALTER TABLE "movimientos_inventario"
  DROP CONSTRAINT IF EXISTS "movimientos_inventario_detalle_orden_compra_id_fkey";

DROP INDEX IF EXISTS "mov_inv_detalle_clave_key";
DROP INDEX IF EXISTS "mov_inv_detalle_idx";

ALTER TABLE "movimientos_inventario"
  DROP COLUMN IF EXISTS "detalle_orden_compra_id",
  DROP COLUMN IF EXISTS "clave_idempotencia";

-- 2. Eliminar tablas de órdenes de compra (hijas antes que padre) y su enum
DROP TABLE IF EXISTS "detalles_ordenes_compra";
DROP TABLE IF EXISTS "ordenes_compra";
DROP TYPE IF EXISTS "EstadoOrdenCompra";

-- 3. Desvincular inventario_insumos, lotes y movimientos_financieros de proveedores
ALTER TABLE "inventario_insumos"
  DROP CONSTRAINT IF EXISTS "inventario_insumos_proveedor_habitual_id_fkey";
DROP INDEX IF EXISTS "inventario_insumos_proveedor_habitual_id_idx";
ALTER TABLE "inventario_insumos"
  DROP COLUMN IF EXISTS "proveedor_habitual_id";

ALTER TABLE "lotes"
  DROP CONSTRAINT IF EXISTS "lotes_proveedor_id_fkey";
ALTER TABLE "lotes"
  DROP COLUMN IF EXISTS "proveedor_id";

ALTER TABLE "movimientos_financieros"
  DROP CONSTRAINT IF EXISTS "movimientos_financieros_proveedor_id_fkey";
ALTER TABLE "movimientos_financieros"
  DROP COLUMN IF EXISTS "proveedor_id";

-- 4. Eliminar tabla de proveedores
DROP TABLE IF EXISTS "proveedores";
