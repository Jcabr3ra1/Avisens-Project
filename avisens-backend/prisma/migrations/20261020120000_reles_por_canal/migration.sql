-- Relés K1-K4 identificados por ESP32 + canal ("rele:k1".."rele:k4").
--
-- El único existente (dispositivo_id, tipo, canal) no basta para los relés:
-- su `tipo` es el nombre visible (texto libre y editable), así que dos relés
-- con distinto nombre podrían ocupar el mismo canal y la identidad física
-- quedaría ambigua. Este índice lo impide aunque dos registros lleguen a la
-- vez. Los sensores retirados quedan con canal NULL y no ocupan el canal.
--
-- No se toca ningún dato: hasta ahora ningún sensor podía tener un canal
-- "rele:*" (la API solo aceptaba "gpio:<n>").
--
-- SQL manual, no declarado en schema.prisma: mismo motivo que
-- "ordenes_actuadores_una_en_curso" -- partialIndexes sigue en preview en
-- Prisma 7.8.
CREATE UNIQUE INDEX "sensores_rele_canal_unico"
  ON "sensores" ("dispositivo_id", "canal")
  WHERE "canal" LIKE 'rele:%';
