-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "organizacion_id" INTEGER;

-- CreateTable
CREATE TABLE "organizaciones" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "nit" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indicadores_lote" (
    "id" SERIAL NOT NULL,
    "lote_id" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "dia_vida" INTEGER,
    "peso_promedio_g" DOUBLE PRECISION,
    "fcr" DOUBLE PRECISION,
    "epef" DOUBLE PRECISION,
    "uniformidad_pct" DOUBLE PRECISION,
    "mortalidad_acumulada_pct" DOUBLE PRECISION,
    "consumo_acumulado_g" DOUBLE PRECISION,
    "calculado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "indicadores_lote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modelos_ml" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT,
    "objetivo" TEXT,
    "version" TEXT,
    "framework" TEXT,
    "metricas" JSONB,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_entrenamiento" TIMESTAMP(3),
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "modelos_ml_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "predicciones" (
    "id" SERIAL NOT NULL,
    "lote_id" INTEGER,
    "modelo_id" INTEGER,
    "tipo" TEXT NOT NULL,
    "horizonte_dias" INTEGER,
    "valor_predicho" DOUBLE PRECISION,
    "unidad" TEXT,
    "confianza" DOUBLE PRECISION,
    "fecha_objetivo" DATE,
    "datos_entrada" JSONB,
    "fecha_generacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "predicciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recomendaciones" (
    "id" SERIAL NOT NULL,
    "lote_id" INTEGER,
    "galpon_id" INTEGER,
    "prediccion_id" INTEGER,
    "tipo" TEXT,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "accion_sugerida" TEXT,
    "prioridad" TEXT NOT NULL DEFAULT 'media',
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "usuario_id" INTEGER,
    "fecha_generacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_resolucion" TIMESTAMP(3),

    CONSTRAINT "recomendaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversaciones_ia" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "titulo" TEXT,
    "contexto" JSONB,
    "fecha_inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_ultimo_mensaje" TIMESTAMP(3),

    CONSTRAINT "conversaciones_ia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensajes_ia" (
    "id" SERIAL NOT NULL,
    "conversacion_id" INTEGER NOT NULL,
    "rol" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "tokens" INTEGER,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensajes_ia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analisis_bioacustico" (
    "id" SERIAL NOT NULL,
    "galpon_id" INTEGER NOT NULL,
    "lote_id" INTEGER,
    "modelo_id" INTEGER,
    "fecha_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "indicador" TEXT,
    "valor" DOUBLE PRECISION,
    "audio_url" TEXT,
    "interpretacion" TEXT,

    CONSTRAINT "analisis_bioacustico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analisis_vision" (
    "id" SERIAL NOT NULL,
    "galpon_id" INTEGER NOT NULL,
    "lote_id" INTEGER,
    "modelo_id" INTEGER,
    "fecha_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo_analisis" TEXT,
    "resultado" JSONB,
    "imagen_url" TEXT,

    CONSTRAINT "analisis_vision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clima" (
    "id" SERIAL NOT NULL,
    "granja_id" INTEGER NOT NULL,
    "fecha_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "temperatura" DOUBLE PRECISION,
    "humedad" DOUBLE PRECISION,
    "precipitacion" DOUBLE PRECISION,
    "viento_kmh" DOUBLE PRECISION,
    "fuente" TEXT,

    CONSTRAINT "clima_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizaciones_nit_key" ON "organizaciones"("nit");

-- CreateIndex
CREATE INDEX "indicadores_lote_lote_id_idx" ON "indicadores_lote"("lote_id");

-- CreateIndex
CREATE INDEX "predicciones_lote_id_idx" ON "predicciones"("lote_id");

-- CreateIndex
CREATE INDEX "recomendaciones_lote_id_idx" ON "recomendaciones"("lote_id");

-- CreateIndex
CREATE INDEX "conversaciones_ia_usuario_id_idx" ON "conversaciones_ia"("usuario_id");

-- CreateIndex
CREATE INDEX "mensajes_ia_conversacion_id_idx" ON "mensajes_ia"("conversacion_id");

-- CreateIndex
CREATE INDEX "analisis_bioacustico_galpon_id_idx" ON "analisis_bioacustico"("galpon_id");

-- CreateIndex
CREATE INDEX "analisis_vision_galpon_id_idx" ON "analisis_vision"("galpon_id");

-- CreateIndex
CREATE INDEX "clima_granja_id_idx" ON "clima"("granja_id");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicadores_lote" ADD CONSTRAINT "indicadores_lote_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predicciones" ADD CONSTRAINT "predicciones_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predicciones" ADD CONSTRAINT "predicciones_modelo_id_fkey" FOREIGN KEY ("modelo_id") REFERENCES "modelos_ml"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recomendaciones" ADD CONSTRAINT "recomendaciones_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recomendaciones" ADD CONSTRAINT "recomendaciones_galpon_id_fkey" FOREIGN KEY ("galpon_id") REFERENCES "galpones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recomendaciones" ADD CONSTRAINT "recomendaciones_prediccion_id_fkey" FOREIGN KEY ("prediccion_id") REFERENCES "predicciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recomendaciones" ADD CONSTRAINT "recomendaciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversaciones_ia" ADD CONSTRAINT "conversaciones_ia_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes_ia" ADD CONSTRAINT "mensajes_ia_conversacion_id_fkey" FOREIGN KEY ("conversacion_id") REFERENCES "conversaciones_ia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analisis_bioacustico" ADD CONSTRAINT "analisis_bioacustico_galpon_id_fkey" FOREIGN KEY ("galpon_id") REFERENCES "galpones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analisis_bioacustico" ADD CONSTRAINT "analisis_bioacustico_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analisis_bioacustico" ADD CONSTRAINT "analisis_bioacustico_modelo_id_fkey" FOREIGN KEY ("modelo_id") REFERENCES "modelos_ml"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analisis_vision" ADD CONSTRAINT "analisis_vision_galpon_id_fkey" FOREIGN KEY ("galpon_id") REFERENCES "galpones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analisis_vision" ADD CONSTRAINT "analisis_vision_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analisis_vision" ADD CONSTRAINT "analisis_vision_modelo_id_fkey" FOREIGN KEY ("modelo_id") REFERENCES "modelos_ml"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clima" ADD CONSTRAINT "clima_granja_id_fkey" FOREIGN KEY ("granja_id") REFERENCES "granjas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
