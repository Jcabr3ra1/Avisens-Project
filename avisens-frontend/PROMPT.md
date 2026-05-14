# Screaming Architecture — Prompt Maestro

> Copia TODO el contenido de abajo (desde "```markdown" hasta el final) y pégalo en cualquier IA.
> Incluye las correcciones y lecciones aprendidas de proyectos reales.

---

## Prompt Listo para Copiar y Pegar

```markdown
# MANDATO ARQUITECTÓNICO

Vas a crear un proyecto React 19 + TypeScript + Vite que siga **Screaming Architecture** (arquitectura orientada al dominio/feature). 

> "La estructura de carpetas debe gritar de QUÉ trata la aplicación, no de QUÉ tecnología usa."

---

## STACK TECNOLÓGICO (Inmutable)

| Tecnología | Versión | Uso |
|------------|---------|-----|
| React | 19+ | UI |
| TypeScript | ~6.0 | Tipado estricto |
| Vite | 8+ | Build tool |
| React Router DOM | 7+ | Rutas |
| ESLint + typescript-eslint | 10+ | Linting |
| CSS Vanilla | — | Estilos (NO Tailwind, NO Bootstrap, NO CSS-in-JS) |

**NO usar:** Tailwind, Styled Components, Emotion, Material UI, Chakra UI, Bootstrap.

---

## ESTRUCTURA DE 3 CAPAS

Todas las carpetas dentro de `src/` deben gritar el negocio:

### CAPA 1: `features/` — Lo que la app HACE (módulos de negocio)

Cada carpeta es un "departamento" independiente. **Regla de oro: si borras un feature, el resto sigue funcionando.**

```
src/features/
├── [feature-name]/
│   ├── [Nombre]Page.tsx       ← Entry point OBLIGATORIO
│   ├── [Nombre]Page.css       ← Estilos de la página (co-locados)
│   ├── components/            ← UI específica SOLO de este feature
│   │   └── ComponenteX/
│   │       ├── ComponenteX.tsx
│   │       └── ComponenteX.css
│   ├── services/              ← Llamadas a API (solo si conecta con backend)
│   │   └── featureService.ts
│   ├── model.ts               ← Tipos únicos del feature (NO crear vacío)
│   └── logic.ts               ← Hooks/funciones únicas del feature (NO crear vacío)
```

**REGLAS ESTRICTAS DE `features/`:**
1. `[Nombre]Page.tsx` es obligatorio para cada feature.
2. `[Nombre]Page.css` debe existir si la página tiene estilos propios.
3. Los componentes en `components/` deben recibir datos por **props** (no importar datos directamente).
4. Cada componente vive en su propia carpeta con `.tsx` y `.css` co-locados.
5. `model.ts` y `logic.ts`: **NO CREAR si están vacíos.** Solo crearlos cuando haya contenido real.
6. Cada feature es AUTÓNOMO: no importa de otros features.

---

### CAPA 2: `shared/` — Lo que la app COMPARTE (2+ features lo usan)

**Regla de oro:** Si algo se usa en 2 o más features, va aquí. Si solo un feature lo usa, va en `features/[nombre]/`.

```
src/shared/
├── ui/                        ← Componentes UI genéricos reutilizables
│   └── Componente/
│       ├── Componente.tsx
│       └── Componente.css
├── styles/
│   └── index.css              ← Variables CSS globales, reset, animaciones, utilitarios
├── hooks/                     ← Hooks reutilizables entre features
├── types/                     ← Tipos globales TypeScript
│   ├── Producto.ts
│   ├── Pedido.ts
│   └── index.ts               ← Barrel exports (re-exporta todos)
├── constants/                 ← Constantes y configuración general
├── utils/                     ← Funciones utilitarias puras (formatearMoneda, validarEmail, etc.)
├── data/                      ← Mock data (temporal hasta tener API)
└── services/                  ← Configuración de cliente HTTP (axios/fetch)
```

**REGLAS ESTRICTAS DE `shared/`:**
1. `shared/ui/`: componentes puramente presentacionales. Sin lógica de negocio.
2. `shared/styles/index.css`: variables CSS, reset, animaciones globales, clases utilitarias genéricas (`.muted-copy`, `.modal-actions`). **NO** incluir estilos específicos de ningún feature.
3. `shared/utils/`: funciones puras que NO dependen de React. Si necesitan estado/hooks, van en `shared/hooks/`.
4. `shared/types/index.ts`: debe hacer barrel exports de todos los tipos.
5. **NUNCA** importar desde `features/` desde `shared/`.

---

### CAPA 3: `app/` — Cómo la app FUNCIONA (infraestructura pura)

Aquí NO hay lógica de negocio. Solo "cables" que conectan todo.

```
src/app/
├── layout/
│   ├── AppLayout.tsx          ← Sidebar + <Outlet /> + Footer
│   ├── Sidebar/
│   │   ├── Sidebar.tsx
│   │   └── Sidebar.css
│   └── Footer/
│       ├── Footer.tsx
│       └── Footer.css
├── routes.tsx                 ← Definición de rutas con React Router
├── App.tsx                    ← Wrapper principal (muy simple)
├── App.css                    ← SOLO estilos de infraestructura (layout)
├── store.ts                   ← Estado global (cuando se necesite)
└── main.tsx                   ← Punto de entrada
```

**REGLAS ESTRICTAS DE `app/`:**
1. `App.css` **SOLO** contiene estilos de infraestructura: `.app-layout`, `.app-content`, `.app-main`, `.app-footer`. **NUNCA** incluir clases como `.dashboard-*`, `.productos-*`, etc.
2. `AppLayout.tsx` usa `<Outlet />` de React Router para renderizar páginas dentro del layout común.
3. `routes.tsx` importa páginas desde `features/` y las anida bajo `AppLayout`.
4. `main.tsx` importa `App` **sin extensión**: `import App from './App'` (NO `import App from './App.tsx'`).

---

## REGLAS DE ESTILOS CSS (Crítico)

1. **CSS Vanilla obligatorio.** Sin frameworks CSS.
2. **Co-located CSS:** cada componente tiene su archivo `.css` al lado del `.tsx`.
3. **Variables CSS globales** en `shared/styles/index.css`:
   - `--color-*`, `--font-*`, `--shadow-*`, `--radius-*`, `--transition-*`
   - Reset CSS básico
   - Animaciones globales (`@keyframes`)
   - Clases utilitarias genéricas: `.muted-copy`, `.modal-actions`, `.form-field-fake`
4. **NO mezclar estilos de negocio en `app/App.css`.** Los estilos de cada feature van en su propio `[Feature]Page.css`.
5. **NO duplicar clases CSS entre features.** Si un patrón se repite (ej: header de página), crear un componente reutilizable en `shared/ui/`.

---

## REGLAS DE COMPONENTES (Crítico)

| Si se usa en... | Va en... | Ejemplo |
|----------------|----------|---------|
| **Un solo feature** | `features/[nombre]/components/` | `features/pedidos/components/ListaPedidos/` |
| **Dos o más features** | `shared/ui/` | `shared/ui/PageHeader/`, `shared/ui/Boton/`, `shared/ui/Modal/` |
| **Toda la app** (layout) | `app/layout/` | `app/layout/Sidebar/`, `app/layout/Footer/` |

**Patrón PageHeader reutilizable:**
Todas las páginas usan un header consistente. Por eso se crea `shared/ui/PageHeader/`:

```tsx
// shared/ui/PageHeader/PageHeader.tsx
interface PageHeaderProps {
  titulo: string
  subtitulo?: string
  extra?: ReactNode    // fecha, badge, etc.
  children?: ReactNode // botones de acción
}
```

**NUNCA** hardcodear un `<header className="dashboard-header">` en múltiples páginas. Eso crea acoplamiento oculto por CSS.

---

## REGLAS DE TIPOS Y DATOS

### Tipos (shared/types/)
- Interfaces planas: solo describen la FORMA de los datos.
- `shared/types/index.ts` debe hacer barrel exports.
- Tipos usados por 2+ features van en `shared/types/`.
- Tipos usados por 1 solo feature pueden ir en `features/[nombre]/model.ts`.

### Datos (Fases de evolución)

**Fase 1 — Mock Data (Ahora):**
```ts
// shared/data/ventas.ts
export const pedidos = [
  { id: 1, cliente: 'Ana', total: 2500000, estado: 'entregado' }
]
```

**Fase 2 — API Client (Cuando haya backend):**
```ts
// shared/services/api.ts
import axios from 'axios'
export const api = axios.create({ baseURL: 'http://localhost:3000/api' })
```

**Fase 3 — Services por Feature:**
```ts
// features/pedidos/services/pedidoService.ts
import { api } from '../../../shared/services/api'
export async function listarPedidos() {
  const { data } = await api.get('/pedidos')
  return data
}
```

**Fase 4 — Uso en Componentes:**
```tsx
// features/pedidos/PedidosPage.tsx
import { listarPedidos } from './services/pedidoService'
function PedidosPage() {
  const [pedidos, setPedidos] = useState([])
  useEffect(() => { listarPedidos().then(setPedidos) }, [])
  return <ListaPedidos pedidos={pedidos} />
}
```

---

## REGLAS DE IMPORTS Y PATH ALIASES

### Path Aliases (configurados en vite.config.ts y tsconfig.app.json)

```ts
// vite.config.ts
resolve: {
  alias: {
    '@app': path.resolve(__dirname, './src/app'),
    '@features': path.resolve(__dirname, './src/features'),
    '@shared': path.resolve(__dirname, './src/shared'),
  }
}
```

**Usar aliases siempre que sea posible:**
- ✅ `import { Boton } from '@shared/ui/Boton/Boton'`
- ✅ `import { formatearMoneda } from '@shared/utils/formato'`
- ❌ `import { Boton } from '../../../../shared/ui/Boton/Boton'`

### Reglas de imports
- **SIN extensión `.tsx`**: `import App from './App'` (NO `import App from './App.tsx'`)
- **Type imports**: `import type { Pedido } from '@shared/types'`
- **NO importar features desde shared/**
- **NO importar otros features desde un feature**

---

## REGLAS DE LÓGICA Y UTILIDADES

| Si se usa en... | Tipo | Va en... | Ejemplo |
|----------------|------|----------|---------|
| **Un solo feature** | Función pura | `features/[nombre]/logic.ts` | `calcularDescuentoPedido()` |
| **Un solo feature** | Hook | `features/[nombre]/logic.ts` | `useFiltroPedidos()` |
| **Dos o más features** | Función pura | `shared/utils/` | `formatearMoneda()`, `validarEmail()` |
| **Dos o más features** | Hook | `shared/hooks/` | `useDebounce()`, `useMetricasVentas()` |

**NUNCA duplicar lógica.** Si `ListaPedidos` y `Dashboard` necesitan formatear moneda, ambos importan `formatearMoneda` desde `shared/utils/formato.ts`.

---

## CHECKLIST PARA NUEVOS FEATURES

Cuando agregues un feature nuevo, verificar:
- [ ] Crear carpeta `features/[nombre-feature]/`
- [ ] Crear `[NombreFeature]Page.tsx`
- [ ] Crear `[NombreFeature]Page.css` si tiene estilos propios
- [ ] Si tiene componentes locales, crear `components/` con `.tsx` + `.css` co-locados
- [ ] Si necesita tipos únicos, crear `model.ts` (NO vacío)
- [ ] Si necesita lógica única, crear `logic.ts` (NO vacío)
- [ ] Si conecta con API, crear `services/`
- [ ] Usar `PageHeader` de `shared/ui/` para el encabezado
- [ ] Agregar ruta en `app/routes.tsx`
- [ ] Agregar link en `app/layout/Sidebar/Sidebar.tsx`

---

## PREGUNTAS FRECUENTES (Decisiones de Arquitectura)

**¿Dónde pongo un componente que usa 2 features?**
→ `shared/ui/`

**¿Dónde pongo una función que usa 2 features?**
→ `shared/utils/` (si es pura) o `shared/hooks/` (si usa React)

**¿Dónde pongo los datos de prueba?**
→ `shared/data/` (mientras no haya backend)

**¿Qué pasa si borro un feature?**
→ El resto de la app sigue funcionando. Cada feature es independiente.

**¿Necesito crear model.ts y logic.ts si están vacíos?**
→ **NO.** Solo crearlos cuando haya contenido real.

**¿Puedo usar contexto global?**
→ Props drilling permitido. Evitar Context/Redux/Zustand hasta que sea absolutamente necesario.

**¿Dónde pongo la documentación?**
→ Carpeta `docs/` en la raíz del proyecto. NUNCA dentro de `src/shared/`.

---

## EJEMPLO COMPLETO DE FEATURE

Feature: `pedidos`

### Estructura:
```
src/features/pedidos/
├── PedidosPage.tsx
├── PedidosPage.css
├── components/
│   └── ListaPedidos/
│       ├── ListaPedidos.tsx
│       └── ListaPedidos.css
└── services/
    └── pedidoService.ts   ← solo cuando haya backend
