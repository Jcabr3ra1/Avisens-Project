-- Cada granja pertenece a una organizacion. El propietario sigue siendo el
-- responsable directo, mientras la organizacion define el limite de datos.
ALTER TABLE "granjas" ADD COLUMN "organizacion_id" INTEGER;

-- Los propietarios existentes necesitan una organizacion antes de hacer la
-- nueva FK obligatoria. Tambien cubre usuarios de otro rol que ya sean dueños
-- de una granja (por ejemplo, datos demo creados por un administrador).
DO $$
DECLARE
  dueno RECORD;
  nueva_organizacion_id INTEGER;
BEGIN
  FOR dueno IN
    SELECT DISTINCT u."id", u."nombre_completo"
    FROM "usuarios" u
    JOIN "roles" r ON r."id" = u."rol_id"
    WHERE u."organizacion_id" IS NULL
      AND (
        r."nombre" = 'Propietario'
        OR EXISTS (
          SELECT 1
          FROM "granjas" g
          WHERE g."propietario_id" = u."id"
        )
      )
  LOOP
    INSERT INTO "organizaciones" (
      "nombre",
      "plan",
      "activa",
      "fecha_creacion"
    ) VALUES (
      'Organizacion de ' || dueno."nombre_completo",
      'free',
      true,
      CURRENT_TIMESTAMP
    )
    RETURNING "id" INTO nueva_organizacion_id;

    UPDATE "usuarios"
    SET "organizacion_id" = nueva_organizacion_id
    WHERE "id" = dueno."id";
  END LOOP;
END $$;

UPDATE "granjas" g
SET "organizacion_id" = u."organizacion_id"
FROM "usuarios" u
WHERE u."id" = g."propietario_id";

ALTER TABLE "granjas" ALTER COLUMN "organizacion_id" SET NOT NULL;

ALTER TABLE "granjas"
ADD CONSTRAINT "granjas_organizacion_id_fkey"
FOREIGN KEY ("organizacion_id") REFERENCES "organizaciones"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "usuarios_organizacion_id_idx"
ON "usuarios"("organizacion_id");

CREATE INDEX "granjas_organizacion_id_idx"
ON "granjas"("organizacion_id");

-- Una asignacion activa/inactiva se actualiza sobre la misma fila; no se
-- permiten duplicados del mismo usuario en el mismo galpon.
DELETE FROM "usuarios_galpones" repetida
USING "usuarios_galpones" conservada
WHERE repetida."usuario_id" = conservada."usuario_id"
  AND repetida."galpon_id" = conservada."galpon_id"
  AND repetida."id" > conservada."id";

DROP INDEX IF EXISTS "usuarios_galpones_usuario_id_idx";

CREATE UNIQUE INDEX "usuarios_galpones_usuario_id_galpon_id_key"
ON "usuarios_galpones"("usuario_id", "galpon_id");
