-- AlterTable
ALTER TABLE "dispositivos" ADD COLUMN "token_ingesta" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "dispositivos_token_ingesta_key" ON "dispositivos"("token_ingesta");
