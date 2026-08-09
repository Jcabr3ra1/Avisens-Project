/*
  Warnings:

  - You are about to drop the column `cantadidad_aves_pesadas` on the `pesajes` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "pesajes" DROP COLUMN "cantadidad_aves_pesadas",
ADD COLUMN     "cantidad_aves_pesadas" INTEGER;
