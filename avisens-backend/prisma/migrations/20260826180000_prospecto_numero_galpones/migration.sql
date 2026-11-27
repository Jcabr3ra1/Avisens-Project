-- El cuestionario preguntaba el tamaño de la granja en metros cuadrados para
-- deducir cuantos galpones tiene (area_granja / area_galpon). Casi nadie sabe
-- de memoria los metros de su granja, pero todo el mundo sabe cuantos galpones
-- tiene: se pregunta directo y de paso el dato es exacto en vez de estimado.
--
-- Nullable a proposito: los prospectos que ya respondieron el cuestionario
-- viejo no tienen este dato, y la cotizacion sigue sabiendo deducirlo del area
-- cuando falta.
ALTER TABLE "prospectos" ADD COLUMN "numero_galpones" INTEGER;
