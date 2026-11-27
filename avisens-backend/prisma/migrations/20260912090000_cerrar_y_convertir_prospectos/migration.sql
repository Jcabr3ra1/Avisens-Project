-- El CRM se acababa en "asignado". `cerrado` existia en el enum y ninguna ruta
-- lo escribia, asi que un prospecto asignado se quedaba asignado para siempre y
-- no habia forma de saber cuantos de los que califico el bot acabaron siendo
-- clientes, que es la unica metrica que justifica tener un CRM.
--
-- `cerrado` por si solo tampoco alcanza: no distingue ganado de perdido, y el
-- motivo de un "perdido" es justo lo que sirve para aprender por que se caen.
-- Deducir el resultado de si hay cliente o no obliga a explicarle a todo el que
-- lea la tabla por que un campo vacio significa una cosa y no otra.

ALTER TABLE "prospectos" ADD COLUMN "usuario_convertido_id" INTEGER;
ALTER TABLE "prospectos" ADD COLUMN "resultado_cierre" TEXT;
ALTER TABLE "prospectos" ADD COLUMN "motivo_cierre" TEXT;

ALTER TABLE "prospectos"
  ADD CONSTRAINT "prospectos_usuario_convertido_id_fkey"
  FOREIGN KEY ("usuario_convertido_id") REFERENCES "usuarios"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Se busca por aqui para responder "de donde salio este cliente".
CREATE INDEX "prospectos_usuario_convertido_id_idx" ON "prospectos"("usuario_convertido_id");
