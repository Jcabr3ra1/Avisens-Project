-- Las curvas objetivo son datos de referencia del fabricante, no configuracion
-- de la granja. Editar el peso objetivo del dia 21 de Italcol falsea el manual,
-- y los indicadores comparan contra eso durante todo el ciclo sin que nadie
-- note que la referencia se movio.
--
-- `fuente` decia de donde salio el dato, pero es texto libre y se puede pisar:
-- no distingue lo sembrado de lo anadido a mano, asi que no sirve de candado.
--
-- `origen` si: lo pone el seed, el DTO no lo acepta, y PATCH y DELETE rechazan
-- las filas que vienen del manual.

ALTER TABLE "curvas_objetivo" ADD COLUMN "origen" TEXT NOT NULL DEFAULT 'manual';

-- Todo lo que hay hoy salio del seed: 6 puntos por cada combinacion de marca y
-- sexo, de los manuales de Italcol y Solla.
UPDATE "curvas_objetivo" SET "origen" = 'seed';
