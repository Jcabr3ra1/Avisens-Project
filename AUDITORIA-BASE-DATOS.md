# Auditoría de la base de datos de Avisens

**Fecha:** 24 de octubre de 2026
**Alcance:** esquema Prisma, historial de migraciones, referencias en el código,
base PostgreSQL local en modo de solo lectura y documentación oficial vigente.

## Resumen

La base no necesita un reemplazo general por antigüedad. La instancia local usa
PostgreSQL 16.15, versión que sigue soportada. Los problemas concretos eran dos
migraciones históricas ausentes, estructuras de AVIA no representadas en
`schema.prisma`, y cinco campos heredados que no tienen uso activo.

Se restauraron los dos SQL desde objetos de Git y sus SHA-256 coinciden con los
checksums de PostgreSQL. Se agregaron al schema Prisma los modelos/columnas AVIA
que ya existen en la base y se aplicó una migración para retirar solo los cinco
campos sin uso. `MER.md` ahora coincide con los 77 modelos, 22 enums, 127
relaciones y todos los campos escalares del schema. Prisma confirma que las 84
migraciones están aplicadas y que esquema y base local coinciden.

## Hallazgos

### 1. Se recuperó el historial; el origen de la función AVIA aún debe decidirse

La base local informa 83 migraciones finalizadas. Inicialmente el checkout
contenía 81 archivos; se recuperaron los dos SQL originales desde objetos Git
inalcanzables y ahora hay 83. Los SHA-256 coinciden con los checksums de
`_prisma_migrations`:

- `20260831090000_chat_privado_equipo` —
  `0c9ae08d89be20731b41d31e4198e011a0b9b2df5594c630de1ff6cb8a0f956b`
- `20261023090000_avia_conversacion_comercial` —
  `9a58c54c42d0b82176e121bf7844f84c671e5d3ab3240339998cf8257cec2609`

La migración del chat privado ya tenía una nota posterior (`20260901010000`)
que pedía conservar su carpeta. El SQL de AVIA y sus modelos correspondientes
aparecen en el commit local inalcanzable `d03f0437`; ese commit no forma parte
de `develop` ni de una rama remota consultada. El antiguo worktree
`feat/avia-asesor-conversacional` está desaparecido. Después de restaurar los
archivos, Prisma reconoció las 83 migraciones históricas aplicadas. Luego se
aplicó la migración nueva de limpieza: el total local quedó en 84 y no hay
migraciones pendientes.

