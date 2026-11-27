-- Escrita a mano a proposito: Prisma proponia borrar y recrear cada columna,
-- lo que habria perdido el estado de todas las filas. El USING convierte los
-- valores existentes. Donde hay default se quita antes, porque el literal de
-- texto no es compatible con el tipo nuevo, y se vuelve a poner ya como enum.

-- sensores
CREATE TYPE "EstadoSensor" AS ENUM ('activo', 'inactivo', 'mantenimiento', 'falla');
ALTER TABLE "sensores" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "sensores"
  ALTER COLUMN "estado" TYPE "EstadoSensor"
  USING "estado"::"EstadoSensor";
ALTER TABLE "sensores" ALTER COLUMN "estado" SET DEFAULT 'activo';

-- dispositivos
CREATE TYPE "EstadoDispositivo" AS ENUM ('online', 'offline');
ALTER TABLE "dispositivos" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "dispositivos"
  ALTER COLUMN "estado" TYPE "EstadoDispositivo"
  USING "estado"::"EstadoDispositivo";
ALTER TABLE "dispositivos" ALTER COLUMN "estado" SET DEFAULT 'offline';

-- lotes
CREATE TYPE "EstadoLote" AS ENUM ('activo', 'finalizado', 'inactivo');
ALTER TABLE "lotes" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "lotes"
  ALTER COLUMN "estado" TYPE "EstadoLote"
  USING "estado"::"EstadoLote";
ALTER TABLE "lotes" ALTER COLUMN "estado" SET DEFAULT 'activo';

-- alertas
CREATE TYPE "EstadoAlerta" AS ENUM ('abierta', 'en_proceso', 'cerrada');
ALTER TABLE "alertas" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "alertas"
  ALTER COLUMN "estado" TYPE "EstadoAlerta"
  USING "estado"::"EstadoAlerta";
ALTER TABLE "alertas" ALTER COLUMN "estado" SET DEFAULT 'abierta';

-- ordenes_compra
CREATE TYPE "EstadoOrdenCompra" AS ENUM ('pendiente', 'en_proceso', 'entregada', 'cancelada');
ALTER TABLE "ordenes_compra" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "ordenes_compra"
  ALTER COLUMN "estado" TYPE "EstadoOrdenCompra"
  USING "estado"::"EstadoOrdenCompra";
ALTER TABLE "ordenes_compra" ALTER COLUMN "estado" SET DEFAULT 'pendiente';

-- recomendaciones
CREATE TYPE "EstadoRecomendacion" AS ENUM ('pendiente', 'resuelta');
ALTER TABLE "recomendaciones" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "recomendaciones"
  ALTER COLUMN "estado" TYPE "EstadoRecomendacion"
  USING "estado"::"EstadoRecomendacion";
ALTER TABLE "recomendaciones" ALTER COLUMN "estado" SET DEFAULT 'pendiente';

-- accionamientos_equipos
CREATE TYPE "EstadoAccionamiento" AS ENUM ('encendido', 'apagado');
ALTER TABLE "accionamientos_equipos"
  ALTER COLUMN "estado" TYPE "EstadoAccionamiento"
  USING "estado"::"EstadoAccionamiento";
