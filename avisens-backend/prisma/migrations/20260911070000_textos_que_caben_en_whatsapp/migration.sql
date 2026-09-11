-- WhatsApp trunca un boton pasados 20 caracteres y una fila de lista pasados
-- 24. Cuando una sola opcion se pasa, la pregunta entera cae a texto numerado
-- y la persona tiene que escribir "3" en vez de tocar una opcion.
--
-- Asi estaban A14 y A19: dos de las cinco preguntas que puntuan se contestaban
-- escribiendo. Y A20, con solo dos opciones, caia a lista pudiendo ser botones.
--
-- Se acortan los textos. El puntaje no cambia: es la misma opcion con menos
-- letras. Va tambien a matriz_calificacion, que empareja por el texto exacto:
-- sin esto, quien conteste la opcion nueva puntuaria cero.

UPDATE "preguntas_chatbot"
SET "opciones" = '["Muertes por calor o frío","Consumo de alimento","Humedad y amoniaco","Problemas respiratorios","Nada en particular"]'::jsonb
WHERE "codigo" = 'A14';

UPDATE "preguntas_chatbot"
SET "opciones" = '["Ya tengo cotizaciones","Estoy comparando","Solo a ustedes","No sé qué más hay"]'::jsonb
WHERE "codigo" = 'A19';

UPDATE "preguntas_chatbot"
SET "opciones" = '["Sí, yo decido","Decide otra persona"]'::jsonb
WHERE "codigo" = 'A20';

-- La matriz empareja la respuesta por su texto: si no se renombra aqui, la
-- opcion nueva no encuentra fila y suma cero.
UPDATE "matriz_calificacion" SET "opcion_respuesta" = 'Muertes por calor o frío'
WHERE "codigo_pregunta" = 'A14' AND "opcion_respuesta" = 'Mortalidad por calor o frío';

UPDATE "matriz_calificacion" SET "opcion_respuesta" = 'Consumo de alimento'
WHERE "codigo_pregunta" = 'A14' AND "opcion_respuesta" = 'Consumo de alimento descontrolado';

UPDATE "matriz_calificacion" SET "opcion_respuesta" = 'Problemas respiratorios'
WHERE "codigo_pregunta" = 'A14' AND "opcion_respuesta" = 'Enfermedades respiratorias';

UPDATE "matriz_calificacion" SET "opcion_respuesta" = 'Ya tengo cotizaciones'
WHERE "codigo_pregunta" = 'A19' AND "opcion_respuesta" = 'Ya tengo otras cotizaciones';

UPDATE "matriz_calificacion" SET "opcion_respuesta" = 'Solo a ustedes'
WHERE "codigo_pregunta" = 'A19' AND "opcion_respuesta" = 'Solo los estoy viendo a ustedes';

UPDATE "matriz_calificacion" SET "opcion_respuesta" = 'Decide otra persona'
WHERE "codigo_pregunta" = 'A20' AND "opcion_respuesta" = 'No, decide otra persona';

-- Se renombra en vez de anadir filas nuevas porque `puntajeDe` empareja por
-- texto exacto y no mira si la fila esta activa: dejar las dos vivas seria
-- ambiguo. Comprobado antes de escribir esto que no hay ninguna conversacion
-- a medias parada en A14, A19 ni A20, asi que nadie tiene delante las opciones
-- viejas en el momento del despliegue.