Prisma trata la carpeta de migraciones como la historia del modelo y detecta
migraciones aplicadas que faltan o fueron modificadas; por eso los SQL
recuperados no deben editarse ni borrarse. [Historial oficial de migraciones de Prisma 7](https://www.prisma.io/docs/orm/v7/prisma-migrate/understanding-prisma-migrate/migration-histories)

### 2. El esquema de la base local conserva una función AVIA no integrada en `develop`

La comparación inicial encontró seis tablas y ocho columnas presentes en la
base local, pero no representadas en el schema de `develop`. Se añadió al schema
la representación de esas estructuras para preservar la base:

- `autorizaciones_comerciales`
- `conocimiento_comercial`
- `conversaciones_comerciales`
- `galpones_comerciales`
- `mensajes_comerciales`
- `tarifas_comerciales`

Los campos que se añadieron a `schema.prisma` son:

- `catalogo_sensores.estado_revision`
- `cotizaciones.idempotency_key`, `snapshot_precios` y `version`
- `prospectos.conectividad_comercial`, `energia_comercial`,
  `intencion_comercial` y `plazo_comercial`

Las seis tablas comerciales están vacías en esta instancia, pero hay datos en
otras partes de esa estructura: `catalogo_sensores.estado_revision` tiene valor
en 6 de 6 filas; `cotizaciones.version`, en 4 de 4 filas; y existen 75 filas en
`prospectos`. Los cuatro campos comerciales de `prospectos` están nulos en esas
75 filas; `cotizaciones.idempotency_key` y `snapshot_precios` están nulos en sus
4 filas. No se inspeccionó el contenido de las filas.

La comparación con el commit AVIA recuperado confirma que esos seis modelos y
campos proceden de una función experimental que no fue integrada en el código
de `develop`. `schema.prisma` ya representa ahora la estructura real; antes de
aplicar la limpieza, `prisma migrate diff` proponía únicamente retirar los cinco
campos enumerados más abajo. Los demás campos AVIA con valores —
`catalogo_sensores.estado_revision` y `cotizaciones.version`— se conservaron.

También corregí la representación de `conversaciones_comerciales.session_id`:
la migración histórica define `DEFAULT gen_random_uuid()` en PostgreSQL, así que
Prisma ahora lo expresa con `dbgenerated(...)` en vez de generar el UUID solo en
el cliente. La comparación ya no propone eliminar ese default.
[Referencia oficial de Prisma 7 para defaults y UUID](https://www.prisma.io/docs/orm/v7/reference/prisma-schema-reference)

### 3. La versión de PostgreSQL está soportada

La instancia local reportó PostgreSQL 16.15 y zona horaria `UTC`. La política
oficial indica que PostgreSQL 16 recibe soporte hasta el 9 de noviembre de 2028
y recomienda mantener el último minor de la rama; 16.15 figura como el minor
actual consultado. No hace falta una migración de major para corregir el
problema observado. [Política oficial de versiones de PostgreSQL](https://www.postgresql.org/support/versioning/)

### 4. Prisma puede actualizarse dentro de su major, sin saltar a ciegas

El lockfile del backend fija Prisma y Client en 7.8.0. La documentación oficial
consultada identifica 7.10.1 como la versión actual de `@prisma/client` de la
línea 7. También indica que Prisma 8 sigue como release candidate al 23 de
octubre de 2026 y que Prisma 7 continúa con soporte. La recomendación es
planificar una actualización controlada dentro de Prisma 7 y probarla antes de
desplegar; no cambiar de major como parte de una limpieza de columnas.
[Estado oficial de versiones de Prisma](https://www.prisma.io/docs/orm/release-status)

### 5. Las marcas de tiempo necesitan clasificación semántica

Prisma 7 asigna `timestamp(3)` de PostgreSQL a `DateTime` si el esquema no
especifica tipo nativo; el esquema revisado no declara `@db.Timestamptz`.
PostgreSQL trata `timestamp without time zone` como hora local sin zona y
descarta cualquier zona indicada en la entrada. Como la instancia local usa
UTC, no se demuestra un error de datos actual, pero sí falta expresar claramente
qué campos representan instantes globales y cuáles son fechas/horas locales.
La corrección debe ser campo por campo y después de verificar cómo escriben y
leen esos valores los clientes; no es seguro convertir todas las columnas en
bloque.
[Tipos de fecha y hora de PostgreSQL 16](https://www.postgresql.org/docs/16/datatype-datetime.html)
· [Tipos nativos de Prisma 7](https://www.prisma.io/docs/orm/v7/reference/prisma-schema-reference)

### 6. Índices: revisar consultas reales, no indexar cada FK automáticamente

El análisis estático identificó 41 de 112 campos de relación FK sin un índice
explícito que comience por esa columna. Esto no es una lista de errores por sí
sola: PostgreSQL no crea automáticamente índices en las columnas que apuntan a
otra tabla, y la decisión depende del patrón de consulta y del volumen.
[Documentación oficial sobre restricciones e índices FK](https://www.postgresql.org/docs/16/ddl-constraints.html)

Conviene medir con `EXPLAIN` las consultas que filtran por lote/granja/usuario y
ordenan por fecha, antes de proponer índices compuestos. No se recomienda añadir
41 índices en bloque.

### 7. Restricciones y precisión numérica

Los valores financieros revisados usan `Decimal`/`numeric`; no se encontraron
campos monetarios modelados como `Float`. Hay restricciones `CHECK` definidas
en migraciones. Prisma no representa todas las funciones propias de PostgreSQL
en su schema, por lo que esas restricciones deben conservarse en SQL de
migración al actualizar modelos. No se deben reemplazar migraciones históricas
por un `db push`. [Matriz oficial de funciones de base de datos de Prisma 7](https://www.prisma.io/docs/orm/v7/reference/database-features)

### 8. La partición de mediciones no está justificada con la evidencia actual

`mediciones` es una tabla normal, con PK que incluye fecha e índice por sensor y
fecha. PostgreSQL presenta la partición como una herramienta útil para tablas
muy grandes y para ciertos patrones de retención; sin métricas de tamaño,
crecimiento y consultas no hay evidencia para introducirla ahora. Mantenerla
sin particionar es razonable hasta medir el volumen real.
[Buenas prácticas oficiales de partición de PostgreSQL 16](https://www.postgresql.org/docs/16/ddl-partitioning.html)

## Campos retirados del schema y de la base local

El escaneo del código fuente no encontró usos activos para estos cinco campos,
y las consultas de conteo a la base local encontraron cero valores no nulos en
cada uno:

| Tabla | Campo | Evidencia |
|---|---|---|
| `usuarios` | `foto_url` | Sin referencias activas; 0 valores |
| `usuarios` | `huella_voz_url` | Sin referencias activas; 0 valores; la biometría de voz no está implementada |
| `usuarios` | `pin_voz_hash` | Sin referencias activas; 0 valores; la autenticación por voz no está implementada |
| `recuperaciones_password` | `token_hash` | Comentado como legado; sin uso activo; 0 valores |
| `respuestas_chatbot` | `matriz_id` | Sin uso activo; 0 valores; el resultado se guarda en `puntaje_obtenido` |

La migración `20261024110000_retira_campos_legacy_sin_uso` verificó que esos
campos estuvieran vacíos y abortaría si encontrara un valor. También retiró la
FK de `respuestas_chatbot.matriz_id`; `puntaje_obtenido` sigue guardando el
puntaje. Se aplicó a la base local; la comprobación posterior confirmó cero
columnas residuales, 84 migraciones aplicadas y un schema diff vacío.

### Candidatos secundarios que requieren refactor de flujo

- `recuperaciones_password.usado` expresa parte de un estado ya presente en
  `estado`, pero el backend todavía lo lee/escribe. Se puede simplificar el
  contrato y luego retirar la columna en una fase posterior.
- `recuperaciones_password.expira_en` tiene 0 valores en esta base y no se
  encontró lectura en consultas, pero sí escritura en código. Antes de retirarlo
  hay que decidir si el flujo conservará una sola fuente de expiración.

## Campos que parecen redundantes y deben conservarse por ahora

- `dispositivos.token_ingesta`: está vacío en las cinco filas locales, pero el
  backend todavía admite el token plano durante una transición y lo actualiza
  al hash. Retirarlo requiere cerrar primero esa compatibilidad.
- `pesajes.alerta_generada`, `registros_mortalidad.alerta_generada` y
  `consumos_diarios.alerta_agua_baja`: el backend y/o el contrato Android aún
  leen esos indicadores. Falta implementar o confirmar quién los calcula; no
  son seguros de borrar solo porque hoy estén en falso.
- `InventarioInsumo.stock_actual` frente a `MovimientoInventario.stock_resultante`:
  el primero representa el estado actual y el segundo conserva la fotografía
  del movimiento.
- `Lote.fecha_salida_estimada` frente a `PlanLote.fecha_salida_calculada`:
  una es dato operativo del lote y la otra pertenece a una versión del plan.
- `Mantenimiento.tecnico_responsable` frente a `tecnico_id`: el primero permite
  registrar personal externo; el segundo identifica un usuario de Avisens.
- `OrdenCompra.valor_total_cop` puede representar compras simples sin renglones.
- `curvas_objetivo` sigue consultada por indicadores, predicciones y CRUD; no es
  equivalente a las curvas genéticas versionadas.

## Siguiente secuencia segura

1. Antes de desplegar la migración en otros entornos, confirmar los conteos de
   esos cinco campos; el bloque de protección aborta si algún valor no nulo
   sigue presente.
2. Decidir aparte si se recupera el código de AVIA para `develop`; sus tablas y
   campos se conservan, pero el módulo funcional no forma parte del checkout.
3. Simplificar `recuperaciones_password.usado` y `expira_en` solo después de
   refactorizar el flujo que todavía los lee/escribe.
4. Actualizar Prisma dentro de la major soportada y medir los índices con datos
   y consultas representativos.

La migración solo se aplicó a la base local. Los hallazgos de uso y conteos son
evidencia de esta instancia y este checkout; no prueban el estado de producción.
