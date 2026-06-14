# Guía del proyecto — AVISENS Frontend

> **Para el equipo que continúa el desarrollo.** Este documento explica **qué se ha hecho, por qué está hecho así, cómo se conecta todo y cómo seguir** sin perderse. Léelo completo una vez antes de tocar código.

Si solo quieres la referencia rápida (comandos, stack, tabla de módulos), está en el [`README.md`](./README.md). Este documento es la explicación a fondo.

---

## 1. ¿Qué es esto y en qué punto está?

Es la **interfaz web** de AVISENS (plataforma de gestión avícola). Está en **Fase 1**: toda la UI funciona con **datos mock (hardcodeados)**, todavía **sin backend conectado**.

### Lo que YA está hecho ✅

| Parte | Estado | Dónde vive |
|-------|--------|-----------|
| **Landing pública** (`/`) | Completa: hero, features, precios, FAQ, etc. | `src/features/landing/` |
| **Login** (`/login`) | Pantalla completa (sin auth real todavía) | `src/features/login/` |
| **Dashboard** (`/dashboard`) | Completo: sidebar, topbar, métricas, chat, galpones | `src/features/dashboard/` |
| **Infraestructura base** | Rutas, layouts, aliases, tema, hooks compartidos | `src/app/` y `src/shared/` |

### Lo que FALTA por hacer 🚧

Estos módulos existen como **páginas placeholder** (solo un título). Aquí es donde el equipo continúa:

`/granjas` · `/monitoreo` · `/alertas` · `/inventario` · `/finanzas` · `/usuarios` · `/bitacora` · `/crm`

