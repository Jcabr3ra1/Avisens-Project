-- Versiones de firmware que los controladores descargan por Wi-Fi.
CREATE TABLE "firmware_versiones" (
    "id" SERIAL NOT NULL,
    "version" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "tamano" INTEGER NOT NULL,
    "binario" BYTEA NOT NULL,
    "notas" TEXT,
    "vigente" BOOLEAN NOT NULL DEFAULT false,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "firmware_versiones_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "firmware_versiones_version_key" ON "firmware_versiones"("version");

