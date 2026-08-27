-- Consolida posibles duplicados históricos antes de imponer la identidad
-- nombre+versión. Se conservan todas las relaciones apuntando al registro más
-- antiguo del grupo.
WITH duplicados AS (
  SELECT "id",
         MIN("id") OVER (PARTITION BY "nombre", "version") AS "conservar_id"
  FROM "modelos_ml"
  WHERE "version" IS NOT NULL
)
UPDATE "predicciones" prediccion
SET "modelo_id" = duplicado."conservar_id"
FROM duplicados duplicado
WHERE prediccion."modelo_id" = duplicado."id"
  AND duplicado."id" <> duplicado."conservar_id";

WITH duplicados AS (
  SELECT "id",
         MIN("id") OVER (PARTITION BY "nombre", "version") AS "conservar_id"
  FROM "modelos_ml"
  WHERE "version" IS NOT NULL
)
UPDATE "analisis_bioacustico" analisis
SET "modelo_id" = duplicado."conservar_id"
FROM duplicados duplicado
WHERE analisis."modelo_id" = duplicado."id"
  AND duplicado."id" <> duplicado."conservar_id";

WITH duplicados AS (
  SELECT "id",
         MIN("id") OVER (PARTITION BY "nombre", "version") AS "conservar_id"
  FROM "modelos_ml"
  WHERE "version" IS NOT NULL
)
UPDATE "analisis_vision" analisis
SET "modelo_id" = duplicado."conservar_id"
FROM duplicados duplicado
WHERE analisis."modelo_id" = duplicado."id"
  AND duplicado."id" <> duplicado."conservar_id";

WITH duplicados AS (
  SELECT "id",
         MIN("id") OVER (PARTITION BY "nombre", "version") AS "conservar_id"
  FROM "modelos_ml"
  WHERE "version" IS NOT NULL
)
DELETE FROM "modelos_ml" modelo
USING duplicados duplicado
WHERE modelo."id" = duplicado."id"
  AND duplicado."id" <> duplicado."conservar_id";

CREATE UNIQUE INDEX "modelos_ml_nombre_version_key"
ON "modelos_ml"("nombre", "version");