Cada uno es una carpeta en `src/features/` con un `[Nombre]Page.tsx` casi vacío, listo para llenarse. La sección [§8](#8-cómo-continuar-implementar-un-módulo-placeholder) explica el paso a paso.

---

## 2. La idea central: Screaming Architecture

El proyecto usa **Screaming Architecture** (arquitectura orientada al dominio). La frase que la resume:

> *"La estructura de carpetas debe **gritar de qué trata la app**, no de qué tecnología usa."*

En la práctica significa que al abrir `src/features/` ves `dashboard`, `granjas`, `alertas`, `finanzas`… — **el negocio**, no carpetas técnicas tipo `components/`, `pages/`, `services/` mezcladas globalmente.

### ¿Por qué se eligió así?

1. **Cada módulo es independiente.** La regla de oro: *si borras un feature, el resto sigue funcionando.* Esto permite que varias personas trabajen en módulos distintos sin pisarse.
2. **Todo lo de un feature está junto.** El `.tsx`, su `.css` y sus componentes viven en la misma carpeta. No hay que saltar entre 5 carpetas para entender una pantalla.
3. **Escala sin volverse caos.** Agregar un módulo nuevo = agregar una carpeta. No toca la estructura existente.

### Las 3 capas

```
src/
├── app/        ← INFRAESTRUCTURA: cómo arranca la app, rutas y layout global
├── features/   ← NEGOCIO: un módulo por dominio, independientes entre sí
└── shared/     ← COMPARTIDO: código que usan 2+ features
```

**Dirección de las dependencias (importante):**

```
features  ──puede usar──►  shared
   app    ──puede usar──►  features y shared

shared  NUNCA importa de features ni de app   (es la base, no conoce a nadie)
features NUNCA importa de OTRO feature         (si dos lo necesitan → va a shared)
```

Si alguna vez un feature necesita algo de otro feature, **esa es la señal** de que ese algo debe subir a `shared/`.

---

## 3. Cómo arranca la app (la cadena de arranque)

Cuando alguien abre la web, esto pasa en orden:

```
index.html                         (1) HTML base, tiene <div id="root">
   │
   └─► src/app/main.tsx            (2) punto de entrada: monta React en #root
          │                            e importa los estilos globales
          │
          └─► src/app/App.tsx      (3) envuelve todo en <BrowserRouter>
                 │                      (activa el enrutamiento)
                 │
                 └─► src/app/routes.tsx   (4) decide QUÉ página mostrar
                        │                      según la URL
                        │
                        └─► features/.../XxxPage.tsx   (5) la pantalla concreta
```

**En código real:**

- `main.tsx` → `createRoot(...).render(<App />)` + `import '@shared/styles/index.css'` (el tema global se carga una sola vez aquí).
- `App.tsx` → solo envuelve `<AppRoutes />` en `<BrowserRouter>`.
- `routes.tsx` → el "tablero de control" de toda la navegación.

---

## 4. Cómo funcionan las rutas (la parte que más confunde)

Todo el enrutamiento vive en **un solo archivo**: [`src/app/routes.tsx`](./src/app/routes.tsx). Hay **3 grupos de rutas a propósito**, y entender por qué es clave:

```tsx
<Routes>
  {/* GRUPO 1 — standalone, SIN layout */}
  <Route path="/login" element={<LoginPage />} />

  {/* GRUPO 2 — landing pública, CON layout global (Navbar + Footer + Chat) */}
  <Route element={<AppLayout />}>
    <Route path="/" element={<LandingPage />} />
  </Route>

  {/* GRUPO 3 — app interna, SIN AppLayout (cada página trae su propio layout) */}
  <Route path="/dashboard" element={<DashboardPage />} />
  <Route path="/granjas"   element={<GranjasPage />} />
  {/* ...resto de módulos... */}
</Routes>
```

### ¿Por qué 3 grupos y no uno solo?

Porque **no todas las pantallas comparten el mismo marco visual**:

| Grupo | Ejemplo | Marco visual | Razón |
|-------|---------|--------------|-------|
| **1. Standalone** | `/login` | Ninguno | El login es pantalla completa, sin navbar ni footer. |
| **2. Con AppLayout** | `/` (landing) | Navbar + Footer + FloatChat | La web pública comparte ese marco en todas sus secciones. |
| **3. App interna** | `/dashboard`, `/granjas`… | El suyo propio | El dashboard tiene **su propio** sidebar + topbar; no quiere el navbar público. |

### Cómo funciona el `AppLayout` (Grupo 2)

`AppLayout` usa el patrón **layout anidado** de React Router con `<Outlet />`:

```tsx
// src/app/layout/AppLayout.tsx
function AppLayout() {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="app-main">
        <Outlet />   {/* ◄── aquí se inyecta la página hija (ej: LandingPage) */}
      </main>
      <Footer />
      <FloatChat />
    </div>
  )
}
```

`<Outlet />` es "el hueco" donde React Router mete la página que coincide con la URL. Por eso la landing aparece **dentro** del navbar/footer sin tener que importarlos ella misma.

> 🔑 **Regla práctica:** un módulo nuevo del Grupo 3 (ej: `/granjas`) **NO** va dentro de `<AppLayout>`. Va suelto, como `/dashboard`. Si quieres que comparta el sidebar del dashboard, ese sidebar tendría que extraerse a un layout reutilizable (ver [§8](#8-cómo-continuar-implementar-un-módulo-placeholder)).

---

## 5. Anatomía de un feature

Cada módulo en `features/` sigue siempre la misma forma:

```
features/[nombre]/
├── [Nombre]Page.tsx     ← el componente página (lo que se importa en routes.tsx)
├── [Nombre]Page.css     ← sus estilos
├── components/          ← sub-componentes que SOLO usa este feature
└── model.ts             ← (opcional) datos mock y tipos del feature
```

### Ejemplo MÍNIMO — un placeholder (`features/alertas/`)

```tsx
// AlertasPage.tsx — así están hoy los módulos por hacer
import './AlertasPage.css'

function AlertasPage() {
  return (
    <div className="page-container">
      <h1>Alertas Inteligentes</h1>
    </div>
  )
}
export default AlertasPage
```

### Ejemplo COMPLETO — el dashboard (`features/dashboard/`)

El dashboard es la referencia de cómo se ve un feature "terminado". Su `DashboardPage.tsx`:

- Maneja su estado con `useState` (galpón activo, sidebar colapsado, chat abierto…).
- Compone sub-componentes propios: `Sidebar`, `Topbar`, `MetricsHub`, `GalponStrip`, `AttentionBar`, `ChatPanel`, etc. (todos en `dashboard/components/`).
- Lee sus **datos mock** desde `dashboard/model.ts` (`GALPONES`, `GRANJAS`, etc.).
- Trae **su propio layout** (sidebar + topbar) → por eso no usa `AppLayout`.

```
features/dashboard/
├── DashboardPage.tsx        ← orquesta todo
├── DashboardPage.css
├── model.ts                 ← datos mock + tipos (GALPONES, GRANJAS, MetricId…)
└── components/
    ├── Sidebar/             ├── MetricsHub/        ├── charts/
    ├── Topbar/              ├── GalponStrip/       ├── chat/
    ├── AttentionBar/        ├── ContextHeader/     ├── icons/
    ├── BottomRow/           ├── CoopPlaceholder/   └── primitives/
    └── EstadoLoteCard/
```

> Cuando implementes un módulo nuevo, **copia este patrón**: página que orquesta + componentes en `components/` + datos en `model.ts`.

---

## 6. La capa `shared/` (lo reutilizable)

Aquí vive lo que usan varios features. **No le agregues cosas de un solo módulo.**

```
shared/
├── styles/index.css     ← ⭐ el tema global: variables CSS, reset, animaciones, utilidades
├── types/index.ts       ← interfaces compartidas (Galpon, ChatMessage, Plan, FaqItem…)
├── hooks/
│   ├── useFadeUp.ts        ← anima elementos al hacer scroll (necesita clase .fade-up)
│   ├── useDismissable.ts   ← cerrar menús/popovers al click afuera
│   └── usePauseOnHidden.ts ← pausa animaciones cuando la pestaña no está visible
├── ui/Ic/Ic.tsx         ← componente de ícono SVG genérico (recibe `d` y `size`)
└── utils/formato.ts     ← formatCurrency / formatNumber (locale es-CO)
```

### El tema (`shared/styles/index.css`)

Es **dark exclusivamente**. Las variables clave:

- `--bg: #0a1612` (fondo) · `--success: #10b981` (color de acento)

Siempre usa las variables CSS del tema, no colores hardcodeados, para que todo se vea consistente.

---

## 7. Convenciones (síguelas para que el repo no se ensucie)

### Path aliases — usa SIEMPRE, nunca `../../`

Configurados en `vite.config.ts` y `tsconfig.app.json`:

| Alias | Apunta a |
|-------|----------|
| `@app` | `src/app/` |
| `@features` | `src/features/` |
| `@shared` | `src/shared/` |

```tsx
import { formatCurrency } from '@shared/utils/formato'   // ✅ bien
import { formatCurrency } from '../../../shared/utils/formato'  // ❌ mal
```

### ¿Dónde pongo un componente nuevo?

| Si… | Va en… |
|-----|--------|
| solo lo usa **un** feature | `features/[nombre]/components/` |
| lo usan **2+** features | `shared/ui/` |
| es parte del marco global (navbar/footer) | `app/layout/` |

### CSS

- **Solo CSS Vanilla.** Nada de Tailwind ni CSS-in-JS.
- Cada componente tiene su `.css` al lado de su `.tsx` (co-located).
- Estilos de negocio → en el `.css` del feature. Solo lo global va en `shared/styles/`.

### TypeScript

- Modo estricto: hay `noUnusedLocals` y `noUnusedParameters`, así que **variables/imports sin usar rompen el build**.
- Importa tipos con `import type { ... }`.
- En imports **no** pongas la extensión: `import Foo from './Foo'` (no `'./Foo.tsx'`).

---

## 8. Cómo continuar: implementar un módulo placeholder

Ejemplo: te toca construir **`/granjas`**. Pasos:

1. **Ubica la carpeta** ya existente: `src/features/granjas/` (tiene `GranjasPage.tsx` + `GranjasPage.css`).

2. **Decide los datos.** Mientras no haya backend, crea `granjas/model.ts` con datos mock y sus tipos:
   ```ts
   export interface Granja { id: number; nombre: string; galpones: number }
   export const GRANJAS_MOCK: Granja[] = [ /* ... */ ]
   ```

3. **Construye la UI** en `GranjasPage.tsx`, partiendo sub-piezas en `granjas/components/` (mira `dashboard/` como referencia de cómo se organiza).

4. **Estilos** en `GranjasPage.css` (y un `.css` por componente). Usa las variables del tema de `shared/styles/index.css`.

5. **Reutiliza shared**: íconos con `@shared/ui/Ic`, formato con `@shared/utils/formato`, hooks si aplican.

6. **¿Necesitas el sidebar/topbar del dashboard en tu módulo?** Hoy ese layout vive *dentro* de `features/dashboard/`. Si varios módulos de la app interna deben compartirlo, lo correcto es **extraer ese layout a un componente reutilizable** (ej. `app/layout/DashboardLayout.tsx`) y envolver las rutas del Grupo 3 con él — igual que se hace con `AppLayout` en la landing. Coordínalo con el equipo antes, porque toca `routes.tsx`.

7. **La ruta ya existe** en `routes.tsx` (todos los módulos ya están enrutados). Solo si agregas un módulo totalmente nuevo tendrías que añadir su `<Route>`.

### Checklist antes de cada commit

```bash
npx tsc --noEmit   # no debe haber errores de tipos
npm run lint       # no debe haber errores de ESLint
npm run dev        # revisa visualmente que tu pantalla funciona
```

---

## 9. Mapa mental rápido (resumen de todo)

```
Navegador abre la URL
        │
   index.html → main.tsx → App.tsx (BrowserRouter) → routes.tsx
        │
        ├── "/login"      → LoginPage            (sin layout)
        ├── "/"           → AppLayout > LandingPage   (navbar + footer + chat)
        └── "/dashboard"  → DashboardPage         (su propio sidebar + topbar)
            "/granjas"    → GranjasPage  🚧
            "/alertas"    → AlertasPage  🚧   ◄── AQUÍ CONTINÚA EL EQUIPO
            ...

Cada Page vive en  features/[modulo]/
   usa componentes propios de   features/[modulo]/components/
   y código común de            shared/  (hooks, ui, utils, tipos, tema)
```

**Si te pierdes, empieza por `src/app/routes.tsx`**: desde ahí puedes rastrear cualquier pantalla hasta su feature.
