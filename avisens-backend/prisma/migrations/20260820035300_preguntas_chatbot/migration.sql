-- AlterTable
ALTER TABLE "prospectos" ADD COLUMN     "pregunta_actual" TEXT;

-- AlterTable
ALTER TABLE "respuestas_chatbot" ADD COLUMN     "pregunta_id" INTEGER;

-- CreateTable
CREATE TABLE "preguntas_chatbot" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "bloque" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "opciones" JSONB,
    "campo_prospecto" TEXT,
    "puntua" BOOLEAN NOT NULL DEFAULT false,
    "obligatoria" BOOLEAN NOT NULL DEFAULT true,
    "siguiente" TEXT,
    "saltos" JSONB,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "preguntas_chatbot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "preguntas_chatbot_codigo_key" ON "preguntas_chatbot"("codigo");

-- CreateIndex
CREATE INDEX "preguntas_chatbot_bloque_orden_idx" ON "preguntas_chatbot"("bloque", "orden");

-- AddForeignKey
ALTER TABLE "respuestas_chatbot" ADD CONSTRAINT "respuestas_chatbot_pregunta_id_fkey" FOREIGN KEY ("pregunta_id") REFERENCES "preguntas_chatbot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
