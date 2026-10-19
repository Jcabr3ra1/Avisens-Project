-- Sesión de arranque del ESP32 (B3). Cada encendido genera un UUID que
-- viaja en /ingest: un valor nuevo significa que el dispositivo se reinició.
-- Las órdenes que esa sesión recibió y no confirmó pasan a "incierta" (no se
-- sabe si llegaron a aplicarse) y no se vuelven a entregar.
--
-- ADD VALUE no puede usarse en la misma transacción en que se agrega: esta
-- migración solo lo declara; el índice parcial de en-curso no lo menciona.

-- AlterEnum
ALTER TYPE "EstadoOrdenActuador" ADD VALUE 'incierta';

-- AlterTable
ALTER TABLE "dispositivos" ADD COLUMN     "arranque_anterior" TEXT,
ADD COLUMN     "arranque_desde" TIMESTAMP(3),
ADD COLUMN     "arranque_id" TEXT;

-- AlterTable
ALTER TABLE "ordenes_actuadores" ADD COLUMN     "arranque_entrega" TEXT;

