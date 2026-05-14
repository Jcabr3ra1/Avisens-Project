# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # dev server en http://localhost:5173
npm run build      # tsc -b && vite build
npm run lint       # ESLint
npm run preview    # preview del build
npx tsc --noEmit   # type-check sin compilar (usar antes de cada commit)
```

No hay tests configurados.

## Arquitectura — Screaming Architecture (3 capas)

La estructura grita el negocio, no la tecnología. Regla de oro: **si borras un feature, el resto sigue funcionando.**

```
src/
├── app/           ← infraestructura pura (rutas, layout, entrada)
├── features/      ← módulos de negocio independientes
└── shared/        ← código que usan 2+ features
```

### `app/`
- `routes.tsx` — 3 grupos de rutas diferenciados:
  - `/login` → standalone sin layout
  - `/` → bajo `AppLayout` (Navbar + Footer + FloatChat)
  - `/dashboard` y demás rutas de app → sin `AppLayout` (cada una trae su propio layout)
- `layout/AppLayout` — solo para la landing pública

### `features/`
Cada feature tiene `[Nombre]Page.tsx` + `[Nombre]Page.css` + `components/`.
Features actuales: `landing`, `login`, `dashboard`, `crm`, `monitoreo`, `bitacora`, `alertas`, `finanzas`, `inventario`, `infraestructura`, `usuarios`, `granjas`.

El `DashboardPage` implementa su propio topbar + sidebar con navegación entre features — **no usa `AppLayout`**.

### `shared/`
- `styles/index.css` — variables CSS globales (tema oscuro), reset, keyframes, clases utilitarias (`.fade-up`, `.grad-text`, `.bg-layer`, `.grid-layer`)
- `types/index.ts` — interfaces globales (barrel exports)
- `hooks/useFadeUp.ts` — `IntersectionObserver` que agrega `.visible` al elemento; requiere clase `.fade-up` en el elemento
- `utils/formato.ts` — `formatCurrency`, `formatNumber` (locale `es-CO`)
- `ui/Ic/Ic.tsx` — componente SVG icon genérico que recibe `d` (path) y `size`

## Path Aliases

Configurados en `vite.config.ts` y `tsconfig.app.json`:

| Alias | Resuelve a |
|-------|-----------|
| `@app` | `src/app/` |
| `@features` | `src/features/` |
| `@shared` | `src/shared/` |

Usar siempre aliases; nunca rutas relativas que atraviesen capas (`../../`).

## CSS — Reglas críticas

- **Solo CSS Vanilla.** Sin Tailwind, sin CSS-in-JS.
- Cada componente tiene su `.css` co-located al lado del `.tsx`.
- Variables del tema viven en `shared/styles/index.css` — el tema es dark exclusivamente (`--bg: #0a1612`, acento `--success: #10b981`).
- `App.css` solo infraestructura de layout. `shared/styles/index.css` solo globales. Estilos de negocio van en el `.css` del feature.
- Las clases `.bg-layer` y `.grid-layer` son `position: fixed; z-index: 0` — se usan en páginas standalone (landing, login) para el fondo con gradiente + grid.

## TypeScript

Modo estricto con `noUnusedLocals` y `noUnusedParameters` activos. Importar tipos con `import type`. No usar extensión `.tsx` en imports: `import Foo from './Foo'` no `'./Foo.tsx'`.

## Datos

Actualmente todo es mock data hardcodeada dentro de los componentes (Fase 1). Cuando haya backend, los servicios irán en `features/[nombre]/services/` y la configuración del cliente HTTP en `shared/services/`.

## Convenciones de Componentes

| Dónde va | Cuándo |
|----------|--------|
| `features/[nombre]/components/` | Solo ese feature lo usa |
| `shared/ui/` | 2+ features lo usan |
| `app/layout/` | Todo el layout global |

`model.ts` y `logic.ts` dentro de un feature solo se crean si tienen contenido real; nunca vacíos.
