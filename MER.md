# MER Avisens — Normalizado

> Modelo Entidad-Relación de referencia del proyecto. Notación de
> [Eraser](https://eraser.io). Esta es una vista documental del modelo.
> La fuente de verdad ejecutable es
> `prisma/schema.prisma` junto con `prisma/migrations`; este documento debe
> actualizarse en el mismo cambio que modifique cualquiera de los dos.
>
> ## SINCRONIZADO CON EL ESQUEMA (2026-10-24)
> El esquema ejecutable contiene **77 modelos y 22 enums**. Se comprobaron los
> nombres de las tablas, los campos escalares y las 127 relaciones declaradas.
> El diagrama resume tipos, nulabilidad, enums e índices; para esos detalles,
> la fuente de verdad sigue siendo `schema.prisma` y sus migraciones.
>
> El backend también contiene módulos para comandos de voz, zonas, registro de
> modelos ML, bioacústica, visión, firmware, órdenes de actuadores y planificación
> genética y de alimento. Su grado de uso y madurez varía por flujo.

```
title AVISENS — Normalizado

// ============================================================
// EP-01 · CHATBOT DE COTIZACIÓN (yellow)
// ============================================================

preguntas_chatbot [icon: help-circle, color: yellow] {
  id integer pk
  codigo string unique
  bloque string
  orden integer
  texto string
  tipo string
  opciones json
  campo_prospecto string
  puntua bool
  obligatoria bool
  omitir_si_canal string
  siguiente string
  saltos json
  activa bool
  fecha_creacion datetime
}

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
  nombre_granja string
  tipo_documento string
  documento string
  municipio string
  departamento string
  numero_galpones integer
  area_granja_m2 number
  area_galpon_m2 number
  rol_prospecto string
  tipo_produccion string
  telefono string
  whatsapp_id string
  email string
  canal_origen string
  contacto_decisor string
  fecha_callback datetime
  puntaje_total integer
  clasificacion string
  accion_siguiente string
  senal_caliente bool
  conectividad_limitada bool
  viabilidad_tecnica string
  intencion_comercial string
  plazo_comercial string
  conectividad_comercial string
  energia_comercial string
  estado string
  pregunta_actual string
  ultima_pregunta string
  asesor_asignado_id integer fk
  usuario_convertido_id integer fk
  resultado_cierre string
  motivo_cierre string
  ip_origen string
  user_agent string
  consentimiento_habeas_data bool
  fecha_inicio datetime
  ultima_actividad datetime
  fecha_finalizacion datetime
}

conversaciones_comerciales [icon: messages-square, color: yellow] {
  id integer pk
  session_id uuid unique
  prospecto_id integer fk
  canal string
  estado string
  resumen string
  objetivo_pendiente string
  version_estado integer
  ultima_actividad datetime
  expira_en datetime
  fecha_creacion datetime
}

mensajes_comerciales [icon: message-square, color: yellow] {
  id integer pk
  conversacion_id integer fk
  remitente string
  contenido string
  client_message_id string
  proveedor_message_id string
  estado string
  fecha_creacion datetime
}

autorizaciones_comerciales [icon: check-square, color: yellow] {
  id integer pk
  prospecto_id integer fk
  conversacion_id integer fk
  proposito string
  version_texto string
  estado string
  canal string
  fecha_respuesta datetime
}

galpones_comerciales [icon: warehouse, color: yellow] {
  id integer pk
  prospecto_id integer fk
  numero integer
  superficie_m2 number
  estado_dato string
  evidencia string
}

conocimiento_comercial [icon: book-open, color: yellow] {
  id integer pk
  codigo string unique
  tema string
  contenido string
  estado_revision string
  estado_capacidad string
  version integer
  vigente bool
  actualizado_en datetime
}

respuestas_chatbot [icon: message-circle, color: yellow] {
  id integer pk
  prospecto_id integer fk
  pregunta_id integer fk
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
  version integer
  snapshot_precios json
  idempotency_key string unique
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

solicitudes_pqrs [icon: inbox, color: yellow] {
  id integer pk
  prospecto_id integer fk
  categoria string
  codigo_pregunta string
  asunto string
  mensaje string
  respuesta string
  estado string
  responsable_id integer fk
  fecha_creacion datetime
  fecha_limite datetime
  fecha_cierre datetime
}


// ============================================================
// EP-02 · ASISTENTE DE VOZ (purple)
// ============================================================

// Registro de cada comando de voz ejecutado por un operario en un galpón.
// modo_conexion + sincronizado soportan el trabajo offline en campo.
comandos_voz [icon: mic, color: purple] {
  id integer pk
  usuario_id integer fk
  galpon_id integer fk
  tipo_comando string
  comando_texto string
  accion_ejecutada string
  confianza_nlu number
  requiere_clarificacion bool
  modo_conexion string
  sincronizado bool
  fecha_ejecucion datetime
  fecha_recepcion datetime
  id_sincronizacion string
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
  organizacion_id integer fk
  nombre_completo string
  cedula string unique
  username string unique
  email string unique // opcional: contacto
  password_hash string
  telefono string
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
  debe_cambiar_password bool
  password_temporal_expira_en datetime
}

sesiones [icon: log-in, color: cyan] {
  id integer pk
  session_id uuid unique
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
  estado string
  motivo string
  ip_solicitud string
  atendida_por_id integer fk
  atendida_en datetime
  observacion string
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

notificaciones [icon: bell, color: cyan] {
  id integer pk
  usuario_id integer fk
  tipo string
  titulo string
  mensaje string
  leida bool
  referencia_tipo string
  referencia_id integer
  fecha_creacion datetime
}


// ============================================================
// EP-04 · MONITOREO AMBIENTAL (green)
// ============================================================

granjas [icon: home, color: green] {
  id integer pk
  propietario_id integer fk
  organizacion_id integer fk
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
  codigo_topic string unique
  nombre string
  version_firmware string
  estado string
  ip_local string
  token_ingesta string unique
  token_ingesta_hash string unique
  arranque_id string
  arranque_anterior string
  arranque_desde datetime
  ultima_conexion datetime
  activo bool
  retirado_en datetime
  fecha_creacion datetime
}

firmware_versiones [icon: cpu, color: green] {
  id integer pk
  version string unique
  sha256 string
  tamano integer
  binario bytes
  notas string
  vigente bool
  fecha_creacion datetime
}

// codigo es único POR GRANJA (unique compuesto granja_id+codigo en la BD):
// cada granja tiene su propio "galpon1".
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

// zona_id relaciona el sensor con una zona del mismo galpón (EP-08).
// estado conserva el ciclo de vida: activo | inactivo | mantenimiento | falla | retirado.
// Regla de coherencia (validada en backend): el dispositivo del sensor debe
// pertenecer al mismo galpón que el sensor.
// Identidad física opcional: UNIQUE(dispositivo_id, tipo, canal).
// canal = "gpio:<n>" (DHT22) o "rele:k1".."rele:k4" (relés K1-K4). Para los
// relés, índice único parcial (dispositivo_id, canal) WHERE canal LIKE 'rele:%':
// un solo relé por canal y ESP32, sin importar su nombre (tipo).
// Los registros anteriores mantienen canal nulo hasta vincular su cableado.
sensores [icon: thermometer, color: green] {
  id integer pk
  galpon_id integer fk
  dispositivo_id integer fk
  zona_id integer fk
  codigo string unique
  tipo string
  canal string
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

// `mediciones` es una tabla normal de Postgres, no particionada. TimescaleDB
// se exploró y se revirtió por la disponibilidad de extensiones en el host
// gestionado previsto. La PK compuesta incluye fecha_hora para permitir evaluar
// partición por rango si el volumen futuro lo justifica.
mediciones [icon: activity, color: green] {
  id bigint pk
  sensor_id integer fk
  fecha_hora datetime
  valor number
  calidad string
}

// Cada entrega de lecturas de un nodo IoT queda registrada para deduplicar
// reintentos, auditar la recepción y conservar códigos desconocidos.
ingestas_dispositivos [icon: upload-cloud, color: green] {
  id bigint pk
  dispositivo_id integer fk
  clave_idempotencia string
  fecha_dispositivo datetime
  fecha_recepcion datetime
  ip_origen string
  cantidad_recibida integer
  cantidad_registrada integer
  codigos_ignorados string[]
}

// Bloqueo distribuido y bitácora de trabajos programados. Evita que dos
// réplicas de la API ejecuten la misma ventana de trabajo al mismo tiempo.
ejecuciones_jobs [icon: timer, color: green] {
  id bigint pk
  nombre string
  clave_ventana string
  propietario string
  estado string
  intentos integer
  iniciada_en datetime
  expira_en datetime
  finalizada_en datetime
  error string
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
  marca string
  origen string
  fuente string
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

// Las órdenes remotas quedan en historial; el estado actual del relé se
// reemplaza con cada reporte del ESP32.
ordenes_actuadores [icon: zap, color: green] {
  id integer pk
  dispositivo_id integer fk
  galpon_id integer fk
  sensor_id integer fk
  accion string
  estado string
  estado_real bool
  motivo string
  arranque_entrega string
  usuario_id integer fk
  fecha_creacion datetime
  fecha_envio datetime
  fecha_resultado datetime
  actualizada_en datetime
}

estados_actuadores [icon: toggle-right, color: green] {
  sensor_id integer pk, fk
  modo string
  encendido bool
  orden_id integer
  reportado_en datetime
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
  origen string
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
  marca_alimento string
  costo_pollito_unitario number
  presupuesto_total_cop number
  fecha_salida_estimada date
  fecha_salida_real date
  estado string
  linea_genetica_id integer fk
}

// Curvas versionadas por línea genética y sexo; cada plan conserva snapshots
// de la referencia que utilizó para que el historial no cambie al publicar otra.
lineas_geneticas [icon: dna, color: blue] {
  id integer pk
  codigo string unique
  nombre string
  descripcion string
  activo bool
  fecha_actualizacion datetime
}

curvas_geneticas_version [icon: trending-up, color: blue] {
  id integer pk
  linea_genetica_id integer fk
  sexo string
  version integer
  estado string
  vigente bool
  fuente string
  fecha_publicacion datetime
  publicada_por_id integer fk
  fecha_creacion datetime
}

puntos_curva_genetica [icon: activity, color: blue] {
  id integer pk
  curva_version_id integer fk
  dia integer
  peso_esperado_g number
  consumo_diario_g number
  consumo_acumulado_g number
  fcr_objetivo number
}

planes_lote [icon: calendar, color: blue] {
  id integer pk
  lote_id integer fk
  version integer
  vigente bool
  peso_objetivo_g number
  estado_dia string
  curva_version_id integer fk
  linea_genetica_id_snapshot integer fk
  sexo_curva_snapshot string
  fecha_ingreso_snapshot date
  dia_objetivo integer
  dia_objetivo_interpolado number
  fecha_salida_calculada date
  motivo string
  creado_por_id integer fk
  fecha_creacion datetime
}

estimaciones_alimento_plan [icon: chart, color: blue] {
  id integer pk
  plan_lote_id integer fk
  version integer
  vigente bool
  estado_alimento string
  version_algoritmo string
  cantidad_inicial_snapshot integer
  dia_corte integer
  mortalidad_snapshot json
  muertes_al_corte integer
  aves_vivas_al_corte integer
  dia_objetivo_snapshot integer
  curva_version_id_snapshot integer fk
  consumo_por_ave_g number
  consumo_total_kg number
  estado_desglose string
  version_desglose string
  marca_alimento_snapshot string
  motivo string
  creado_por_id integer fk
  fecha_creacion datetime
}

renglones_estimacion_alimento [icon: list, color: blue] {
  id integer pk
  estimacion_id integer fk
  orden integer
  tipo_alimento_id integer fk
  tipo_alimento_nombre_snapshot string
  etapa_snapshot string
  dia_inicio integer
  dia_fin integer
  extendido_hasta_dia_objetivo bool
  consumo_por_ave_g number
  consumo_total_kg number
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
  disposicion string
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
  diagnostico string
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

registros_plagas [icon: bug, color: blue] {
  id integer pk
  lote_id integer fk
  fecha date
  tipo_plaga string
  descripcion string
  control_aplicado string
  insumo_id integer fk
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
  granja_id integer fk
  proveedor_id integer fk
  lote_id integer fk
  codigo string
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

detalles_ordenes_compra [icon: list, color: pink] {
  id integer pk
  orden_compra_id integer fk
  insumo_id integer fk
  cantidad number
  cantidad_recibida number
  unidad_medida string
  precio_unitario_cop number
  subtotal_cop number
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
  granja_id integer fk
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
  granja_id integer fk
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
  detalle_orden_compra_id integer fk
  clave_idempotencia string
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
  unidad_medida string
  costo_cop number
  clave_idempotencia string
  movimiento_salida_id integer fk
  movimiento_reversion_id integer fk
  revertido bool
  fecha_registro datetime
}


// ============================================================
// EP-09 · INTELIGENCIA, INDICADORES Y CONTEXTO (teal)
// Incluye modelos persistidos para indicadores, predicción, recomendaciones,
// asistente, análisis de imagen/sonido y clima. Su presencia en el esquema no
// implica que todas las capacidades tengan el mismo nivel de uso o madurez.
// ============================================================

organizaciones [icon: building, color: teal] {
  id integer pk
  nombre string
  nit string unique
  plan string
  activa bool
  fecha_creacion datetime
}

indicadores_lote [icon: activity, color: teal] {
  id integer pk
  lote_id integer fk
  fecha date
  dia_vida integer
  peso_promedio_g number
  fcr number
  epef number
  uniformidad_pct number
  mortalidad_acumulada_pct number
  consumo_acumulado_g number
  calculado_en datetime
  estado_calculo string
  estado_peso string
  pesaje_id_snapshot integer
  pesaje_fecha_snapshot date
  revision_calculo integer
}

modelos_ml [icon: cpu, color: teal] {
  id integer pk
  nombre string
  tipo string
  objetivo string
  version string
  framework string
  metricas string
  activo bool
  fecha_entrenamiento datetime
  fecha_creacion datetime
}

predicciones [icon: trending-up, color: teal] {
  id integer pk
  lote_id integer fk
  modelo_id integer fk
  tipo string
  horizonte_dias integer
  valor_predicho number
  unidad string
  confianza number
  fecha_objetivo date
  datos_entrada string
  fecha_generacion datetime
}

recomendaciones [icon: check-circle, color: teal] {
  id integer pk
  lote_id integer fk
  galpon_id integer fk
  prediccion_id integer fk
  tipo string
  titulo string
  descripcion string
  accion_sugerida string
  prioridad string
  estado string
  usuario_id integer fk
  fecha_generacion datetime
  fecha_resolucion datetime
}

conversaciones_ia [icon: message-circle, color: teal] {
  id integer pk
  usuario_id integer fk
  titulo string
  contexto string
  fecha_inicio datetime
  fecha_ultimo_mensaje datetime
}

mensajes_ia [icon: message-square, color: teal] {
  id integer pk
  conversacion_id integer fk
  rol string
  contenido string
  tokens integer
  fecha datetime
}

analisis_bioacustico [icon: mic, color: teal] {
  id integer pk
  galpon_id integer fk
  lote_id integer fk
  modelo_id integer fk
  fecha_hora datetime
  indicador string
  valor number
  audio_url string
  interpretacion string
}

analisis_vision [icon: eye, color: teal] {
  id integer pk
  galpon_id integer fk
  lote_id integer fk
  modelo_id integer fk
  fecha_hora datetime
  tipo_analisis string
  resultado string
  imagen_url string
}

clima [icon: cloud, color: teal] {
  id integer pk
  granja_id integer fk
  fecha_hora datetime
  temperatura number
  humedad number
  precipitacion number
  viento_kmh number
  fuente string
}

catalogo_sensores [icon: list, color: yellow] {
  id integer pk
  tipo_sensor string unique
  nombre string
  descripcion string
  precio_unitario_cop number
  cobertura_m2 number
  obligatorio bool
  activo bool
  estado_revision string
  fecha_actualizacion datetime
}

tarifas_comerciales [icon: badge-dollar-sign, color: yellow] {
  id integer pk
  codigo string
  nombre string
  precio_unitario_cop number
  estado_revision string
  version integer
  vigente bool
  actualizado_en datetime
}


// ============================================================
// RELACIONES (LLAVES FORÁNEAS)
// ============================================================

// EP-01 Chatbot
prospectos.asesor_asignado_id > usuarios.id
prospectos.usuario_convertido_id > usuarios.id
respuestas_chatbot.prospecto_id > prospectos.id
respuestas_chatbot.pregunta_id > preguntas_chatbot.id
cotizaciones.prospecto_id > prospectos.id
cotizaciones_sensores.cotizacion_id > cotizaciones.id
interacciones_chatbot.prospecto_id > prospectos.id
solicitudes_pqrs.prospecto_id > prospectos.id
solicitudes_pqrs.responsable_id > usuarios.id
conversaciones_comerciales.prospecto_id > prospectos.id
mensajes_comerciales.conversacion_id > conversaciones_comerciales.id
autorizaciones_comerciales.prospecto_id > prospectos.id
autorizaciones_comerciales.conversacion_id > conversaciones_comerciales.id
galpones_comerciales.prospecto_id > prospectos.id

// EP-02 Asistente de voz
comandos_voz.usuario_id > usuarios.id
comandos_voz.galpon_id > galpones.id

// EP-03 Autenticación
usuarios.rol_id > roles.id
roles_permisos.rol_id > roles.id
roles_permisos.permiso_id > permisos.id
seguridad_cuenta.usuario_id > usuarios.id
sesiones.usuario_id > usuarios.id
recuperaciones_password.usuario_id > usuarios.id
recuperaciones_password.atendida_por_id > usuarios.id
usuarios_galpones.usuario_id > usuarios.id
usuarios_galpones.galpon_id > galpones.id
bitacora_auditoria.usuario_id > usuarios.id
notificaciones.usuario_id > usuarios.id

// EP-04 Estructura y monitoreo
// Invariantes de integridad aplicadas también en la base de datos:
// - granjas.(propietario_id, organizacion_id) referencia al mismo usuario/tenant;
// - sensores.(dispositivo_id, galpon_id) referencia un dispositivo del mismo galpón;
// - una organización con usuarios no puede eliminarse dejándolos huérfanos.
// Las asignaciones activas exigen Operario, mismo tenant y toda la cadena activa.
// La API no traslada galpones, lotes, dispositivos ni sensores entre padres:
// preserva así las relaciones históricas de alertas, mediciones y finanzas.
granjas.propietario_id > usuarios.id
granjas.organizacion_id > organizaciones.id
granjas.organizacion_id > usuarios.organizacion_id
galpones.granja_id > granjas.id
zonas_galpon.galpon_id > galpones.id
sensores.galpon_id > galpones.id
sensores.galpon_id > dispositivos.galpon_id
sensores.zona_id > zonas_galpon.id
mediciones.sensor_id > sensores.id
umbrales_ambientales.galpon_id > galpones.id
accionamientos_equipos.equipo_id > equipos.id
accionamientos_equipos.alerta_id > alertas.id
accionamientos_equipos.usuario_id > usuarios.id
dispositivos.galpon_id > galpones.id
sensores.dispositivo_id > dispositivos.id
ingestas_dispositivos.dispositivo_id > dispositivos.id
ordenes_actuadores.dispositivo_id > dispositivos.id
ordenes_actuadores.galpon_id > dispositivos.galpon_id
ordenes_actuadores.sensor_id > sensores.id
ordenes_actuadores.usuario_id > usuarios.id
estados_actuadores.sensor_id > sensores.id

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
lotes.linea_genetica_id > lineas_geneticas.id
curvas_geneticas_version.linea_genetica_id > lineas_geneticas.id
curvas_geneticas_version.publicada_por_id > usuarios.id
puntos_curva_genetica.curva_version_id > curvas_geneticas_version.id
planes_lote.lote_id > lotes.id
planes_lote.curva_version_id > curvas_geneticas_version.id
planes_lote.linea_genetica_id_snapshot > lineas_geneticas.id
planes_lote.creado_por_id > usuarios.id
estimaciones_alimento_plan.plan_lote_id > planes_lote.id
estimaciones_alimento_plan.curva_version_id_snapshot > curvas_geneticas_version.id
estimaciones_alimento_plan.creado_por_id > usuarios.id
renglones_estimacion_alimento.estimacion_id > estimaciones_alimento_plan.id
renglones_estimacion_alimento.tipo_alimento_id > tipos_alimento.id
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
registros_plagas.lote_id > lotes.id
registros_plagas.insumo_id > inventario_insumos.id
registros_plagas.usuario_id > usuarios.id

// EP-07 Finanzas e inventario
ordenes_compra.granja_id > granjas.id
ordenes_compra.proveedor_id > proveedores.id
ordenes_compra.lote_id > lotes.id
ordenes_compra.usuario_id > usuarios.id
detalles_ordenes_compra.orden_compra_id > ordenes_compra.id
detalles_ordenes_compra.insumo_id > inventario_insumos.id
movimientos_financieros.granja_id > granjas.id
movimientos_financieros.lote_id > lotes.id
movimientos_financieros.categoria_id > categorias_financieras.id
movimientos_financieros.proveedor_id > proveedores.id
movimientos_financieros.usuario_id > usuarios.id
inventario_insumos.proveedor_habitual_id > proveedores.id
inventario_insumos.granja_id > granjas.id
movimientos_inventario.insumo_id > inventario_insumos.id
movimientos_inventario.lote_id > lotes.id
movimientos_inventario.usuario_id > usuarios.id
movimientos_inventario.detalle_orden_compra_id > detalles_ordenes_compra.id

// EP-08 Infraestructura
equipos.galpon_id > galpones.id
equipos.zona_id > zonas_galpon.id
mantenimientos.equipo_id > equipos.id
mantenimientos.tecnico_id > usuarios.id
mantenimientos_repuestos.mantenimiento_id > mantenimientos.id
mantenimientos_repuestos.insumo_id > inventario_insumos.id
mantenimientos_repuestos.movimiento_salida_id > movimientos_inventario.id
mantenimientos_repuestos.movimiento_reversion_id > movimientos_inventario.id

// EP-09 Capa de inteligencia
usuarios.organizacion_id > organizaciones.id
indicadores_lote.lote_id > lotes.id
predicciones.lote_id > lotes.id
predicciones.modelo_id > modelos_ml.id
recomendaciones.lote_id > lotes.id
recomendaciones.galpon_id > galpones.id
recomendaciones.prediccion_id > predicciones.id
recomendaciones.usuario_id > usuarios.id
conversaciones_ia.usuario_id > usuarios.id
mensajes_ia.conversacion_id > conversaciones_ia.id
analisis_bioacustico.galpon_id > galpones.id
analisis_bioacustico.lote_id > lotes.id
analisis_bioacustico.modelo_id > modelos_ml.id
analisis_vision.galpon_id > galpones.id
analisis_vision.lote_id > lotes.id
analisis_vision.modelo_id > modelos_ml.id
clima.granja_id > granjas.id


// ================================================================
// FIN — 77 entidades según prisma/schema.prisma (2026-10-24)
// ================================================================
```
