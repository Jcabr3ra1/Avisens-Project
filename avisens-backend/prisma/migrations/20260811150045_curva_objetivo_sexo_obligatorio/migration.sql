/*
  Warnings:

  - Made the column `sexo` on table `curvas_objetivo` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "curvas_objetivo" ALTER COLUMN "sexo" SET NOT NULL;
