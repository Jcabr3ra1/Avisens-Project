-- Rediseno del cuestionario de cotizacion: se agrega el municipio (A3), se
-- quita el correo (C2), se reordena y se reescriben los textos. El seed no corre
-- en produccion (RUN_SEED=false a proposito), asi que el cambio viaja aqui.
--
-- NO toca el puntaje de ninguna opcion: cada opcion reescrita hereda el
-- puntaje de la que reemplaza. A19 y A20 quedan como estan (sus textos y
-- puntajes esperan la confirmacion de AVISENS), igual que A1 (texto legal) y la
-- opcion "Problemas respiratorios" de A14.
--
-- Orden de ejecucion: primero se encadena el recorrido nuevo y despues se
-- retira C2. `primeraVisible` devuelve FIN cuando la pregunta que busca no esta
-- activa: no salta a la siguiente.

-- 1) Pregunta nueva: municipio y departamento, texto libre, sin puntaje.
INSERT INTO "preguntas_chatbot"
  ("codigo", "bloque", "orden", "texto", "tipo", "opciones", "campo_prospecto", "omitir_si_canal", "puntua", "siguiente", "saltos", "activa")
VALUES
  ('A3', 'A', 3, '¿En qué municipio y departamento está tu granja? (Ej.: Timbío, Cauca)', 'texto_libre', NULL, 'municipio', NULL, false, 'A14', NULL, true)
ON CONFLICT ("codigo") DO UPDATE SET
  "bloque" = 'A',
  "orden" = 3,
  "texto" = EXCLUDED."texto",
  "tipo" = 'texto_libre',
  "opciones" = NULL,
  "campo_prospecto" = 'municipio',
  "omitir_si_canal" = NULL,
  "puntua" = false,
  "siguiente" = 'A14',
  "saltos" = NULL,
  "activa" = true;

-- 2) Recorrido nuevo: A1 -> A2 -> A3 -> A14 -> A16 -> A19 -> A20 -> A18 -> C1 -> FIN
UPDATE "preguntas_chatbot" SET "siguiente" = 'A3'  WHERE "codigo" = 'A2';
UPDATE "preguntas_chatbot" SET "siguiente" = 'A16' WHERE "codigo" = 'A14';
UPDATE "preguntas_chatbot" SET "siguiente" = 'A19' WHERE "codigo" = 'A16';
UPDATE "preguntas_chatbot" SET "siguiente" = 'A20' WHERE "codigo" = 'A19';
UPDATE "preguntas_chatbot" SET "siguiente" = 'A18' WHERE "codigo" = 'A20';
UPDATE "preguntas_chatbot" SET "siguiente" = 'C1'  WHERE "codigo" = 'A18';
UPDATE "preguntas_chatbot" SET "siguiente" = 'FIN' WHERE "codigo" = 'C1';

UPDATE "preguntas_chatbot" SET "orden" = 1 WHERE "codigo" = 'A1';
UPDATE "preguntas_chatbot" SET "orden" = 2 WHERE "codigo" = 'A2';
UPDATE "preguntas_chatbot" SET "orden" = 4 WHERE "codigo" = 'A14';
UPDATE "preguntas_chatbot" SET "orden" = 5 WHERE "codigo" = 'A16';
UPDATE "preguntas_chatbot" SET "orden" = 6 WHERE "codigo" = 'A19';
UPDATE "preguntas_chatbot" SET "orden" = 7 WHERE "codigo" = 'A20';
UPDATE "preguntas_chatbot" SET "orden" = 8 WHERE "codigo" = 'A18';
UPDATE "preguntas_chatbot" SET "orden" = 9 WHERE "codigo" = 'C1';

-- 3) Textos y opciones reescritos (los que no estan bloqueados por AVISENS).
UPDATE "preguntas_chatbot"
SET "texto" = '¿Qué te gustaría vigilar mejor en tus galpones?',
    "opciones" = '["Calor y frío","Humedad y amoniaco","Consumo de alimento","Problemas respiratorios","Aún no lo tengo claro"]'::jsonb
WHERE "codigo" = 'A14';

