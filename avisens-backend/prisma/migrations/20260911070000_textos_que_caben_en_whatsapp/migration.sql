-- WhatsApp trunca un boton pasados 20 caracteres y una fila de lista pasados
-- 24. Cuando una sola opcion se pasa, la pregunta entera cae a texto numerado
-- y la persona tiene que escribir "3" en vez de tocar.
--
-- Asi estaban A14 y A19: dos de las cinco preguntas que puntuan se contestaban
-- escribiendo. Y A20, con solo dos opciones, caia a lista pudiendo ser botones.
--
-- La primera version de esta migracion renombraba las filas de la matriz con
-- UPDATE y reventaba contra el unique (codigo_pregunta, opcion_respuesta):
-- produccion YA tenia filas con estos textos, de una version anterior del
-- cuestionario. Se desactiva lo viejo y se asegura lo nuevo con upsert, que
-- funciona exista o no la fila.

UPDATE "preguntas_chatbot"
SET "opciones" = '["Muertes por calor o frío","Consumo de alimento","Humedad y amoniaco","Problemas respiratorios","Nada en particular"]'::jsonb
WHERE "codigo" = 'A14';

UPDATE "preguntas_chatbot"
SET "opciones" = '["Ya tengo cotizaciones","Estoy comparando","Solo a ustedes","No sé qué más hay"]'::jsonb
WHERE "codigo" = 'A19';

UPDATE "preguntas_chatbot"
SET "opciones" = '["Sí, yo decido","Decide otra persona"]'::jsonb
WHERE "codigo" = 'A20';

-- Las que dejan de ofrecerse. No se borran: respuestas_chatbot apunta aqui y
-- quien ya contesto conserva su historial.
UPDATE "matriz_calificacion" SET "activa" = false
WHERE ("codigo_pregunta" = 'A14' AND "opcion_respuesta" IN ('Mortalidad por calor o frío', 'Consumo de alimento descontrolado', 'Enfermedades respiratorias'))
   OR ("codigo_pregunta" = 'A19' AND "opcion_respuesta" IN ('Ya tengo otras cotizaciones', 'Solo los estoy viendo a ustedes'))
   OR ("codigo_pregunta" = 'A20' AND "opcion_respuesta" = 'No, decide otra persona');

-- Y las que se ofrecen ahora, con su puntaje. `puntajeDe` empareja por el
-- texto exacto: sin fila activa con el texto nuevo, la respuesta sumaria cero.
INSERT INTO "matriz_calificacion" ("bloque", "codigo_pregunta", "opcion_respuesta", "puntaje", "descripcion", "activa")
VALUES
  ('A', 'A14', 'Muertes por calor o frío',  1, 'Calificacion comercial (A14)', true),
  ('A', 'A14', 'Consumo de alimento',       1, 'Calificacion comercial (A14)', true),
  ('A', 'A14', 'Humedad y amoniaco',        1, 'Calificacion comercial (A14)', true),
  ('A', 'A14', 'Problemas respiratorios',   1, 'Calificacion comercial (A14)', true),
  ('A', 'A14', 'Nada en particular',        0, 'Calificacion comercial (A14)', true),
  ('A', 'A19', 'Ya tengo cotizaciones',     3, 'Calificacion comercial (A19)', true),
  ('A', 'A19', 'Estoy comparando',          1, 'Calificacion comercial (A19)', true),
  ('A', 'A19', 'Solo a ustedes',            0, 'Calificacion comercial (A19)', true),
  ('A', 'A19', 'No sé qué más hay',         0, 'Calificacion comercial (A19)', true),
  ('A', 'A20', 'Sí, yo decido',             2, 'Calificacion comercial (A20)', true),
  ('A', 'A20', 'Decide otra persona',       0, 'Calificacion comercial (A20)', true)
ON CONFLICT ("codigo_pregunta", "opcion_respuesta")
DO UPDATE SET "puntaje" = EXCLUDED."puntaje", "activa" = true, "bloque" = 'A';
