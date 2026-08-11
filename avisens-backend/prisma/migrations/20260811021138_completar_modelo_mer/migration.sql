-- AlterTable
ALTER TABLE "sensores" ADD COLUMN     "zona_id" INTEGER;

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "foto_url" TEXT,
ADD COLUMN     "huella_voz_url" TEXT,
ADD COLUMN     "pin_voz_hash" TEXT;

-- CreateTable
CREATE TABLE "recuperaciones_password" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expira_en" TIMESTAMP(3) NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recuperaciones_password_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios_galpones" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "galpon_id" INTEGER NOT NULL,
    "rol_asignacion" TEXT,
    "fecha_asignacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "usuarios_galpones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matriz_calificacion" (
    "id" SERIAL NOT NULL,
    "bloque" TEXT NOT NULL,
    "codigo_pregunta" TEXT NOT NULL,
    "opcion_respuesta" TEXT NOT NULL,
    "puntaje" INTEGER NOT NULL,
    "descripcion" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matriz_calificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prospectos" (
    "id" SERIAL NOT NULL,
    "sesion_id" TEXT NOT NULL,
    "nombre" TEXT,
    "municipio" TEXT,
    "rol_prospecto" TEXT,
    "tipo_produccion" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "canal_origen" TEXT,
    "contacto_decisor" TEXT,
    "fecha_callback" TIMESTAMP(3),
    "estado" TEXT NOT NULL DEFAULT 'nuevo',
    "asesor_asignado_id" INTEGER,
    "ip_origen" TEXT,
    "user_agent" TEXT,
    "consentimiento_habeas_data" BOOLEAN NOT NULL DEFAULT false,
    "fecha_inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_finalizacion" TIMESTAMP(3),

    CONSTRAINT "prospectos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "respuestas_chatbot" (
    "id" SERIAL NOT NULL,
    "prospecto_id" INTEGER NOT NULL,
    "matriz_id" INTEGER,
    "bloque" TEXT,
    "codigo_pregunta" TEXT,
    "pregunta_texto" TEXT,
    "respuesta_texto" TEXT,
    "puntaje_obtenido" INTEGER,
    "fecha_respuesta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "respuestas_chatbot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotizaciones" (
    "id" SERIAL NOT NULL,
    "prospecto_id" INTEGER NOT NULL,
    "codigo" TEXT,
    "plan_recomendado" TEXT,
    "numero_galpones" INTEGER,
    "numero_aves" INTEGER,
    "valor_total_cop" DOUBLE PRECISION,
    "url_pdf" TEXT,
    "canal_envio" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'generada',
    "fecha_generacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_envio" TIMESTAMP(3),

    CONSTRAINT "cotizaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotizaciones_sensores" (
    "id" SERIAL NOT NULL,
    "cotizacion_id" INTEGER NOT NULL,
    "tipo_sensor" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,

    CONSTRAINT "cotizaciones_sensores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interacciones_chatbot" (
    "id" SERIAL NOT NULL,
    "prospecto_id" INTEGER NOT NULL,
    "tipo" TEXT,
    "mensaje" TEXT,
    "intent_detectado" TEXT,
    "confianza_nlu" DOUBLE PRECISION,
    "fecha_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interacciones_chatbot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comandos_voz" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "galpon_id" INTEGER NOT NULL,
    "tipo_comando" TEXT,
    "comando_texto" TEXT,
    "accion_ejecutada" TEXT,
    "confianza_nlu" DOUBLE PRECISION,
    "requiere_clarificacion" BOOLEAN NOT NULL DEFAULT false,
    "modo_conexion" TEXT,
    "sincronizado" BOOLEAN NOT NULL DEFAULT true,
    "fecha_ejecucion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comandos_voz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curvas_objetivo" (
    "id" SERIAL NOT NULL,
    "sexo" TEXT,
    "dia" INTEGER NOT NULL,
    "peso_esperado_g" DOUBLE PRECISION,
    "consumo_diario_g" DOUBLE PRECISION,
    "consumo_acumulado_g" DOUBLE PRECISION,
    "fcr_objetivo" DOUBLE PRECISION,
    "etapa_alimentacion" TEXT,
    "temperatura_min" DOUBLE PRECISION,
    "temperatura_max" DOUBLE PRECISION,

    CONSTRAINT "curvas_objetivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accionamientos_equipos" (
    "id" SERIAL NOT NULL,
    "equipo_id" INTEGER NOT NULL,
    "alerta_id" INTEGER,
    "origen" TEXT,
    "estado" TEXT,
    "valor_disparo" DOUBLE PRECISION,
    "usuario_id" INTEGER,
    "fecha_inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_fin" TIMESTAMP(3),

    CONSTRAINT "accionamientos_equipos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "politicas_alerta" (
    "id" SERIAL NOT NULL,
    "granja_id" INTEGER NOT NULL,
    "criticidad" TEXT NOT NULL,
    "nivel_escalamiento" INTEGER,
    "canal" TEXT,
    "tiempo_max_respuesta_seg" INTEGER,
    "verificado" BOOLEAN NOT NULL DEFAULT false,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "politicas_alerta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas" (
    "id" SERIAL NOT NULL,
    "galpon_id" INTEGER NOT NULL,
    "lote_id" INTEGER,
    "sensor_id" INTEGER,
    "tipo" TEXT NOT NULL,
    "criticidad" TEXT NOT NULL,
    "valor_detectado" DOUBLE PRECISION,
    "valor_umbral" DOUBLE PRECISION,
    "mensaje" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'abierta',
    "responsable_id" INTEGER,
    "escalado_a_id" INTEGER,
    "accion_correctiva" TEXT,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_aceptacion" TIMESTAMP(3),
    "fecha_cierre" TIMESTAMP(3),

    CONSTRAINT "alertas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas_canales" (
    "id" SERIAL NOT NULL,
    "alerta_id" INTEGER NOT NULL,
    "canal" TEXT,
    "estado_envio" TEXT,
    "fecha_envio" TIMESTAMP(3),

    CONSTRAINT "alertas_canales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidencias_alertas" (
    "id" SERIAL NOT NULL,
    "alerta_id" INTEGER NOT NULL,
    "tipo_evidencia" TEXT,
    "archivo_url" TEXT,
    "comentario" TEXT,
    "usuario_id" INTEGER,
    "tamano_bytes" INTEGER,
    "fecha_subida" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidencias_alertas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordenes_compra" (
    "id" SERIAL NOT NULL,
    "proveedor_id" INTEGER NOT NULL,
    "lote_id" INTEGER,
    "codigo" TEXT NOT NULL,
    "fecha_pedido" DATE,
    "fecha_entrega_estimada" DATE,
    "fecha_entrega_real" DATE,
    "valor_total_cop" DOUBLE PRECISION,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "calificacion_cumplimiento" DOUBLE PRECISION,
    "calificacion_calidad" DOUBLE PRECISION,
    "calificacion_tiempo" DOUBLE PRECISION,
    "usuario_id" INTEGER NOT NULL,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ordenes_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias_financieras" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "categorias_financieras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_financieros" (
    "id" SERIAL NOT NULL,
    "lote_id" INTEGER,
    "categoria_id" INTEGER NOT NULL,
    "proveedor_id" INTEGER,
    "tipo" TEXT,
    "valor_cop" DOUBLE PRECISION NOT NULL,
    "fecha" DATE NOT NULL,
    "descripcion" TEXT,
    "numero_factura" TEXT,
    "comprobante_url" TEXT,
    "metodo_pago" TEXT,
    "usuario_id" INTEGER NOT NULL,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_financieros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_inventario" (
    "id" SERIAL NOT NULL,
    "insumo_id" INTEGER NOT NULL,
    "lote_id" INTEGER,
    "tipo_movimiento" TEXT,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "unidad_medida" TEXT,
    "motivo" TEXT,
    "comprobante_url" TEXT,
    "stock_resultante" DOUBLE PRECISION,
    "usuario_id" INTEGER NOT NULL,
    "fecha_movimiento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zonas_galpon" (
    "id" SERIAL NOT NULL,
    "galpon_id" INTEGER NOT NULL,
    "codigo" TEXT,
    "nombre" TEXT NOT NULL,
    "tipo_zona" TEXT,
    "coordenada_x_inicio" DOUBLE PRECISION,
    "coordenada_y_inicio" DOUBLE PRECISION,
    "coordenada_x_fin" DOUBLE PRECISION,
    "coordenada_y_fin" DOUBLE PRECISION,
    "color_visualizacion" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "zonas_galpon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipos" (
    "id" SERIAL NOT NULL,
    "galpon_id" INTEGER NOT NULL,
    "zona_id" INTEGER,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT,
    "es_actuador" BOOLEAN NOT NULL DEFAULT false,
    "modelo" TEXT,
    "fabricante" TEXT,
    "serial" TEXT,
    "fecha_compra" DATE,
    "fecha_instalacion" DATE,
    "vida_util_horas" INTEGER,
    "horas_operacion" INTEGER DEFAULT 0,
    "estado_actual" TEXT NOT NULL DEFAULT 'operativo',
    "modo_operacion" TEXT,
    "coordenada_x" DOUBLE PRECISION,
    "coordenada_y" DOUBLE PRECISION,
    "costo_cop" DOUBLE PRECISION,

    CONSTRAINT "equipos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mantenimientos" (
    "id" SERIAL NOT NULL,
    "equipo_id" INTEGER NOT NULL,
    "tipo" TEXT,
    "fecha_programada" DATE,
    "fecha_ejecucion" DATE,
    "duracion_horas" DOUBLE PRECISION,
    "tecnico_responsable" TEXT,
    "tecnico_id" INTEGER,
    "descripcion" TEXT,
    "costo_cop" DOUBLE PRECISION,
    "causa_falla" TEXT,
    "tiempo_inactivo_horas" DOUBLE PRECISION,
    "estado" TEXT NOT NULL DEFAULT 'programado',
    "evidencia_url" TEXT,
    "observaciones" TEXT,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mantenimientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mantenimientos_repuestos" (
    "id" SERIAL NOT NULL,
    "mantenimiento_id" INTEGER NOT NULL,
    "insumo_id" INTEGER NOT NULL,
    "descripcion" TEXT,
    "cantidad" DOUBLE PRECISION,
    "costo_cop" DOUBLE PRECISION,

    CONSTRAINT "mantenimientos_repuestos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recuperaciones_password_usuario_id_idx" ON "recuperaciones_password"("usuario_id");

-- CreateIndex
CREATE INDEX "usuarios_galpones_usuario_id_idx" ON "usuarios_galpones"("usuario_id");

-- CreateIndex
CREATE INDEX "usuarios_galpones_galpon_id_idx" ON "usuarios_galpones"("galpon_id");

-- CreateIndex
CREATE UNIQUE INDEX "prospectos_sesion_id_key" ON "prospectos"("sesion_id");

-- CreateIndex
CREATE INDEX "prospectos_asesor_asignado_id_idx" ON "prospectos"("asesor_asignado_id");

-- CreateIndex
CREATE INDEX "respuestas_chatbot_prospecto_id_idx" ON "respuestas_chatbot"("prospecto_id");

-- CreateIndex
CREATE INDEX "cotizaciones_prospecto_id_idx" ON "cotizaciones"("prospecto_id");

-- CreateIndex
CREATE INDEX "cotizaciones_sensores_cotizacion_id_idx" ON "cotizaciones_sensores"("cotizacion_id");

-- CreateIndex
CREATE INDEX "interacciones_chatbot_prospecto_id_idx" ON "interacciones_chatbot"("prospecto_id");

-- CreateIndex
CREATE INDEX "comandos_voz_usuario_id_idx" ON "comandos_voz"("usuario_id");

-- CreateIndex
CREATE INDEX "comandos_voz_galpon_id_idx" ON "comandos_voz"("galpon_id");

-- CreateIndex
CREATE INDEX "accionamientos_equipos_equipo_id_idx" ON "accionamientos_equipos"("equipo_id");

-- CreateIndex
CREATE INDEX "politicas_alerta_granja_id_idx" ON "politicas_alerta"("granja_id");

-- CreateIndex
CREATE INDEX "alertas_galpon_id_idx" ON "alertas"("galpon_id");

-- CreateIndex
CREATE INDEX "alertas_lote_id_idx" ON "alertas"("lote_id");

-- CreateIndex
CREATE INDEX "alertas_canales_alerta_id_idx" ON "alertas_canales"("alerta_id");

-- CreateIndex
CREATE INDEX "evidencias_alertas_alerta_id_idx" ON "evidencias_alertas"("alerta_id");

-- CreateIndex
CREATE UNIQUE INDEX "ordenes_compra_codigo_key" ON "ordenes_compra"("codigo");

-- CreateIndex
CREATE INDEX "ordenes_compra_proveedor_id_idx" ON "ordenes_compra"("proveedor_id");

-- CreateIndex
CREATE INDEX "movimientos_financieros_lote_id_idx" ON "movimientos_financieros"("lote_id");

-- CreateIndex
CREATE INDEX "movimientos_financieros_categoria_id_idx" ON "movimientos_financieros"("categoria_id");

-- CreateIndex
CREATE INDEX "movimientos_inventario_insumo_id_idx" ON "movimientos_inventario"("insumo_id");

-- CreateIndex
CREATE INDEX "movimientos_inventario_lote_id_idx" ON "movimientos_inventario"("lote_id");

-- CreateIndex
CREATE INDEX "zonas_galpon_galpon_id_idx" ON "zonas_galpon"("galpon_id");

-- CreateIndex
CREATE UNIQUE INDEX "equipos_codigo_key" ON "equipos"("codigo");

-- CreateIndex
CREATE INDEX "equipos_galpon_id_idx" ON "equipos"("galpon_id");

-- CreateIndex
CREATE INDEX "mantenimientos_equipo_id_idx" ON "mantenimientos"("equipo_id");

-- CreateIndex
CREATE INDEX "mantenimientos_repuestos_mantenimiento_id_idx" ON "mantenimientos_repuestos"("mantenimiento_id");

-- AddForeignKey
ALTER TABLE "sensores" ADD CONSTRAINT "sensores_zona_id_fkey" FOREIGN KEY ("zona_id") REFERENCES "zonas_galpon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recuperaciones_password" ADD CONSTRAINT "recuperaciones_password_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_galpones" ADD CONSTRAINT "usuarios_galpones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_galpones" ADD CONSTRAINT "usuarios_galpones_galpon_id_fkey" FOREIGN KEY ("galpon_id") REFERENCES "galpones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prospectos" ADD CONSTRAINT "prospectos_asesor_asignado_id_fkey" FOREIGN KEY ("asesor_asignado_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuestas_chatbot" ADD CONSTRAINT "respuestas_chatbot_prospecto_id_fkey" FOREIGN KEY ("prospecto_id") REFERENCES "prospectos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuestas_chatbot" ADD CONSTRAINT "respuestas_chatbot_matriz_id_fkey" FOREIGN KEY ("matriz_id") REFERENCES "matriz_calificacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_prospecto_id_fkey" FOREIGN KEY ("prospecto_id") REFERENCES "prospectos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizaciones_sensores" ADD CONSTRAINT "cotizaciones_sensores_cotizacion_id_fkey" FOREIGN KEY ("cotizacion_id") REFERENCES "cotizaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interacciones_chatbot" ADD CONSTRAINT "interacciones_chatbot_prospecto_id_fkey" FOREIGN KEY ("prospecto_id") REFERENCES "prospectos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comandos_voz" ADD CONSTRAINT "comandos_voz_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comandos_voz" ADD CONSTRAINT "comandos_voz_galpon_id_fkey" FOREIGN KEY ("galpon_id") REFERENCES "galpones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accionamientos_equipos" ADD CONSTRAINT "accionamientos_equipos_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accionamientos_equipos" ADD CONSTRAINT "accionamientos_equipos_alerta_id_fkey" FOREIGN KEY ("alerta_id") REFERENCES "alertas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accionamientos_equipos" ADD CONSTRAINT "accionamientos_equipos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "politicas_alerta" ADD CONSTRAINT "politicas_alerta_granja_id_fkey" FOREIGN KEY ("granja_id") REFERENCES "granjas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_galpon_id_fkey" FOREIGN KEY ("galpon_id") REFERENCES "galpones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_sensor_id_fkey" FOREIGN KEY ("sensor_id") REFERENCES "sensores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_responsable_id_fkey" FOREIGN KEY ("responsable_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_escalado_a_id_fkey" FOREIGN KEY ("escalado_a_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_canales" ADD CONSTRAINT "alertas_canales_alerta_id_fkey" FOREIGN KEY ("alerta_id") REFERENCES "alertas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidencias_alertas" ADD CONSTRAINT "evidencias_alertas_alerta_id_fkey" FOREIGN KEY ("alerta_id") REFERENCES "alertas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidencias_alertas" ADD CONSTRAINT "evidencias_alertas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_compra" ADD CONSTRAINT "ordenes_compra_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_compra" ADD CONSTRAINT "ordenes_compra_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_compra" ADD CONSTRAINT "ordenes_compra_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_financieros" ADD CONSTRAINT "movimientos_financieros_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_financieros" ADD CONSTRAINT "movimientos_financieros_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias_financieras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_financieros" ADD CONSTRAINT "movimientos_financieros_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_financieros" ADD CONSTRAINT "movimientos_financieros_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_insumo_id_fkey" FOREIGN KEY ("insumo_id") REFERENCES "inventario_insumos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zonas_galpon" ADD CONSTRAINT "zonas_galpon_galpon_id_fkey" FOREIGN KEY ("galpon_id") REFERENCES "galpones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipos" ADD CONSTRAINT "equipos_galpon_id_fkey" FOREIGN KEY ("galpon_id") REFERENCES "galpones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipos" ADD CONSTRAINT "equipos_zona_id_fkey" FOREIGN KEY ("zona_id") REFERENCES "zonas_galpon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mantenimientos" ADD CONSTRAINT "mantenimientos_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mantenimientos" ADD CONSTRAINT "mantenimientos_tecnico_id_fkey" FOREIGN KEY ("tecnico_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mantenimientos_repuestos" ADD CONSTRAINT "mantenimientos_repuestos_mantenimiento_id_fkey" FOREIGN KEY ("mantenimiento_id") REFERENCES "mantenimientos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mantenimientos_repuestos" ADD CONSTRAINT "mantenimientos_repuestos_insumo_id_fkey" FOREIGN KEY ("insumo_id") REFERENCES "inventario_insumos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
