-- Garantiza un solo umbral vigente por galpon, variable y semana de vida.
-- No la reemplaza @@unique([galpon_id, variable, semana_vida, version]), que
-- ya existe: esa impide repetir version, no impide que dos versiones
-- distintas queden vigentes a la vez. "un solo vigente" es de esquema, no de
-- version: no se declara en schema.prisma porque partialIndexes sigue en
-- preview en Prisma 7.8 y se decidio no activarla solo por este indice.
CREATE UNIQUE INDEX "umbrales_un_vigente_por_semana"
  ON "umbrales_ambientales" ("galpon_id", "variable", "semana_vida")
  WHERE "vigente";
