-- Preserva ids, contraseñas, roles, sesiones e historial. No deriva usuarios
-- del correo: dos direcciones con igual parte local no deben colisionar.
ALTER TABLE "usuarios" ADD COLUMN "username" TEXT;
UPDATE "usuarios" SET "username" = 'usuario.' || "id"::text;
ALTER TABLE "usuarios" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "usuarios_username_key" ON "usuarios"("username");
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_username_formato_check"
  CHECK ("username" ~ '^[a-z0-9][a-z0-9._-]{2,29}$');
ALTER TABLE "usuarios" ALTER COLUMN "email" DROP NOT NULL;
