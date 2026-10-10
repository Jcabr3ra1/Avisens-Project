-- CreateEnum
CREATE TYPE "SexoCurva" AS ENUM ('macho', 'hembra', 'mixto');

-- CreateEnum
CREATE TYPE "EstadoCurvaVersion" AS ENUM ('borrador', 'publicada');

-- CreateTable
CREATE TABLE "lineas_geneticas" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lineas_geneticas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curvas_geneticas_version" (
    "id" SERIAL NOT NULL,
    "linea_genetica_id" INTEGER NOT NULL,
    "sexo" "SexoCurva" NOT NULL,
    "version" INTEGER NOT NULL,
    "estado" "EstadoCurvaVersion" NOT NULL DEFAULT 'borrador',
    "vigente" BOOLEAN NOT NULL DEFAULT false,
    "fuente" TEXT NOT NULL,
    "fecha_publicacion" TIMESTAMP(3),
    "publicada_por_id" INTEGER,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curvas_geneticas_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "puntos_curva_genetica" (
    "id" SERIAL NOT NULL,
    "curva_version_id" INTEGER NOT NULL,
    "dia" INTEGER NOT NULL,
    "peso_esperado_g" DECIMAL(10,2) NOT NULL,
    "consumo_diario_g" DECIMAL(10,2),
    "consumo_acumulado_g" DECIMAL(12,2),
    "fcr_objetivo" DECIMAL(6,3),

    CONSTRAINT "puntos_curva_genetica_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lineas_geneticas_codigo_key" ON "lineas_geneticas"("codigo");

-- CreateIndex
CREATE INDEX "curvas_geneticas_version_linea_genetica_id_sexo_idx" ON "curvas_geneticas_version"("linea_genetica_id", "sexo");

-- CreateIndex
CREATE UNIQUE INDEX "curvas_geneticas_version_linea_genetica_id_sexo_version_key" ON "curvas_geneticas_version"("linea_genetica_id", "sexo", "version");

-- CreateIndex
CREATE UNIQUE INDEX "puntos_curva_genetica_curva_version_id_dia_key" ON "puntos_curva_genetica"("curva_version_id", "dia");

-- AddForeignKey
ALTER TABLE "curvas_geneticas_version" ADD CONSTRAINT "curvas_geneticas_version_linea_genetica_id_fkey" FOREIGN KEY ("linea_genetica_id") REFERENCES "lineas_geneticas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curvas_geneticas_version" ADD CONSTRAINT "curvas_geneticas_version_publicada_por_id_fkey" FOREIGN KEY ("publicada_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puntos_curva_genetica" ADD CONSTRAINT "puntos_curva_genetica_curva_version_id_fkey" FOREIGN KEY ("curva_version_id") REFERENCES "curvas_geneticas_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Garantiza una sola CurvaGeneticaVersion vigente por (linea_genetica, sexo).
-- Indice unico parcial via SQL manual -- partialIndexes sigue en preview en
-- Prisma 7.8 y se decidio no activarla solo por este indice (misma decision
-- que en umbrales_un_vigente_por_semana y alertas_una_automatica_activa_por_sensor).
CREATE UNIQUE INDEX "curvas_geneticas_una_vigente_por_linea_sexo"
  ON "curvas_geneticas_version" ("linea_genetica_id", "sexo")
  WHERE "vigente";

-- codigo canonico: minusculas, solo letras/digitos/guion bajo.
ALTER TABLE "lineas_geneticas"
  ADD CONSTRAINT "lineas_geneticas_codigo_canonico"
  CHECK ("codigo" = lower("codigo") AND "codigo" ~ '^[a-z0-9_]+$');

-- version siempre positiva.
ALTER TABLE "curvas_geneticas_version"
  ADD CONSTRAINT "curvas_geneticas_version_version_positiva"
  CHECK ("version" >= 1);

-- una curva vigente siempre debe estar publicada. Si esta CHECK no existiera,
-- una escritura directa (o un bug futuro en el servicio) podria dejar un
-- borrador marcado vigente sin que nada lo impida.
ALTER TABLE "curvas_geneticas_version"
  ADD CONSTRAINT "curvas_geneticas_version_vigente_implica_publicada"
  CHECK (NOT "vigente" OR "estado" = 'publicada'::"EstadoCurvaVersion");

-- dia del punto siempre positivo (dia 1 = primer dia de vida).
ALTER TABLE "puntos_curva_genetica"
  ADD CONSTRAINT "puntos_curva_genetica_dia_positivo"
  CHECK ("dia" >= 1);

-- peso esperado siempre positivo: un punto de curva de crecimiento sin peso
-- positivo no sirve para interpolar nada.
ALTER TABLE "puntos_curva_genetica"
  ADD CONSTRAINT "puntos_curva_genetica_peso_positivo"
  CHECK ("peso_esperado_g" > 0);

-- consumo diario y acumulado, cuando existen, no pueden ser negativos.
ALTER TABLE "puntos_curva_genetica"
  ADD CONSTRAINT "puntos_curva_genetica_consumo_diario_no_negativo"
  CHECK ("consumo_diario_g" IS NULL OR "consumo_diario_g" >= 0);

ALTER TABLE "puntos_curva_genetica"
  ADD CONSTRAINT "puntos_curva_genetica_consumo_acumulado_no_negativo"
  CHECK ("consumo_acumulado_g" IS NULL OR "consumo_acumulado_g" >= 0);

-- FCR, cuando existe, siempre positivo.
ALTER TABLE "puntos_curva_genetica"
  ADD CONSTRAINT "puntos_curva_genetica_fcr_positivo"
  CHECK ("fcr_objetivo" IS NULL OR "fcr_objetivo" > 0);
