-- El plazo que el chatbot promete al radicar (24 o 48 horas) ahora queda
-- guardado: sin él no hay forma de saber qué solicitud está vencida.
ALTER TABLE "solicitudes_pqrs" ADD COLUMN "fecha_limite" TIMESTAMP(3);

UPDATE "solicitudes_pqrs"
SET "fecha_limite" = "fecha_creacion" + CASE "categoria"
  WHEN 'Reclamo' THEN INTERVAL '24 hours'
  ELSE INTERVAL '48 hours'
END
WHERE "categoria" NOT IN ('Sugerencia', 'Felicitación');
