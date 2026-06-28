DROP TABLE IF EXISTS "sesiones" CASCADE;
DROP TABLE IF EXISTS "seguridad_cuenta" CASCADE;
DROP TABLE IF EXISTS "roles_permisos" CASCADE;
DROP TABLE IF EXISTS "usuarios" CASCADE;
DROP TABLE IF EXISTS "permisos" CASCADE;
DROP TABLE IF EXISTS "roles" CASCADE;

CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "requiere_mfa" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "permisos" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "permisos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "roles_permisos" (
    "id" SERIAL NOT NULL,
    "rol_id" INTEGER NOT NULL,
    "permiso_id" INTEGER NOT NULL,
    CONSTRAINT "roles_permisos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "rol_id" INTEGER NOT NULL,
    "nombre_completo" TEXT NOT NULL,
    "cedula" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "telefono" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "seguridad_cuenta" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "intentos_fallidos" INTEGER NOT NULL DEFAULT 0,
    "bloqueado_hasta" TIMESTAMP(3),
    "fecha_ultimo_login" TIMESTAMP(3),
    "fecha_ultimo_cambio_password" TIMESTAMP(3),
    CONSTRAINT "seguridad_cuenta_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sesiones" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "ip_origen" TEXT,
    "user_agent" TEXT,
    "expira_en" TIMESTAMP(3) NOT NULL,
    "revocada" BOOLEAN NOT NULL DEFAULT false,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sesiones_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "roles_nombre_key" ON "roles"("nombre");
CREATE UNIQUE INDEX "permisos_codigo_key" ON "permisos"("codigo");
CREATE UNIQUE INDEX "roles_permisos_rol_id_permiso_id_key" ON "roles_permisos"("rol_id", "permiso_id");
CREATE UNIQUE INDEX "usuarios_cedula_key" ON "usuarios"("cedula");
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");
CREATE UNIQUE INDEX "seguridad_cuenta_usuario_id_key" ON "seguridad_cuenta"("usuario_id");

ALTER TABLE "roles_permisos" ADD CONSTRAINT "roles_permisos_rol_id_fkey"
    FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "roles_permisos" ADD CONSTRAINT "roles_permisos_permiso_id_fkey"
    FOREIGN KEY ("permiso_id") REFERENCES "permisos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_rol_id_fkey"
    FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "seguridad_cuenta" ADD CONSTRAINT "seguridad_cuenta_usuario_id_fkey"
    FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_usuario_id_fkey"
    FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "roles" ("nombre", "descripcion", "requiere_mfa") VALUES
    ('Administrador', 'Control total del sistema', false),
    ('Propietario',   'Gestiona sus granjas',      false),
    ('Operario',      'Registra datos de su galpón', false);

INSERT INTO "usuarios" ("rol_id", "nombre_completo", "cedula", "email", "password_hash")
VALUES (
    (SELECT "id" FROM "roles" WHERE "nombre" = 'Administrador'),
    'Administrador Avisens',
    '0000000000',
    'admin@avisens.com',
    '$2b$12$PAVxbo4LH9jxr0WJAzlPZuud/RWKn8kf5FTmgNWYDdRWMdJGjkloe'
);

-- Cuentas de prueba por rol (contraseñas: Dueno1234 / Operario1234)
INSERT INTO "usuarios" ("rol_id", "nombre_completo", "cedula", "email", "password_hash")
VALUES
(
    (SELECT "id" FROM "roles" WHERE "nombre" = 'Propietario'),
    'Don Carlos (Dueño)',
    '1000000002',
    'dueno@avisens.com',
    '$2b$12$6bJhLvWYlOjERAwz/6DUKO9iy4nZjvj57GDkZ4cHIzKCTs1dOVvFO'
),
(
    (SELECT "id" FROM "roles" WHERE "nombre" = 'Operario'),
    'Edison (Operario)',
    '1000000003',
    'operario@avisens.com',
    '$2b$12$oN1r4jDu/Djg9bz6uNHJX.iMEzMB4iuqlmsNWZdK4da1jMK5VVN.m'
);
