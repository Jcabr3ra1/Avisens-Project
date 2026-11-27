-- Garantiza un solo lote en estado 'activo' por galpon. Regla de negocio
-- aprobada: un galpon conserva sus lotes historicos, pero solo puede tener
-- uno activo a la vez. No desactiva ni finaliza automaticamente el anterior
-- -- crear()/activar()/actualizar() rechazan la transicion con 409 si ya
-- existe otro activo en el mismo galpon.
--
-- SQL manual, no declarado en schema.prisma: mismo motivo que en Umbrales y
-- Alertas -- partialIndexes sigue en preview en Prisma 7.8.
CREATE UNIQUE INDEX "lotes_un_activo_por_galpon"
  ON "lotes" ("galpon_id")
  WHERE "estado" = 'activo'::"EstadoLote";