```

### PedidosPage.tsx:
```tsx
import PageHeader from '@shared/ui/PageHeader/PageHeader'
import { Boton } from '@shared/ui/Boton/Boton'
import ListaPedidos from './components/ListaPedidos/ListaPedidos'
import { pedidos } from '@shared/data/ventas'
import './PedidosPage.css'

function PedidosPage() {
  return (
    <div className="page-container">
      <PageHeader titulo="Pedidos" subtitulo={`${pedidos.length} pedidos`}>
        <Boton variant="primario">Nuevo Pedido</Boton>
      </PageHeader>
      <ListaPedidos pedidos={pedidos} />
    </div>
  )
}
export default PedidosPage
```

### ListaPedidos.tsx:
```tsx
import type { Pedido } from '@shared/types'
import { formatearMoneda, formatearEstado } from '@shared/utils/formato'
import './ListaPedidos.css'

interface ListaPedidosProps {
  pedidos: Pedido[]
}

function ListaPedidos({ pedidos }: ListaPedidosProps) {
  return (
    <ul>
      {pedidos.map((pedido) => (
        <li key={pedido.id}>
          <span>{pedido.cliente}</span>
          <span>{formatearMoneda(pedido.total)}</span>
          <span>{formatearEstado(pedido.estado)}</span>
        </li>
      ))}
    </ul>
  )
}
export default ListaPedidos
```

---

## ARCHIVOS QUE NUNCA DEBEN EXISTIR

- ❌ `src/shared/models/` — documentación de modelos va en `docs/`
- ❌ `src/shared/ui/README.md` o `.md` — documentación va en `docs/`
- ❌ `features/*/model.ts` vacío
- ❌ `features/*/logic.ts` vacío
- ❌ `app/App.css` con clases de negocio (`.dashboard-*`, `.productos-*`)
- ❌ `shared/styles/index.css` con clases específicas de features

---

## ARCHIVOS QUE SIEMPRE DEBEN EXISTIR

- ✅ `src/app/routes.tsx`
- ✅ `src/app/App.tsx`
- ✅ `src/app/main.tsx`
- ✅ `src/shared/styles/index.css`
- ✅ `src/shared/types/index.ts`
- ✅ `src/shared/utils/formato.ts`
- ✅ Por cada feature: `features/[nombre]/[Nombre]Page.tsx`

---

# MANDATO FINAL

Genera el proyecto completo con la siguiente descripción de dominio:

[DESCRIBE AQUÍ TU NUEVO PROYECTO]
```

---

## ¿Cómo Usar?

1. **Copia** TODO el bloque grande de arriba (desde `# MANDATO ARQUITECTÓNICO` hasta `[DESCRIBE AQUÍ TU NUEVO PROYECTO]`).
2. **Pégalo** en ChatGPT, Claude, Cursor, Copilot, etc.
3. **Reemplaza** la última línea con tu descripción.
4. **Ejecuta.**

---

## Ejemplo de Descripción

```
Es un dashboard de inventario para una ferretería. Los features son:
- dashboard: resumen con KPIs de stock bajo, ventas del mes y productos más vendidos.
- productos: catálogo de herramientas, materiales y suministros con stock, precio y categoría.
- proveedores: gestión de proveedores, contacto y historial de compras.
- movimientos: entradas y salidas de inventario (ajustes, ventas, compras).
- alertas: notificaciones de stock crítico, vencimientos y pedidos pendientes.
```

---

*Versión 2.0 — Pulido con correcciones reales de producción*
