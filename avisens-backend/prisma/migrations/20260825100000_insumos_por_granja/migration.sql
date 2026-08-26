-- El inventario deja de ser global y pasa a pertenecer a una granja.
--
-- Sin esta columna el alcance por rol es imposible: el controller deja entrar
-- a PROPIETARIO al listado y no hay nada por lo que filtrar, asi que cualquier
-- propietario ve y consume el stock de todas las granjas.
--
-- La columna es NOT NULL a proposito: si admitiera nulo, un insumo sin granja
-- se le escaparia a cualquier filtro y habria que acordarse de ese caso en
-- cada consulta. La tabla esta vacia, asi que no hace falta relleno previo.

-- AlterTable
ALTER TABLE "inventario_insumos" ADD COLUMN     "granja_id" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "inventario_insumos_granja_id_idx" ON "inventario_insumos"("granja_id");

-- AddForeignKey
ALTER TABLE "inventario_insumos" ADD CONSTRAINT "inventario_insumos_granja_id_fkey" FOREIGN KEY ("granja_id") REFERENCES "granjas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
