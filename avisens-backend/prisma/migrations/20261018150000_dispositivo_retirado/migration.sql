-- Un controlador que ya envió datos no se borra: se retira y pierde su token.
ALTER TABLE "dispositivos" ADD COLUMN "retirado_en" TIMESTAMP(3);
