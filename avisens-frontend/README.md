# AVISENS — Frontend

Interfaz web del sistema AVISENS. Panel de control para monitoreo de sensores IoT, alertas, granjas, inventario y finanzas.

> **Estado:** En desarrollo — Fase 1 (datos mock, sin backend conectado).

> 📖 **¿Nuevo en el proyecto?** Lee la [**Guía del proyecto (GUIA.md)**](./GUIA.md): explica a fondo qué se ha hecho, por qué está hecho así, cómo funcionan las rutas y cómo continuar.

---

## Stack

- **Framework:** React 19
- **Lenguaje:** TypeScript (modo estricto)
- **Build tool:** Vite 6
- **Routing:** React Router DOM v7
- **Estilos:** CSS Vanilla (sin Tailwind, sin CSS-in-JS)
- **Gestor de paquetes:** **npm** (no usar pnpm ni yarn)

---

## Cómo correr el proyecto

> ⚠️ Este proyecto usa **npm**. El lockfile válido es `package-lock.json`. No uses pnpm ni yarn para no generar lockfiles cruzados.

```bash
npm install       # instalar dependencias
npm run dev       # servidor de desarrollo en http://localhost:5173
```

### Otros comandos

```bash
npm run build     # tsc -b && vite build (compilar para producción)
npm run lint      # ESLint
npm run preview   # previsualizar el build de producción
npx tsc --noEmit  # type-check sin compilar (correr antes de cada commit)
```

No hay tests configurados todavía.

---

## Arquitectura — Screaming Architecture

La estructura de carpetas **grita de qué trata la app, no de qué tecnología usa**. Está organizada en 3 capas.

**Regla de oro:** si borras un feature, el resto sigue funcionando.

```
src/
├── app/        ← infraestructura pura (rutas, layout, punto de entrada)
├── features/   ← módulos de negocio independientes
└── shared/     ← código que usan 2+ features
```

### `app/` — infraestructura

- `routes.tsx` — define 3 grupos de rutas:
  - `/login` → standalone, sin layout
  - `/` → bajo `AppLayout` (Navbar + Footer + FloatChat) — solo la landing pública
  - `/dashboard` y demás rutas de app → sin `AppLayout` (cada una trae su propio layout)
- `layout/` — `Navbar`, `Footer`, `FloatChat` (layout global de la landing)

### `features/` — módulos de negocio

Cada feature es autocontenido y tiene:

```
features/[nombre]/
├── [Nombre]Page.tsx     ← página principal
├── [Nombre]Page.css     ← estilos de la página
└── components/          ← componentes propios del feature
```

`model.ts` y `logic.ts` se crean dentro de un feature **solo si tienen contenido real**; nunca vacíos.

### `shared/` — código compartido

- `styles/index.css` — variables CSS globales (tema oscuro), reset, keyframes, utilidades (`.fade-up`, `.grad-text`, `.bg-layer`, `.grid-layer`)
- `types/index.ts` — interfaces globales (barrel exports)
- `hooks/useFadeUp.ts` — `IntersectionObserver` que agrega `.visible`; requiere clase `.fade-up` en el elemento
- `utils/formato.ts` — `formatCurrency`, `formatNumber` (locale `es-CO`)
- `ui/Ic/Ic.tsx` — componente SVG icon genérico (recibe `d` y `size`)

---

## Path Aliases

Configurados en `vite.config.ts` y `tsconfig.app.json`. **Usar siempre aliases**, nunca rutas relativas que atraviesen capas (`../../`).

| Alias        | Resuelve a      |
|--------------|-----------------|
| `@app`       | `src/app/`      |
| `@features`  | `src/features/` |
| `@shared`    | `src/shared/`   |

---

## Convenciones

### ¿Dónde va un componente nuevo?

| Ubicación                       | Cuándo usarla                |
|---------------------------------|------------------------------|
| `features/[nombre]/components/` | Solo ese feature lo usa      |
| `shared/ui/`                    | 2+ features lo usan          |
| `app/layout/`                   | Es parte del layout global   |

### CSS

- **Solo CSS Vanilla.** Sin Tailwind, sin CSS-in-JS.
- Cada componente tiene su `.css` co-located al lado del `.tsx`.
- Las variables del tema viven en `shared/styles/index.css`. El tema es **dark exclusivamente** (`--bg: #0a1612`, acento `--success: #10b981`).
- Estilos de negocio van en el `.css` del feature, no en los globales.
- `.bg-layer` y `.grid-layer` son `position: fixed; z-index: 0` — para el fondo con gradiente + grid en páginas standalone (landing, login).

### TypeScript

- Modo estricto con `noUnusedLocals` y `noUnusedParameters` activos.
- Importar tipos con `import type`.
- No usar la extensión en imports: `import Foo from './Foo'`, no `'./Foo.tsx'`.

---

## Módulos

| Ruta          | Descripción                              | Estado          |
|---------------|------------------------------------------|-----------------|
| `/`           | Landing pública                          | ✅ Implementado |
| `/login`      | Autenticación                            | ✅ Implementado |
| `/dashboard`  | Panel principal con resumen del sistema  | ✅ Implementado |
| `/granjas`    | Gestión de granjas y galpones            | 🚧 Placeholder  |
| `/monitoreo`  | Datos en tiempo real de sensores         | 🚧 Placeholder  |
| `/alertas`    | Alertas y notificaciones                 | 🚧 Placeholder  |
| `/inventario` | Stock de insumos                         | 🚧 Placeholder  |
| `/finanzas`   | Ingresos y egresos                       | 🚧 Placeholder  |
| `/usuarios`   | Gestión de roles y permisos              | 🚧 Placeholder  |
| `/bitacora`   | Registro de actividad                    | 🚧 Placeholder  |
| `/crm`        | Gestión de clientes                      | 🚧 Placeholder  |

> Los módulos en 🚧 son páginas placeholder listas para implementarse siguiendo la estructura de feature descrita arriba.

---

## Datos

Actualmente todo es **mock data hardcodeada** dentro de los componentes (Fase 1). Cuando haya backend:

- Los servicios de cada feature irán en `features/[nombre]/services/`.
- La configuración del cliente HTTP irá en `shared/services/`.
