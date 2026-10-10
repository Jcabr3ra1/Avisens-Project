-- DropForeignKey
ALTER TABLE "consumos_diarios" DROP CONSTRAINT "consumos_diarios_tipo_alimento_id_fkey";

-- AddForeignKey
ALTER TABLE "consumos_diarios" ADD CONSTRAINT "consumos_diarios_tipo_alimento_id_fkey" FOREIGN KEY ("tipo_alimento_id") REFERENCES "tipos_alimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
