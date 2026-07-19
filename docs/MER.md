# MER Avisens v1.2 — Normalizado

> Modelo Entidad-Relación de referencia del proyecto. **42 entidades, 65 relaciones FK.**
> Notación de [Eraser](https://eraser.io). Esta es la fuente de verdad del modelo de datos:
> las tablas de la base de datos se construyen a partir de este documento, no al revés.
>
> El backend implementa el modelo **de forma incremental**, módulo por módulo (EP-xx).
> Estado de implementación: EP-03 (Autenticación) ✅ · resto pendiente.

```
title AVISENS v1.2 — Normalizado

// ============================================================
// EP-01 · CHATBOT DE COTIZACIÓN (yellow)
// ============================================================

matriz_calificacion [icon: clipboard, color: yellow] {
  id integer pk
  bloque string
  codigo_pregunta string
  opcion_respuesta string
  puntaje integer
  descripcion string
  activa bool
  fecha_creacion datetime
}

prospectos [icon: user-plus, color: yellow] {
  id integer pk
  sesion_id string unique
  nombre string
  municipio string
  rol_prospecto string
  tipo_produccion string
  telefono string
  email string
  canal_origen string
  contacto_decisor string
  fecha_callback datetime
  estado string
  asesor_asignado_id integer fk
  ip_origen string
  user_agent string
  consentimiento_habeas_data bool
  fecha_inicio datetime
  fecha_finalizacion datetime
}

respuestas_chatbot [icon: message-circle, color: yellow] {
  id integer pk
  prospecto_id integer fk
  matriz_id integer fk
  bloque string
  codigo_pregunta string
  pregunta_texto string
  respuesta_texto string
  puntaje_obtenido integer
  fecha_respuesta datetime
}

cotizaciones [icon: file, color: yellow] {
  id integer pk
  prospecto_id integer fk
  codigo string
  plan_recomendado string
  numero_galpones integer
  numero_aves integer
  valor_total_cop number
  url_pdf string
  canal_envio string
  estado string
  fecha_generacion datetime
  fecha_envio datetime
}

cotizaciones_sensores [icon: thermometer, color: yellow] {
  id integer pk
  cotizacion_id integer fk
  tipo_sensor string
  cantidad integer
}

interacciones_chatbot [icon: message-square, color: yellow] {
  id integer pk
  prospecto_id integer fk
  tipo string
  mensaje string
  intent_detectado string
  confianza_nlu number
  fecha_hora datetime
}


// ============================================================
// EP-03 · AUTENTICACIÓN Y ROLES (cyan)
// ============================================================

roles [icon: shield, color: cyan] {
  id integer pk
  nombre string unique
  descripcion string
  activo bool
  fecha_creacion datetime
}

permisos [icon: key, color: cyan] {
  id integer pk
  codigo string unique
  modulo string
  descripcion string
  activo bool
}

roles_permisos [icon: lock, color: cyan] {
  id integer pk
  rol_id integer fk
  permiso_id integer fk
}

usuarios [icon: user, color: cyan] {
  id integer pk
  rol_id integer fk
  nombre_completo string
  cedula string unique
  email string unique
  password_hash string
  telefono string
  foto_url string
  activo bool
  fecha_creacion datetime
}

seguridad_cuenta [icon: shield-off, color: cyan] {
  id integer pk
  usuario_id integer fk
  intentos_fallidos integer
  bloqueado_hasta datetime
  fecha_ultimo_login datetime
  fecha_ultimo_cambio_password datetime
}

sesiones [icon: log-in, color: cyan] {
  id integer pk
  usuario_id integer fk
  refresh_token_hash string
  ip_origen string
  user_agent string
  expira_en datetime
  revocada bool
  fecha_creacion datetime
}

recuperaciones_password [icon: rotate-ccw, color: cyan] {
  id integer pk
  usuario_id integer fk
  token_hash string
  expira_en datetime
  usado bool
  fecha_creacion datetime
}

usuarios_galpones [icon: link, color: cyan] {
  id integer pk
  usuario_id integer fk
  galpon_id integer fk
  rol_asignacion string
  fecha_asignacion datetime
  activa bool
}

bitacora_auditoria [icon: file-text, color: cyan] {
  id integer pk
  usuario_id integer fk
  accion string
  entidad_afectada string
  registro_id integer
  datos_antes string
  datos_despues string
  ip_origen string
  user_agent string
  fecha_hora datetime
}


// ============================================================
// EP-04 · MONITOREO AMBIENTAL (green)
// ============================================================

granjas [icon: home, color: green] {
  id integer pk
  propietario_id integer fk
  nombre string
  direccion string
  municipio string
  departamento string
  latitud number
  longitud number
  area_total_m2 number
  activa bool
  fecha_creacion datetime
}

dispositivos [icon: cpu, color: green] {
  id integer pk
  galpon_id integer fk
  mac_address string unique
  codigo_topic string unique
  nombre string
  version_firmware string
  estado string
  ip_local string
  ultima_conexion datetime
  activo bool
  fecha_creacion datetime
}

galpones [icon: package, color: green] {
  id integer pk
  granja_id integer fk
  codigo string
  nombre string
  capacidad_aves integer
  ancho_metros number
  largo_metros number
  orientacion string
  tipo_techo string
  plano_url string
  activo bool
  fecha_construccion date
}

sensores [icon: thermometer, color: green] {
  id integer pk
  galpon_id integer fk
  dispositivo_id integer fk
  zona_id integer fk
  codigo string unique
  tipo string
  modelo string
  fabricante string
  unidad_medida string
  coordenada_x number
  coordenada_y number
  altura_metros number
  fecha_instalacion date
  ultima_calibracion date
  proxima_calibracion date
  estado string
}

mediciones [icon: activity, color: green] {
  id bigint pk
  sensor_id integer fk
  fecha_hora datetime
  valor number
  calidad string
}

umbrales_ambientales [icon: sliders, color: green] {
  id integer pk
  galpon_id integer fk
  variable string
  semana_vida integer
  valor_minimo number
  valor_maximo number
  unidad string
  criticidad string
  vigente bool
  version integer
  fecha_creacion datetime
}

curvas_objetivo [icon: trending-up, color: green] {
  id integer pk
  sexo string
  dia integer
  peso_esperado_g number
  consumo_diario_g number
  consumo_acumulado_g number
  fcr_objetivo number
  etapa_alimentacion string
  temperatura_min number
  temperatura_max number
}

// Historial de accionamientos de equipos (manual o automatico)
accionamientos_equipos [icon: zap, color: green] {
  id integer pk
  equipo_id integer fk
  alerta_id integer fk
  origen string
  estado string
  valor_disparo number
  usuario_id integer fk
  fecha_inicio datetime
  fecha_fin datetime
}


// ============================================================
// EP-05 · ALERTAS (red)
// ============================================================

politicas_alerta [icon: settings, color: red] {
  id integer pk
  granja_id integer fk
  criticidad string
  nivel_escalamiento integer
  canal string
  tiempo_max_respuesta_seg integer
  verificado bool
  activa bool
  fecha_actualizacion datetime
}

alertas [icon: alert-triangle, color: red] {
  id integer pk
  galpon_id integer fk
  lote_id integer fk
  sensor_id integer fk
  tipo string
  criticidad string
  valor_detectado number
  valor_umbral number
  mensaje string
  estado string
  responsable_id integer fk
  escalado_a_id integer fk
  accion_correctiva string
  fecha_creacion datetime
  fecha_aceptacion datetime
  fecha_cierre datetime
}

alertas_canales [icon: send, color: red] {
  id integer pk
  alerta_id integer fk
  canal string
  estado_envio string
  fecha_envio datetime
}

evidencias_alertas [icon: image, color: red] {
  id integer pk
  alerta_id integer fk
  tipo_evidencia string
  archivo_url string
  comentario string
  usuario_id integer fk
  tamano_bytes integer
  fecha_subida datetime
}


// ============================================================
// EP-06 · BITÁCORA PRODUCTIVA (blue)
// ============================================================

lotes [icon: layers, color: blue] {
  id integer pk
  galpon_id integer fk
  proveedor_id integer fk
  codigo string unique
  fecha_ingreso date
  cantidad_inicial integer
  raza string
  sexo string
  costo_pollito_unitario number
  presupuesto_total_cop number
  fecha_salida_estimada date
  fecha_salida_real date
  estado string
}

tipos_alimento [icon: list, color: blue] {
  id integer pk
  nombre string
  marca string
  etapa string
  presentacion string
  dia_inicio integer
  dia_fin integer
  consumo_total_esperado_g number
  activo bool
}

pesajes [icon: bar-chart-2, color: blue] {
  id integer pk
  lote_id integer fk
  fecha date
  peso_promedio_g number
  cantidad_aves_pesadas integer
  peso_minimo_g number
  peso_maximo_g number
  peso_objetivo_g number
  alerta_generada bool
  usuario_id integer fk
  metodo_registro string
  observaciones string
  fecha_registro datetime
}

registros_mortalidad [icon: alert-circle, color: blue] {
  id integer pk
  lote_id integer fk
  fecha date
  cantidad_aves integer
  causa_presuntiva string
  alerta_generada bool
  usuario_id integer fk
  metodo_registro string
  observaciones string
  fecha_registro datetime
}

consumos_diarios [icon: coffee, color: blue] {
  id integer pk
  lote_id integer fk
  tipo_alimento_id integer fk
  fecha date
  alimento_kg number
  agua_litros number
  alerta_agua_baja bool
  usuario_id integer fk
  metodo_registro string
  fecha_registro datetime
}

eventos_sanitarios [icon: plus-square, color: blue] {
  id integer pk
  lote_id integer fk
  insumo_id integer fk
  tipo string
  producto string
  dosis string
  via_aplicacion string
  cantidad_aves integer
  fecha date
  usuario_id integer fk
  metodo_registro string
  observaciones string
  fecha_registro datetime
}


// ============================================================
// EP-07 · FINANZAS, INVENTARIO Y PROVEEDORES (pink)
// ============================================================

proveedores [icon: truck, color: pink] {
  id integer pk
  nombre string
  nit string unique
  tipo_proveedor string
  contacto_persona string
  telefono string
  email string
  direccion string
  activo bool
  fecha_creacion datetime
}

ordenes_compra [icon: shopping-cart, color: pink] {
  id integer pk
  proveedor_id integer fk
  lote_id integer fk
  codigo string unique
  fecha_pedido date
  fecha_entrega_estimada date
  fecha_entrega_real date
  valor_total_cop number
  estado string
  calificacion_cumplimiento number
  calificacion_calidad number
  calificacion_tiempo number
  usuario_id integer fk
  fecha_registro datetime
}

categorias_financieras [icon: tag, color: pink] {
  id integer pk
  nombre string
  tipo string
  descripcion string
  activo bool
}

movimientos_financieros [icon: dollar-sign, color: pink] {
  id integer pk
  lote_id integer fk
  categoria_id integer fk
  proveedor_id integer fk
  tipo string
  valor_cop number
  fecha date
  descripcion string
  numero_factura string
  comprobante_url string
  metodo_pago string
  usuario_id integer fk
  fecha_registro datetime
}

inventario_insumos [icon: archive, color: pink] {
  id integer pk
  nombre string
  tipo string
  unidad_medida string
  stock_actual number
  stock_minimo number
  precio_unitario_cop number
  proveedor_habitual_id integer fk
  ubicacion_almacen string
  fecha_vencimiento date
  activo bool
  fecha_actualizacion datetime
}

movimientos_inventario [icon: shuffle, color: pink] {
  id integer pk
  insumo_id integer fk
  lote_id integer fk
  tipo_movimiento string
  cantidad number
  unidad_medida string
  motivo string
  comprobante_url string
  stock_resultante number
  usuario_id integer fk
  fecha_movimiento datetime
}


// ============================================================
// EP-08 · INFRAESTRUCTURA Y MANTENIMIENTO (gray)
// ============================================================

zonas_galpon [icon: grid, color: gray] {
  id integer pk
  galpon_id integer fk
  codigo string
  nombre string
  tipo_zona string
  coordenada_x_inicio number
  coordenada_y_inicio number
  coordenada_x_fin number
  coordenada_y_fin number
  color_visualizacion string
  activa bool
}

equipos [icon: cpu, color: gray] {
  id integer pk
  galpon_id integer fk
  zona_id integer fk
  codigo string unique
  nombre string
  tipo string
  es_actuador bool
  modelo string
  fabricante string
  serial string
  fecha_compra date
  fecha_instalacion date
  vida_util_horas integer
  horas_operacion integer
  estado_actual string
  modo_operacion string
  coordenada_x number
  coordenada_y number
  costo_cop number
}

mantenimientos [icon: tool, color: gray] {
  id integer pk
  equipo_id integer fk
  tipo string
  fecha_programada date
  fecha_ejecucion date
  duracion_horas number
  tecnico_responsable string
  tecnico_id integer fk
  descripcion string
  costo_cop number
  causa_falla string
  tiempo_inactivo_horas number
  estado string
  evidencia_url string
  observaciones string
  fecha_registro datetime
}

mantenimientos_repuestos [icon: package-2, color: gray] {
  id integer pk
  mantenimiento_id integer fk
  insumo_id integer fk
  descripcion string
  cantidad number
  costo_cop number
}


// ============================================================
// RELACIONES (LLAVES FORÁNEAS)
// ============================================================

// EP-01 Chatbot
prospectos.asesor_asignado_id > usuarios.id
respuestas_chatbot.prospecto_id > prospectos.id
respuestas_chatbot.matriz_id > matriz_calificacion.id
cotizaciones.prospecto_id > prospectos.id
cotizaciones_sensores.cotizacion_id > cotizaciones.id
interacciones_chatbot.prospecto_id > prospectos.id

// EP-03 Autenticación
usuarios.rol_id > roles.id
roles_permisos.rol_id > roles.id
roles_permisos.permiso_id > permisos.id
seguridad_cuenta.usuario_id > usuarios.id
sesiones.usuario_id > usuarios.id
recuperaciones_password.usuario_id > usuarios.id
usuarios_galpones.usuario_id > usuarios.id
usuarios_galpones.galpon_id > galpones.id
bitacora_auditoria.usuario_id > usuarios.id

// EP-04 Estructura y monitoreo
granjas.propietario_id > usuarios.id
galpones.granja_id > granjas.id
zonas_galpon.galpon_id > galpones.id
sensores.galpon_id > galpones.id
sensores.zona_id > zonas_galpon.id
mediciones.sensor_id > sensores.id
umbrales_ambientales.galpon_id > galpones.id
accionamientos_equipos.equipo_id > equipos.id
accionamientos_equipos.alerta_id > alertas.id
accionamientos_equipos.usuario_id > usuarios.id
dispositivos.galpon_id > galpones.id
sensores.dispositivo_id > dispositivos.id

// EP-05 Alertas
politicas_alerta.granja_id > granjas.id
alertas.galpon_id > galpones.id
alertas.lote_id > lotes.id
alertas.sensor_id > sensores.id
alertas.responsable_id > usuarios.id
alertas.escalado_a_id > usuarios.id
alertas_canales.alerta_id > alertas.id
evidencias_alertas.alerta_id > alertas.id
evidencias_alertas.usuario_id > usuarios.id

// EP-06 Bitácora
lotes.galpon_id > galpones.id
lotes.proveedor_id > proveedores.id
pesajes.lote_id > lotes.id
pesajes.usuario_id > usuarios.id
registros_mortalidad.lote_id > lotes.id
registros_mortalidad.usuario_id > usuarios.id
consumos_diarios.lote_id > lotes.id
consumos_diarios.tipo_alimento_id > tipos_alimento.id
consumos_diarios.usuario_id > usuarios.id
eventos_sanitarios.lote_id > lotes.id
eventos_sanitarios.insumo_id > inventario_insumos.id
eventos_sanitarios.usuario_id > usuarios.id

// EP-07 Finanzas e inventario
ordenes_compra.proveedor_id > proveedores.id
ordenes_compra.lote_id > lotes.id
ordenes_compra.usuario_id > usuarios.id
movimientos_financieros.lote_id > lotes.id
movimientos_financieros.categoria_id > categorias_financieras.id
movimientos_financieros.proveedor_id > proveedores.id
movimientos_financieros.usuario_id > usuarios.id
inventario_insumos.proveedor_habitual_id > proveedores.id
movimientos_inventario.insumo_id > inventario_insumos.id
movimientos_inventario.lote_id > lotes.id
movimientos_inventario.usuario_id > usuarios.id

// EP-08 Infraestructura
equipos.galpon_id > galpones.id
equipos.zona_id > zonas_galpon.id
mantenimientos.equipo_id > equipos.id
mantenimientos.tecnico_id > usuarios.id
mantenimientos_repuestos.mantenimiento_id > mantenimientos.id
mantenimientos_repuestos.insumo_id > inventario_insumos.id


// ================================================================
// FIN — 42 entidades, 65 relaciones FK
// ================================================================
```