UPDATE "preguntas_chatbot"
SET "texto" = 'En el último año, ¿se te han muerto aves durante épocas de calor, frío o humedad?',
    "opciones" = '["No","Sí, una vez","Sí, varias veces","No lo sé"]'::jsonb
WHERE "codigo" = 'A16';

UPDATE "preguntas_chatbot"
SET "texto" = '¿Cómo te gustaría pagarlo?',
    "opciones" = '["Comprarlo de una vez","Pagar mensual","Depende del precio","Todavía no sé"]'::jsonb
WHERE "codigo" = 'A18';

UPDATE "preguntas_chatbot"
SET "texto" = '¿A qué número te puede llamar el asesor?'
WHERE "codigo" = 'C1';

-- 4) Matriz de calificacion: las opciones reescritas heredan el puntaje de la
--    anterior. Lo viejo se desactiva, no se borra: respuestas_chatbot apunta
--    aqui y quien ya contesto conserva su historial. Se usa upsert porque
--    produccion puede tener o no la fila (unique codigo_pregunta + opcion).
UPDATE "matriz_calificacion" SET "activa" = false
WHERE ("codigo_pregunta" = 'A14' AND "opcion_respuesta" IN ('Muertes por calor o frío', 'Nada en particular'))
   OR ("codigo_pregunta" = 'A16' AND "opcion_respuesta" = 'No sabría decir')
   OR ("codigo_pregunta" = 'A18' AND "opcion_respuesta" = 'Lo que salga mejor');

INSERT INTO "matriz_calificacion" ("bloque", "codigo_pregunta", "opcion_respuesta", "puntaje", "descripcion", "activa")
VALUES
  ('A', 'A14', 'Calor y frío',            1, 'Calificacion comercial (A14)', true),
  ('A', 'A14', 'Humedad y amoniaco',      1, 'Calificacion comercial (A14)', true),
  ('A', 'A14', 'Consumo de alimento',     1, 'Calificacion comercial (A14)', true),
  ('A', 'A14', 'Problemas respiratorios', 1, 'Calificacion comercial (A14)', true),
  ('A', 'A14', 'Aún no lo tengo claro',   0, 'Calificacion comercial (A14)', true),
  ('A', 'A16', 'No',                      0, 'Calificacion comercial (A16)', true),
  ('A', 'A16', 'Sí, una vez',             2, 'Calificacion comercial (A16)', true),
  ('A', 'A16', 'Sí, varias veces',        3, 'Calificacion comercial (A16)', true),
  ('A', 'A16', 'No lo sé',                0, 'Calificacion comercial (A16)', true),
  ('A', 'A18', 'Comprarlo de una vez',    3, 'Calificacion comercial (A18)', true),
  ('A', 'A18', 'Pagar mensual',           3, 'Calificacion comercial (A18)', true),
  ('A', 'A18', 'Depende del precio',      1, 'Calificacion comercial (A18)', true),
  ('A', 'A18', 'Todavía no sé',           0, 'Calificacion comercial (A18)', true)
ON CONFLICT ("codigo_pregunta", "opcion_respuesta")
DO UPDATE SET "puntaje" = EXCLUDED."puntaje", "activa" = true, "bloque" = 'A';

-- 5) Conversaciones a medias. Quien esta parado en C2 quedaria en una pregunta
--    inactiva (404 al contestar) y no podria retomar nunca. Pasa a C1, que ahora
--    es la ultima. La ventana es minima: WhatsApp cierra por inactividad a los
--    5 minutos y la web no retoma. Quien este a medias en otro punto del
--    recorrido sigue en su pregunta; si ya habia contestado alguna que el
--    orden nuevo pone despues, puede volver a verla una vez.
UPDATE "prospectos" SET "pregunta_actual" = 'C1'
WHERE "estado" = 'en_proceso' AND "pregunta_actual" = 'C2';

UPDATE "prospectos" SET "ultima_pregunta" = 'C1'
WHERE "ultima_pregunta" = 'C2';

-- 6) El correo deja de pedirse. Se desactiva, no se borra: quien ya lo dio
--    conserva su respuesta.
UPDATE "preguntas_chatbot" SET "activa" = false WHERE "codigo" = 'C2';
