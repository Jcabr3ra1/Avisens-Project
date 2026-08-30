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

## Trampa: quitar un ítem del menú abre la ruta a todos los roles

`navConfig.tsx` termina así:

```ts
export function puedeAcceder(path: string, rol: string | null): boolean {
  for (const section of NAV_SECTIONS) { /* ... busca el path ... */ }
  return true   // ← no encontrado = permitido
}
```

`PanelLayout` usa esa función como guardia de rutas. **Una ruta que desaparece de
`NAV_SECTIONS` deja de estar protegida** y queda accesible para cualquier rol.

`/recuperaciones-password` es solo de Admin. Quitarlo del menú sin más se la
abriría a los operarios. Lo mismo aplica a cualquier otro ítem con `roles`
restringidos.

**Antes de mover el primer ítem, arregla la guardia**: separa el permiso del
menú (una tabla `PERMISOS_RUTA` o un `return false` por defecto con las rutas
públicas declaradas). Que `puedeAcceder` no dependa de que la ruta tenga puerta
en el sidebar. Sin esto, cada movimiento de la lista de abajo es un agujero.

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
