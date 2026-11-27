-- El recorte del cuestionario de 15 preguntas a 9 pasos viajaba solo en el
-- seed, y en produccion RUN_SEED esta en false a proposito. El codigo se
-- desplego y no tuvo efecto: la base seguia con las 16 preguntas y la segunda
-- seguia siendo "cuantos galpones". Esta migracion lleva el cambio a los datos.
--
-- El orden importa. `primeraVisible` devuelve FIN cuando la pregunta que busca
-- no esta activa: no salta a la siguiente. Desactivar A5 sin reencadenar antes
-- cortaria la conversacion justo despues del nombre, que es peor que no haber
-- hecho nada.

-- 1) Reencadenar el recorrido: A2 -> A16 -> A14 -> A18
UPDATE "preguntas_chatbot" SET "siguiente" = 'A16' WHERE "codigo" = 'A2';
UPDATE "preguntas_chatbot" SET "siguiente" = 'A14' WHERE "codigo" = 'A16';
UPDATE "preguntas_chatbot" SET "siguiente" = 'A18' WHERE "codigo" = 'A14';

-- 2) El orden acompana al recorrido. Nadie ordena por este campo hoy, pero un
--    numero que miente invita a un bug futuro.
UPDATE "preguntas_chatbot" SET "orden" = 1 WHERE "codigo" = 'A1';
UPDATE "preguntas_chatbot" SET "orden" = 2 WHERE "codigo" = 'A2';
UPDATE "preguntas_chatbot" SET "orden" = 3 WHERE "codigo" = 'A16';
UPDATE "preguntas_chatbot" SET "orden" = 4 WHERE "codigo" = 'A14';
UPDATE "preguntas_chatbot" SET "orden" = 5 WHERE "codigo" = 'A18';
UPDATE "preguntas_chatbot" SET "orden" = 6 WHERE "codigo" = 'A19';
UPDATE "preguntas_chatbot" SET "orden" = 7 WHERE "codigo" = 'A20';
UPDATE "preguntas_chatbot" SET "orden" = 8 WHERE "codigo" = 'C1';
UPDATE "preguntas_chatbot" SET "orden" = 9 WHERE "codigo" = 'C2';

-- 3) Rescatar las conversaciones a medias antes de retirarles la pregunta.
--    Quien esta parado en una pregunta inactiva recibe un 404 al contestar y
--    su conversacion queda muerta sin poder retomarla.
--    Se les manda al punto que les toca segun lo que YA respondieron: el orden
--    viejo era A2 -> A5..A13 -> A14 -> A16 -> A18 .. A20 -> A21 -> C1.
UPDATE "prospectos" SET "pregunta_actual" = 'A16'
WHERE "estado" = 'en_proceso'
  AND "pregunta_actual" IN ('A5', 'A6', 'A6B', 'A8', 'A9', 'A11', 'A13');

UPDATE "prospectos" SET "pregunta_actual" = 'C1'
WHERE "estado" = 'en_proceso' AND "pregunta_actual" = 'A21';

-- 4) Retirar las ocho. Se desactivan, no se borran: respuestas_chatbot apunta
--    a preguntas_chatbot, y quien ya las contesto conserva su historial.
UPDATE "preguntas_chatbot" SET "activa" = false
WHERE "codigo" IN ('A5', 'A6', 'A6B', 'A8', 'A9', 'A11', 'A13', 'A21');
