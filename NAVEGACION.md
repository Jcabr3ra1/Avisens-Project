# Navegación: los hijos viven dentro de su padre

**Una entidad que no puede existir sin un padre NO lleva ítem propio en el
sidebar.** Se entra a ella desde la pantalla de su padre. El modelo a copiar es
Granjas → Galpones → Lotes, que ya lo hace bien.

### Cómo decidirlo con el MER

El MER declara 101 relaciones, pero **no todas mandan en la navegación**. Hay que
distinguir dos tipos de clave foránea:

| Tipo | Qué significa | Ejemplo | ¿Manda en la navegación? |
|------|---------------|---------|--------------------------|
| **Composición** | El hijo no existe sin el padre | `lotes.galpon_id` | **Sí** |
| **Referencia** | Apunta a algo que existe por su cuenta | `pesajes.usuario_id` | No |

Casi todas las tablas tienen `usuario_id`, y eso **no** convierte a Personas en
padre de nada: solo registra quién hizo el apunte. Lo mismo con
`consumos_diarios.tipo_alimento_id` o `movimientos_financieros.categoria_id`.

### La jerarquía que sale del MER

```
Organización
├── Personas (usuarios)
├── Proveedores ──────────── Órdenes de compra ── Detalles
└── Granjas
    ├── Políticas de alerta
    └── Galpones
        ├── Zonas
        ├── Dispositivos ─── Sensores ─── Mediciones
        ├── Umbrales
        ├── Equipos ──────── Mantenimientos ── Repuestos
        └── Lotes
            ├── Pesajes
            ├── Mortalidad
            ├── Consumos diarios
            ├── Eventos sanitarios
            └── Registros de plagas

Prospectos ─── Cotizaciones · Interacciones · Solicitudes PQRS
```

### Cuando un hijo tiene varios padres

Algunas tablas tienen más de una composición: `alertas` cuelga de galpón, lote y
sensor a la vez; `ordenes_compra` de granja, proveedor y lote. En esos casos el
padre de navegación es **aquel por el que el usuario la busca**, no el primero de
la lista. Si se consulta cruzando varios padres, es una **vista transversal** y sí
lleva ítem propio.

### Excepciones: vistas transversales

Llevan ítem propio aunque tengan padre, porque se consultan por urgencia o
cruzando granjas, no bajando por la jerarquía:

- **Alertas** — se pregunta «¿qué está mal ahora?», no «¿qué pasa en el galpón 3?»
- **Bodega** y **Finanzas** — cruzan varias granjas
- **Auditoría** — transversal por definición

### Al aplicarla

Mover un hijo **no es borrar su ítem del menú**. Hay que darle lugar dentro del
padre —una pestaña, una sección o un enlace desde la fila—, y eso normalmente
implica rehacer la pantalla padre. Antes de quitar un ítem, la pantalla destino
tiene que existir.

El backend ya expone los endpoints filtrados por padre que esto necesita:
`/alertas/galpon/:id`, `/cotizaciones/prospecto/:id`,
`/mantenimientos/:id/repuestos`, `/evidencias-alerta/alerta/:id`.

---

Este archivo está versionado a propósito: `CLAUDE.md` y `AGENTS.md` están
en `.gitignore`, así que una regla escrita solo allí no viaja con el repo.
El encargo pendiente de aplicarla está en `TAREA-NAVEGACION.md`.

La separación de experiencias y rutas de inicio por rol está definida en
`PANELES-POR-ROL.md`; se complementa con esta jerarquía, no la reemplaza.
