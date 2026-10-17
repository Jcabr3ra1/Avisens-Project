-- El código del controlador mantiene su unicidad y el token autentica la ingesta.
-- Esta columna no participa en las relaciones con galpones, sensores o ingestas.
ALTER TABLE "dispositivos" DROP COLUMN "mac_address";
