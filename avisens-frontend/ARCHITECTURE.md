# Screaming Architecture — Contexto de Proyecto

Este archivo define la arquitectura que debe seguir TODO el código generado.
Lee esto antes de crear, modificar o mover cualquier archivo.

---

## Principio Fundamental

> "La estructura de carpetas debe gritar de QUÉ trata la aplicación, no de QUÉ tecnología usa."

---

## Stack Tecnológico

- React 19 + TypeScript (estricto)
- Vite (build tool)
- React Router DOM 7+
- CSS Vanilla (NO Tailwind, NO Bootstrap, NO CSS-in-JS)
- ESLint + typescript-eslint

---

## Las 3 Capas

### 1. `features/` — Lo que la app HACE
Cada carpeta es un módulo de negocio independiente. Si borras uno, el resto sigue funcionando.

```
features/[nombre]/
├── [Nombre]Page.tsx       ← OBLIGATORIO
├── [Nombre]Page.css       ← Si tiene estilos propios
├── components/            ← UI SOLO de este feature (co-located .tsx + .css)
├── services/              ← Llamadas API (solo si conecta con backend)
├── model.ts               ← Tipos únicos (NO crear vacío)
└── logic.ts               ← Hooks/funciones únicas (NO crear vacío)
```

**Reglas:**
- Componentes reciben datos por props (no importar datos directamente).
- Cada componente en su propia carpeta con `.tsx` y `.css`.
- NO crear model.ts/logic.ts vacíos.
- Cada feature es AUTÓNOMO.

### 2. `shared/` — Lo que la app COMPARTE (2+ features)

```
shared/
├── ui/                    ← Componentes reutilizables (Boton, Modal, PageHeader...)
├── styles/index.css       ← Variables CSS globales, reset, animaciones
├── hooks/                 ← Hooks reutilizables
├── types/                 ← Tipos globales + index.ts (barrel exports)
├── constants/             ← Configuración general
├── utils/                 ← Funciones puras (formatearMoneda, validarEmail)
├── data/                  ← Mock data (temporal)
└── services/              ← Configuración de cliente HTTP
```

**Regla de oro:** Si algo se usa en 2+ features, va aquí. Si solo un feature lo usa, va en `features/[nombre]/`.

**Reglas CSS:**
- `shared/styles/index.css` solo variables globales, reset, animaciones, clases utilitarias genéricas.
- NUNCA incluir estilos específicos de features aquí.

### 3. `app/` — Cómo la app FUNCIONA (infraestructura)

```
app/
├── layout/
│   ├── AppLayout.tsx      ← Sidebar + Outlet + Footer
│   ├── Sidebar/
│   └── Footer/
├── routes.tsx             ← Definición de rutas
├── App.tsx                ← Wrapper simple
├── App.css                ← SOLO estilos de layout (.app-layout, .app-content, .app-main)
├── store.ts               ← Estado global (cuando sea necesario)
└── main.tsx               ← Punto de entrada
```

**Reglas críticas:**
- `App.css` SOLO infraestructura. NUNCA clases de negocio (`.dashboard-*`, `.productos-*`).
- `main.tsx` importa sin extensión: `import App from './App'`.
- NO hay lógica de negocio aquí.

---

## Reglas de Componentes

| Uso | Ubicación | Ejemplo |
|-----|-----------|---------|
| 1 feature | `features/[nombre]/components/` | `features/pedidos/components/ListaPedidos/` |
| 2+ features | `shared/ui/` | `shared/ui/PageHeader/`, `shared/ui/Boton/` |
| Todo (layout) | `app/layout/` | `app/layout/Sidebar/` |

**PageHeader reutilizable:** Todas las páginas usan `shared/ui/PageHeader/`.

---

## Reglas de Lógica/Utilidades

| Uso | Tipo | Ubicación |
|-----|------|-----------|
| 1 feature | Función pura | `features/[nombre]/logic.ts` |
| 1 feature | Hook | `features/[nombre]/logic.ts` |
| 2+ features | Función pura | `shared/utils/` |
| 2+ features | Hook | `shared/hooks/` |

**NUNCA duplicar lógica.** Centralizar en `shared/utils/` o `shared/hooks/`.

---

## Reglas de Estilos CSS

1. CSS Vanilla obligatorio. Sin frameworks.
2. Co-located: cada componente tiene su `.css` al lado del `.tsx`.
3. Variables globales en `shared/styles/index.css`.
4. Estilos de cada feature en `[Feature]Page.css`.
5. NO mezclar estilos de negocio en `app/App.css`.
6. NO duplicar clases CSS entre features. Usar componentes reutilizables.

---

## Reglas de Imports

- **Path aliases:** `@app`, `@features`, `@shared`
- **SIN extensión .tsx:** `import App from './App'`
- **Type imports:** `import type { Pedido } from '@shared/types'`
- **NO importar features desde shared/**
- **NO importar features desde otros features**

---

## Checklist de Nuevo Feature

- [ ] Carpeta `features/[nombre]/`
- [ ] `[Nombre]Page.tsx`
- [ ] `[Nombre]Page.css` (si aplica)
- [ ] `components/` con `.tsx` + `.css` co-locados
- [ ] `model.ts` y `logic.ts` solo si tienen contenido real
- [ ] Usar `PageHeader` de `shared/ui/`
- [ ] Ruta en `app/routes.tsx`
- [ ] Link en `app/layout/Sidebar/Sidebar.tsx`

---

## Lo que NUNCA debe pasar

- ❌ `app/App.css` con estilos de negocio
- ❌ `shared/styles/index.css` con clases de features
- ❌ Archivos `model.ts` o `logic.ts` vacíos
- ❌ Documentación dentro de `src/` (va en `docs/`)
- ❌ Duplicar funciones de formato en múltiples componentes
- ❌ Hardcodear `<header className="dashboard-header">` en múltiples páginas
- ❌ Importar desde `features/` dentro de `shared/`

---

## Lo que SIEMPRE debe existir

- ✅ `app/routes.tsx`, `app/App.tsx`, `app/main.tsx`
- ✅ `shared/styles/index.css`
- ✅ `shared/types/index.ts`
- ✅ `shared/utils/formato.ts`
- ✅ Por cada feature: `features/[nombre]/[Nombre]Page.tsx`
