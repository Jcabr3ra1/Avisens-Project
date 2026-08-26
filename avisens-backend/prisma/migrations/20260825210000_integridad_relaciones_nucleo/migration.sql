-- La organización de una granja debe coincidir con la de su propietario. La
-- validación previa evita instalar silenciosamente la restricción sobre datos
-- históricos inconsistentes.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "granjas" granja
    JOIN "usuarios" propietario ON propietario."id" = granja."propietario_id"
    WHERE propietario."organizacion_id" IS DISTINCT FROM granja."organizacion_id"
  ) THEN
    RAISE EXCEPTION 'Hay granjas cuya organizacion no coincide con la de su propietario';
  END IF;
END $$;

CREATE UNIQUE INDEX "usuarios_id_organizacion_id_key"
ON "usuarios"("id", "organizacion_id");

-- Una organización con usuarios no se puede borrar y dejarlos sin tenant.
-- Los administradores globales siguen pudiendo tener organizacion_id NULL desde
-- su creación; lo que se evita es convertir miembros existentes en huérfanos.
ALTER TABLE "usuarios"
DROP CONSTRAINT "usuarios_organizacion_id_fkey";

ALTER TABLE "usuarios"
ADD CONSTRAINT "usuarios_organizacion_id_fkey"
FOREIGN KEY ("organizacion_id") REFERENCES "organizaciones"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "granjas"
DROP CONSTRAINT "granjas_propietario_id_fkey";

ALTER TABLE "granjas"
ADD CONSTRAINT "granjas_propietario_id_organizacion_id_fkey"
FOREIGN KEY ("propietario_id", "organizacion_id")
REFERENCES "usuarios"("id", "organizacion_id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Un sensor y el dispositivo que recibe sus lecturas siempre deben compartir
-- galpón. Hasta ahora esta regla solo existía en SensoresService.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "sensores" sensor
    JOIN "dispositivos" dispositivo
      ON dispositivo."id" = sensor."dispositivo_id"
    WHERE dispositivo."galpon_id" <> sensor."galpon_id"
  ) THEN
    RAISE EXCEPTION 'Hay sensores conectados a dispositivos de otro galpon';
  END IF;
END $$;

CREATE UNIQUE INDEX "dispositivos_id_galpon_id_key"
ON "dispositivos"("id", "galpon_id");

ALTER TABLE "sensores"
DROP CONSTRAINT "sensores_dispositivo_id_fkey";

ALTER TABLE "sensores"
ADD CONSTRAINT "sensores_dispositivo_id_galpon_id_fkey"
FOREIGN KEY ("dispositivo_id", "galpon_id")
REFERENCES "dispositivos"("id", "galpon_id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Sanea asignaciones históricas que ya no cumplen el límite organizacional o
-- apuntan a cuentas/infraestructura inactivas. Se conserva la fila como
-- historial, pero deja de conceder acceso.
UPDATE "usuarios_galpones" asignacion
SET "activa" = false
FROM "usuarios" usuario,
     "roles" rol,
     "galpones" galpon,
     "granjas" granja,
     "organizaciones" organizacion
WHERE asignacion."usuario_id" = usuario."id"
  AND usuario."rol_id" = rol."id"
  AND asignacion."galpon_id" = galpon."id"
  AND galpon."granja_id" = granja."id"
  AND granja."organizacion_id" = organizacion."id"
  AND asignacion."activa" = true
  AND (
    rol."nombre" <> 'Operario'
    OR usuario."organizacion_id" IS DISTINCT FROM granja."organizacion_id"
    OR usuario."activo" = false
    OR galpon."activo" = false
    OR granja."activa" = false
    OR organizacion."activa" = false
  );

-- El filtro operativo parte del galpón y comprueba usuario + estado en cada
-- asignación; este índice cubre exactamente esa ruta.
CREATE INDEX "usuarios_galpones_galpon_id_usuario_id_activa_idx"
ON "usuarios_galpones"("galpon_id", "usuario_id", "activa");
