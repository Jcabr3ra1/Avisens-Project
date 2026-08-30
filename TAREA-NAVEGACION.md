# Encargo: aplicar la jerarquía padre → hijo en la navegación

**Para:** la IA que reciba esta tarea.
**Regla que manda:** `NAVEGACION.md`. Léela completa antes de tocar nada. Este archivo no la repite: solo
dice qué mover, en qué orden y con qué criterio de aceptación.

## Reparto de trabajo (no invadir)

Juan sigue construyendo **los módulos que le faltan al rol Admin** según el MER,
en paralelo y en el mismo repositorio.

| Zona | De quién |
|------|----------|
| `src/features/usuarios/**` | **Juan — NO TOCAR.** Refactor a medias, sin commitear |
| `src/features/admin/**` | **Juan — NO TOCAR.** Módulos nuevos en curso |
| `src/app/layout/Sidebar/navConfig.tsx` | Compartido — avisar antes de editar |
| El resto de lo listado abajo | Tuyo |

Hay trabajo sin commitear en el árbol. **No hagas `git add -A`**: añade por ruta
solo los archivos que tú modificaste. Es regla del proyecto y ya costó un PR con
4.301 líneas ajenas.

## La guardia de rutas ya está arreglada (no la rehagas)

Hasta el commit `c275571`, `puedeAcceder` buscaba la ruta en `NAV_SECTIONS` y
devolvía `true` si no la encontraba. Una ruta sin ítem en el sidebar quedaba
abierta para cualquier rol — `/galpones` y `/lotes` lo estaban. Como esta tarea
consiste justamente en sacar ítems del menú, habría abierto una puerta por cada
movimiento.

Ya está resuelto. Ahora manda `PERMISOS_RUTA` en `navConfig.tsx`:

```ts
export function puedeAcceder(path: string, rol: string | null): boolean {
  const permitidos = PERMISOS_RUTA[path]
  if (!permitidos) return false          // no declarada = negada
  return rol !== null && permitidos.includes(rol)
}

export function itemVisible(item: NavItem, rol: string | null): boolean {
  return puedeAcceder(item.path, rol)
}
```

Es la única fuente de verdad: la guardia la consulta y el menú deriva de ella.
Los ítems de `NAV_SECTIONS` ya no llevan `roles`.

**Lo que esto te exige:**

- Quitar un ítem de `NAV_SECTIONS` ya **no** afecta el permiso. Es seguro.
- **La ruta debe seguir en `PERMISOS_RUTA`** aunque pierda su puerta en el menú.
  Si la borras de la tabla, deja de ser accesible para todos.
- Si añades una ruta nueva, decláralala en la tabla o nadie podrá entrar.

## La herramienta ya existe

`src/shared/ui/PantallaHija/` — overlay + entrada animada, cierra con clic
afuera, con la ✕ y con `Escape`.

Ejemplo funcionando: `AdminPage.tsx` abre las granjas de un propietario al
pulsar su fila en `ControlGranjas`. Cópialo antes de inventar otro patrón.

```tsx
{hijoAbierto && (
  <PantallaHija titulo={...} subtitulo={...} onCerrar={() => setHijoAbierto(null)}>
    <ContenidoDelHijo ... />
  </PantallaHija>
)}
```

## Los movimientos, del más barato al más caro

### 1. Consumos diarios → Bitácora  ·  casi gratis

`BitacoraPage.tsx:190` **ya tiene una pestaña «Consumos»**. El ítem
`/consumos-diarios` del sidebar es un duplicado: el destino ya existe.

- Comparar qué hace `ConsumosDiariosPage` que no haga la pestaña. Si falta algo,
  llevarlo a la pestaña primero.
- Quitar el ítem de `navConfig.tsx`.
- La ruta se queda viva (enlaces externos, marcadores).

**Aceptación:** ningún dato ni acción de la pantalla suelta se pierde al entrar
por la pestaña.

### 2. Solicitudes PQRS → Clientes  ·  barato

`solicitudes_pqrs` cuelga de `prospecto_id`. `PanelDetalle.tsx` del CRM ya se
abre por prospecto y **ya carga sus cotizaciones** con `useCotizaciones`.

- Añadir la sección PQRS al panel, con el mismo patrón que las cotizaciones.
- Endpoint filtrado por padre, igual que `/cotizaciones/prospecto/:id`.
- Quitar el ítem del sidebar.

**Aceptación:** desde un prospecto se ven y atienden sus PQRS sin salir del panel.

### 3. Sensores → Galpón  ·  caro

`sensores` → `dispositivos` → `galpon_id`. La pantalla de sensores es completa,
así que hay que darle lugar dentro de Galpones o Monitoreo **antes** de quitar
el ítem. La regla es explícita: mover un hijo no es borrar su ítem.

**Aceptación:** la pantalla destino existe y funciona antes de que el ítem
desaparezca.

### 4. Compras → Proveedores  ·  caro y discutible

`ordenes_compra` tiene tres padres: granja, proveedor y lote. Según la regla, el
padre de navegación es aquel por el que el usuario la busca. **Pregúntale a Juan
antes de moverla**: si se consulta cruzando granjas, es vista transversal y se
queda donde está.

**Decisión (2026-08-30):** se queda transversal, con ítem propio. La consulta
diaria cruza granjas y proveedores, y los permisos lo refuerzan:
`/proveedores` es solo de Administrador mientras `/ordenes-compra` también la
ve el Propietario — moverla dentro del panel le quitaría el acceso. No se toca.

### 5. Recuperar acceso → Personas  ·  BLOQUEADO

Una recuperación no existe sin su usuario, así que le toca vivir dentro de
Personas. Pero `src/features/usuarios/` está a medio refactorizar y es de Juan.
**No lo toques hasta que él lo dé por cerrado.**

## Lo que NO se mueve

Llevan ítem propio por decisión, no por descuido. No los «arregles»:

**Alertas** (se pregunta «¿qué está mal ahora?»), **Bodega** y **Finanzas**
(cruzan varias granjas), **Auditoría** (transversal por definición),
**Notificaciones** (ya salió del menú: vive en la campana de la cabecera del
sidebar).

## Definición de hecho

Por cada movimiento, y esto no es negociable — es la regla de calidad del
proyecto:

1. `npm run build` en verde, con la salida pegada como evidencia.
   **Ojo: `npx tsc --noEmit` no comprueba nada en este repo** — el `tsconfig.json`
   de la raíz es un archivo de solución (`"files": []` + `references`). El gate
   real es `npm run build`.
2. `npx eslint <rutas tocadas>` limpio.
3. Demostración en vivo: entrar al hijo desde la pantalla del padre y mostrar que
   trae los datos.
4. Commits en español, Conventional Commits, **sin `Co-Authored-By`**.
