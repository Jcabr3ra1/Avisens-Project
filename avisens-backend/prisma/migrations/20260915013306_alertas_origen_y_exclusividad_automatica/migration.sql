-- AlterTable
ALTER TABLE "alertas" ADD COLUMN     "origen" TEXT NOT NULL DEFAULT 'desconocido';

-- Garantiza una sola alerta AUTOMATICA activa por sensor. Las manuales
-- (origen='manual') y el historico sin evidencia (origen='desconocido')
-- quedan fuera a proposito: la Opcion 2 aprobada permite que una alerta
-- manual y una automatica convivan para el mismo sensor. No se declara en
-- schema.prisma porque partialIndexes sigue en preview en Prisma 7.8 y se
-- decidio no activarla solo por este indice (misma decision que en
-- umbrales_un_vigente_por_semana).
CREATE UNIQUE INDEX "alertas_una_automatica_activa_por_sensor"
  ON "alertas" ("sensor_id")
  WHERE "origen" = 'automatica' AND "estado" IN ('abierta', 'en_proceso');

