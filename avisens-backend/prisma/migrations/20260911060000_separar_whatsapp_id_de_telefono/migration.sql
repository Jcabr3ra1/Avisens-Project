-- `prospectos.telefono` guardaba dos cosas distintas: el numero de la persona
-- cuando lo escribia, y la direccion por la que el bot le responde en WhatsApp.
-- Meta manda esa direccion como una identidad (`CO.1639...`) cuando la persona
-- escribe desde una cuenta con nombre de usuario, asi que el prospecto quedaba
-- sin numero al que llamar y el asesor sin a quien telefonear.
--
-- Se separan: `telefono` pasa a ser siempre un numero marcable y `whatsapp_id`
-- la direccion del canal. Sin esto, preguntarle el telefono y guardarlo encima
-- le quitaria al bot por donde contestar, porque `telefono` es ademas la llave
-- con la que se busca la conversacion abierta al llegar un mensaje.

ALTER TABLE "prospectos" ADD COLUMN "whatsapp_id" TEXT;

-- La direccion de quien entro por WhatsApp se conserva, venga como venga.
UPDATE "prospectos"
SET "whatsapp_id" = "telefono"
WHERE "canal_origen" = 'whatsapp' AND "telefono" IS NOT NULL;

-- Y `telefono` se queda solo con lo que de verdad es un numero.
UPDATE "prospectos"
SET "telefono" = NULL
WHERE "telefono" ~ '^[A-Z]{2}\.[0-9]+$';

-- Las conversaciones entrantes se buscan por esta columna.
CREATE INDEX "prospectos_whatsapp_id_idx" ON "prospectos"("whatsapp_id");
