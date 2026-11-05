-- Fail safely if another environment still has values in fields being retired.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "usuarios"
    WHERE "foto_url" IS NOT NULL
       OR "huella_voz_url" IS NOT NULL
       OR "pin_voz_hash" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Cannot retire user profile/voice fields: non-null values exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "recuperaciones_password"
    WHERE "token_hash" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Cannot retire recovery token_hash: non-null values exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "respuestas_chatbot"
    WHERE "matriz_id" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Cannot retire respuestas_chatbot.matriz_id: non-null values exist';
  END IF;
END $$;

-- The scoring result remains in puntaje_obtenido; the matrix FK is unused.
ALTER TABLE "respuestas_chatbot"
  DROP CONSTRAINT "respuestas_chatbot_matriz_id_fkey";

ALTER TABLE "recuperaciones_password"
  DROP COLUMN "token_hash";

ALTER TABLE "respuestas_chatbot"
  DROP COLUMN "matriz_id";

ALTER TABLE "usuarios"
  DROP COLUMN "foto_url",
  DROP COLUMN "huella_voz_url",
  DROP COLUMN "pin_voz_hash";
