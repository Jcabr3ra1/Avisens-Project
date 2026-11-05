---
name: AVISENS
description: Sistema visual de AVISENS, valores observados y guía de uso para pantallas operativas.
colors:
  bosque: "#005b48"
  marfil: "#f7f6ef"
  salvia: "#c6d2bf"
  maiz: "#e3c565"
  tinta: "#203b32"
  blanco: "#ffffff"
  surface-page: "#f7f6ef"
  surface-base: "#ffffff"
  surface-raised: "#ffffff"
  surface-subtle: "#ebeae0"
  surface-tinted: "#f3f2e9"
  surface-hover: "#f0efe5"
  shell-bg: "#0d4537"
  border-subtle: "#e3e1d5"
  border-default: "#d0cfc1"
  border-strong: "#84977f"
  text-primary: "#203b32"
  text-secondary: "#435c50"
  text-muted: "#5a6e61"
  primary: "#005b48"
  primary-hover: "#004638"
  on-primary: "#ffffff"
  focus-ring: "#005b48"
  on-accent: "#203b32"
  login-field: "color-mix(in srgb, #f7f6ef 40%, #fff)"
  on-primary-muted: "#dce6d6"
  accent-soft: "#fbf4dc"
  success: "#276b4c"
  warning: "#866115"
  danger: "#b13d3d"
  danger-strong: "#983434"
  danger-soft: "#f9ece8"
  info: "#326678"
typography:
  body:
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    lineHeight: 1.5
  landing-headline:
    fontFamily: "Manrope, Inter, sans-serif"
    fontWeight: 650
    lineHeight: 1.05
    letterSpacing: "-0.04em"
  login-title:
    fontFamily: "'Avisens Manrope', sans-serif"
    fontSize: "2rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.04em"
  login-body:
    fontFamily: "'Avisens Manrope', sans-serif"
    fontSize: "0.9375rem"
    lineHeight: 1.6
  login-label:
    fontFamily: "'Avisens Manrope', sans-serif"
    fontSize: "0.875rem"
    fontWeight: 650
  login-control:
    fontFamily: "'Avisens Manrope', sans-serif"
    fontSize: "1rem"
    lineHeight: 1.5
  admin-title:
    fontSize: "clamp(1.5rem, 2vw, 1.75rem)"
    fontWeight: 750
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  admin-body:
    fontSize: "0.9rem"
    lineHeight: 1.5
  admin-metric:
    fontSize: "1.4rem"
    fontWeight: 780
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  confirmation-title:
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.3
  confirmation-body:
    fontSize: "0.9375rem"
    lineHeight: 1.65
  table-body:
    fontSize: "0.85rem"
  table-heading:
    fontSize: "0.68rem"
    fontWeight: 800
    letterSpacing: "0.07em"
rounded:
  sm: "6px"
  md: "9px"
  lg: "12px"
  xl: "16px"
  full: "999px"
  frame: "24px"
  login-panel: "20px"
  login-input: "14px"
spacing:
  space-1: "0.25rem"
  space-2: "0.5rem"
  space-3: "0.75rem"
  space-4: "1rem"
  space-5: "1.5rem"
  space-6: "2rem"
  space-7: "2.5rem"
  space-8: "3rem"
components:
  login-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
    padding: "14px 8px 14px 22px"
    typography: "{typography.login-control}"
  login-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  login-input:
    backgroundColor: "{colors.login-field}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.login-input}"
    padding: "12px 16px"
    typography: "{typography.login-control}"
  landing-maize:
    backgroundColor: "{colors.maiz}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.full}"
    padding: "0.85rem 1.4rem"
  login-panel:
    backgroundColor: "{colors.surface-page}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.login-panel}"
    padding: "32px"
    width: "100%"
  navigation-active:
    backgroundColor: "{colors.maiz}"
    textColor: "{colors.tinta}"
    rounded: "15px"
    padding: "7px 4px"
  confirmation:
    backgroundColor: "{colors.surface-base}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.xl}"
    width: "100%"
  admin-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: "0.55rem 0.95rem"
  admin-secondary:
    backgroundColor: "{colors.surface-base}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    padding: "0.55rem 0.95rem"
  admin-metric:
    backgroundColor: "{colors.surface-base}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "0.9rem 1rem"
    typography: "{typography.admin-metric}"
---

# Design System: AVISENS

## Overview

**Creative North Star: "Identidad AVISENS existente"**

AVISENS conserva bosque, marfil, salvia, maíz y tinta, y el símbolo aprobado de A con gallina integrada. La fotografía conecta el sitio público y el acceso con el trabajo avícola. La aplicación da prioridad a leer el estado del lote y registrar la jornada.

**Verificación de fuentes: 2026-10-18.** Este documento combina dos niveles explícitos:

- **Observado:** valores y comportamientos comprobados en el código local. El frontmatter contiene estos valores, con los colores resueltos para el tema claro; las variantes oscuras se registran en Colors. No acredita despliegue, cobertura de todas las pantallas ni usabilidad validada.
- **Guía de uso:** reglas para componer nuevas pantallas o revisar las existentes. Las mejoras que todavía requieren cambios de código se identifican como pendientes; no son componentes ni capacidades ya implementados.

El código vigente prevalece sobre capturas y briefs históricos. La composición fotográfica corresponde al acceso; la landing conserva sus escenas y el panel operativo tiene su propia densidad. No se adopta una nueva identidad ni se migra toda la aplicación a Manrope.

**Key Characteristics:**

- Variables semánticas para superficies, texto, acciones y estados, con variantes claras y oscuras.
- Inter como base; Manrope local en landing y marco de acceso.
- Navegación desde el padre: Granjas → Galpones → Lotes, según NAVEGACION.md y permisos por rol.
- Componentes compartidos de gestión; controles con foco y estados textuales.
- Diseño orientado al teléfono del operario y al seguimiento del propietario en móvil y escritorio.

## Colors

### Primary

Bosque identifica acciones y navegación. En tema claro `--primary` es `#005b48` y hover `#004638`; sobre la acción se usa `--on-primary`. En el riel de escritorio la entrada activa usa maíz y texto tinta, no el relleno bosque de la antigua entrada contextual.

### Secondary

Salvia acompaña la identidad agrícola. Maíz destaca selección y acentos; la landing lo utiliza en su acción principal y el login en el círculo de la flecha. No representa por sí solo un estado de alarma.

### Neutral

Usar el nombre de función, como `--surface-page`, `--surface-base`, `--text-primary` o `--border-default`, al construir una pantalla. Un token es una variable compartida con un propósito: evita que cada módulo invente su propio color. Los alias heredados `--bg`, `--card`, `--text2` y similares siguen presentes; no constituyen otra paleta.

Los neutros claros actuales son cálidos. Sus valores de superficies y bordes se sincronizan en el frontmatter con `shared/styles/index.css`. Blanco y marfil son colores de marca; no deben sustituir variables semánticas en componentes que necesitan adaptarse al tema.

### Tema oscuro observado

Se activa mediante `:root[data-theme='dark']`. La siguiente tabla recoge los roles principales; el bloque CSS completo sigue siendo la fuente de verdad para variantes, mezclas y sombras.

| Variable CSS | Claro | Oscuro |
| --- | --- | --- |
| `--shell-bg` | `#0d4537` | `#0b231c` |
| `--surface-page` | `#f7f6ef` | `#111d19` |
| `--surface-base` | `#ffffff` | `#18261f` |
| `--surface-raised` | `#ffffff` | `#1b2a23` |
| `--surface-subtle` | `#ebeae0` | `#233529` |
| `--surface-tinted` | `#f3f2e9` | `#1d2e26` |
| `--surface-hover` | `#f0efe5` | `#22342b` |
| `--border-subtle` | `#e3e1d5` | `#2a3d34` |
| `--border-default` | `#d0cfc1` | `#375046` |
| `--border-strong` | `#84977f` | `#5f7a6d` |
| `--text-primary` | `#203b32` | `#e8efe6` |
| `--text-secondary` | `#435c50` | `#bfcdc1` |
| `--text-muted` | `#5a6e61` | `#93a69a` |
| `--primary` | `#005b48` | `#2e8c6c` |
| `--primary-hover` | `#004638` | `#38a07d` |
| `--on-primary` | `#ffffff` | `#ffffff` (heredado) |
| `--focus-ring` | `#005b48` | `#6fcfa8` |
| `--success` | `#276b4c` | `#57bb8a` |
| `--warning` | `#866115` | `#e0b04a` |
| `--danger` | `#b13d3d` | `#e5786b` |
| `--danger3` | `#983434` | `#f09284` |
| `--info` | `#326678` | `#6fb3c8` |

El token documental `danger-strong` corresponde a `--danger3`. `--avisens-deep` también cambia en oscuro; `bosque` en el frontmatter conserva el color de marca claro. La presencia del tema no implica que todas las combinaciones tengan contraste validado. Pendiente: comprobar texto blanco sobre las acciones verdes oscuras, campos del login y autofill, además de gráficos y superficies heredadas.

### Estados y datos

Éxito, advertencia, peligro e información llevan texto que explique el estado; el icono puede reforzarlo. El mismo principio aplica a las insignias de tablas y las alertas. Una tendencia favorable depende de la métrica: una mortalidad creciente no se marca como mejora.

Para series de datos existen además `--data-purple`, `--data-purple-soft` y `--chart-track`. El violeta distingue datos; no añade una categoría de estado operativo. Elegir las series y su leyenda según la comparación real.

## Typography

### Familias y variantes observadas

Inter es la familia global, con los fallbacks del frontmatter. La landing carga Manrope y el componente compartido `MarcoAcceso` la registra como «Avisens Manrope», desde el mismo archivo local variable de pesos 400–800.

El título de login usa actualmente 2rem, peso 800, interlineado 1.1 y espaciado -0.04em. A 900px o menos baja a 1.75rem. Etiquetas de 0.875rem y peso 650; campos de 1rem. Son variantes de acceso, no una escala global.

### Jerarquía operativa observada

Estas medidas pertenecen a componentes existentes; se registran como referencia y no como obligación para todas las superficies.

| Papel | Fuente | Tamaño / peso | Uso |
| --- | --- | --- | --- |
| Título de página | `.adm-titulo` | `clamp(1.5rem, 2vw, 1.75rem)` / 750 | Nombre de la pantalla y contexto |
| Descripción | `.adm-subtitulo` | `0.9rem` / heredado | Explicación breve; máximo 62ch |
| Cifra de resumen | `.adm-stat-valor` | `1.4rem` / 780 | Indicador, con cifras de ancho uniforme |
| Etiqueta de resumen | `.adm-stat-label` | `0.75rem` / 700 | Nombre del indicador, actualmente en mayúsculas |
| Texto de tabla | `.tg-tabla` | `0.85rem` / heredado | Comparación de registros |
| Cabecera de tabla | `.tg-tabla thead th` | `0.68rem` / 800 | Encabezados actualmente en mayúsculas |
| Campo de modal | `.modal-campo input` | `0.92rem` / heredado | Registro de datos |
| Etiqueta de modal | `.modal-campo > span` | `0.82rem` / 700 | Nombre del dato y unidad |

**Guía de uso:** un título principal por pantalla, subtítulos que agrupen tareas y etiquetas cercanas a su dato. Mostrar unidades junto al valor o en el encabezado inequívoco; usar cifras de ancho uniforme al comparar pesos, dinero o cantidades. Evitar que textos auxiliares compitan con el registro principal.

**Pendiente de implementación y validación móvil:** tomar 1rem como referencia para texto de campos y lectura principal, y 0.875rem para etiquetas y ayudas. Revisar las cabeceras de tabla, etiquetas y nombres del riel que hoy son menores. Esta orientación no cambia los valores observados ni introduce tokens tipográficos globales inexistentes.

Hay usos de Space Grotesk en `PantallaHija` y utilidades heredadas, y DM Mono en `.section-label`. Se documentan como excepciones existentes; no se promueven para nuevas pantallas operativas.

## Layout

### Ritmo y composición operativa

La escala compartida va de `--space-1` a `--space-8`. `.adm-page` separa regiones con `space-4`; la cabecera usa `space-5`, borde fino, radio lg y sombra sm. Los resúmenes se distribuyen con columnas automáticas de al menos 158px.

**Guía de uso:** mostrar primero la ubicación y la tarea de la pantalla; luego los indicadores necesarios, filtros y registros. Destacar una acción principal por tarea, por ejemplo «Registrar pesaje». Una pantalla de consulta puede dar prioridad a filtros y comparación. No obligar a mostrar tarjetas cuando no aportan información.

Mantener visible el contexto que determina dónde se guarda el registro: granja, galpón y lote. Reutilizar el contexto ya elegido; no hacer que el operario lo seleccione de nuevo sin motivo. Respetar las entradas desde el padre y las excepciones de NAVEGACION.md.

### Adaptación observada

No existe un único punto de cambio para todas las pantallas. Cada regla tiene alcance local:

| Superficie | Condición | Cambio observado |
| --- | --- | --- |
| Sidebar | Ancho ≤900px | Panel móvil con carril y región contextual |
| Gestión | Ancho ≤760px | Cabecera y barra en columna; filtros con desplazamiento horizontal |
| Tabla de gestión | Ancho ≤760px | Menor padding de celdas y acciones alineadas al inicio |
| Modal normal / ancho | Ancho ≤620px | Hoja inferior de hasta 94dvh; campos en una columna |
| Confirmación compacta | Ancho ≤620px | Centrada, margen de 16px y ancho máximo de 440px |
| Pantalla hija | Ancho ≤620px | Panel ocupa la ventana, sin radio exterior |
| Landing | Ancho ≤700px | Ajustes de escenas, separación y botones |

**Guía de uso móvil:** conservar la acción y el dato esencial, permitir que los nombres largos se lean y evitar desplazamiento horizontal de toda la página. En tablas anchas el desplazamiento pertenece a su contenedor. Antes de sustituir la tabla por tarjetas, comprobar si el usuario necesita comparar columnas.

### Acceso fotográfico observado

`LoginPage` compone `MarcoAcceso` y `LoginForm`; ya no existe `features/login/LoginPage.css`. El marco usa `shared/assets/acceso-galpon.webp` y un panel opaco de hasta 440px, padding 32px, radio 20px y gap 24px. La tarjeta del formulario tiene gap 28px y el formulario gap 24px.

A 760px o menos la foto ocupa una cabecera de 224px y el panel comienza a 120px, con padding 24px 20px, radio 16px y gap 20px. A alturas de 600px o menos se reduce el padding vertical de página a 16px y el del panel a 20px, con gap 16px. El formulario tiene ajustes propios a 900px.

Las capturas y el brief histórico del login corresponden a una iteración anterior: su foto, algunas medidas y sus rutas de archivo no describen por completo la implementación actual. No se reutilizan como prueba visual de esta actualización documental.

## Elevation & Depth

Predominan capas tonales y bordes. Los tokens claros son `shadow-sm`: `0 1px 2px` con tinta al 5%; `shadow-md`: `0 8px 24px` al 7%; `shadow-lg`: `0 18px 42px` al 11%. En oscuro cambian a sombras negras con opacidades 35%, 40% y 50%. Los valores completos se mantienen en CSS y en el sidecar documental.

El acceso conserva una sombra local de tinta al 24%, y shadow-lg en móvil. Modales y pantallas hijas tienen elevación propia para indicar superposición. Una sombra o un hover de tarjeta no significa que sea un botón: la acción necesita su control identificable.

Las transiciones compartidas son 120ms y 180ms, con `cubic-bezier(0.2, 0, 0, 1)`. Modal añade `--motion-dialog-enter: 200ms` y `--motion-dialog-exit: 160ms`; Motion utiliza estos valores y la curva compartida. La confirmación permanece montada hasta completar su salida y después resuelve la decisión. Con movimiento reducido solo cambia la opacidad. Acceso, landing y paneles tienen variantes locales. Movimiento reducido conserva la tarea y elimina los desplazamientos decorativos; el indicador de espera conserva además su texto.

## Shapes

La escala global usa radios de 6, 9, 12 y 16px, y 999px para píldoras. Son referencias compartidas, no una descripción de todos los componentes: el login usa campos de 14px y botón píldora; el panel de acceso usa 20px y `PantallaHija` 26px en escritorio. El sidebar conserva reglas base de marco de 24px, pero la variante actual de escritorio las sobrescribe con radio 0 y fondo transparente alrededor del riel.

Las insignias compactas, los botones y las tarjetas conservan su función distinguible. No convertir todas las superficies en píldoras por replicar el botón de acceso. Las fotos se recortan con CSS dentro de su región, preservando el archivo original.

## Components

### Buttons

**Observado:** `.adm-btn` ofrece variante primaria bosque y secundaria con borde, altura mínima de 44px, radio md y padding 0.55rem 0.95rem. `.modal-btn` también tiene altura mínima de 44px, estados deshabilitados y variante de peligro. Los botones compactos `.tg-btn` y chips `.tg-chip` parten de 30px: esa medida no se presenta como objetivo táctil del producto.

El login usa acción de 54px, forma de píldora y padding 14px 8px 14px 22px. Su flecha tiene círculo maíz; hover la desplaza 3px y la presión desplaza el botón 1px. «Entrando…» y spinner acompañan `aria-busy` durante la petición. La landing mantiene su variante maíz de 56px en escritorio y 52px en móvil.

**Guía de uso:** nombrar la acción con verbo y objeto cuando ayude, como «Guardar registro» o «Crear granja»; mostrar una respuesta textual durante la espera y evitar envíos duplicados. Reservar peligro para acciones destructivas.

**Pendiente:** revisar áreas táctiles de controles compactos de tabla y cierres de panel; la referencia para el trabajo nuevo es un área de interacción de al menos 44×44px, sin reducir la letra para hacerla caber.

### Cards / Containers

**Observado:** `TarjetasResumen` y AdminKit comparten borde, fondo semántico, radio lg y sombra sm. Los valores usan cifras de ancho uniforme. Los contenedores de Bitácora tienen variantes locales, incluidos radios de 18px; no se corrigen mediante esta documentación.

**Guía de uso:** cada resumen responde una pregunta concreta: cantidad, estado o evolución. Mantener título, valor, unidad y contexto temporal cuando corresponda. Un cero medido y un dato ausente son estados distintos. No mostrar una estimación como medición confirmada.

### Inputs / Fields

**Observado:** los campos de modal tienen borde default, radio md, altura mínima de 44px y texto de 0.92rem. El foco usa borde y contorno. `FormularioRegistro` ofrece fecha y campos por tipo; en pesaje muestra «Peso promedio (g)», aves pesadas opcionales y un error general con `role=alert`. El botón cambia a «Guardando…».

Los campos de acceso son una variante local: altura 54px, texto 1rem, radio 14px, fondo mezclado de marfil al 40% con blanco y borde de tinta al 14%. Foco añade una sombra de 4px al 16% del primario. Autofill tiene otra mezcla propia. Error enlazado con `aria-describedby` y `aria-invalid`; contraseña con botón de 44px, nombre accesible y `aria-pressed`.

**Guía de uso:** mantener etiqueta persistente, unidad visible y opcionalidad explícita. Validar los límites del dominio junto al campo y conservar los datos si falla el envío. Enlazar la ayuda y el error con el control. No copiar gramos a una pantalla que espera kilogramos sin conversión explícita.

**Pendiente:** comprobar errores por campo y recuperación de datos en cada formulario; el ejemplo de Bitácora no demuestra cobertura de todos esos comportamientos. No hay garantía documental de borradores persistentes ni funcionamiento sin conexión.

### Navigation

**Observado:** a partir de 901px el sidebar usa un solo riel de 92px con icono y nombre. Los grupos se despliegan dentro del mismo riel; la región contextual queda oculta. Las entradas principales tienen altura mínima de 54px y los hijos de 44px; activo maíz con tinta, foco maíz. Las etiquetas son de 0.64rem y 0.6rem, respectivamente: quedan pendientes de revisión de legibilidad.

A 900px o menos se conserva el panel móvil: carril bosque y región contextual, selección de espacio maíz, entrada contextual activa bosque con texto claro, objetivos de 66px y secundarios de 44px. Las dos variantes no deben confundirse al generar pantallas nuevas.

La estructura funcional y las excepciones por rol se consultan en NAVEGACION.md y `navConfig.tsx`. No añadir accesos independientes para galpones o lotes por comodidad visual. `CabeceraAdmin` admite migas de navegación para mostrar la ruta padre → hijo.

### Tables / Lists

**Observado:** `TablaGestion` recibe registros, columnas, clave de fila, carga y mensaje vacío; admite pista y acciones. Usa tabla HTML, contenedor con `overflow-x: auto`, cabeceras sticky y tipografía descrita en Typography. La eficacia del encabezado fijo depende del contenedor de desplazamiento y requiere comprobarse en pantalla. Incluye estilos para datos secundarios, cifras uniformes e insignias de estado.

**Guía de uso:** poner primero la identificación del registro y luego los datos que se comparan; distinguir entrar al hijo de editar o desactivar el registro. Dar nombre accesible a acciones con solo icono. Conservar encabezados y unidades; no ocultar información decisiva para que la tabla quepa.

**Límites observados:** la tabla compartida ofrece alineación izquierda o centro; no incorpora ordenación, paginación ni selección masiva propias. No prometerlas como capacidades del componente. Si se necesita alineación numérica a la derecha, añadirla mediante un cambio de componente revisado.

### Search / Filters

**Observado:** `BarraHerramientas` reúne búsqueda, opciones segmentadas, conteo y espacios para filtros o acciones adicionales. La búsqueda tiene etiqueta accesible y cada segmento anuncia selección con `aria-pressed`. Muestra total o «visibles de total»; el filtrado lo resuelve la pantalla que lo usa.

**Guía de uso:** ubicar los filtros junto al conjunto que modifican y nombrar la búsqueda según el dato, como «Buscar lote». Distinguir «No hay lotes» de «Ningún lote coincide con los filtros»; ofrecer quitar filtros cuando proceda. No asumir que la búsqueda cubre todos los datos si solo filtra una página cargada.

### Charts

**Observado:** `GraficoSerie` muestra una serie con unidad, etiqueta temporal, valores con formato `es-CO`, línea primaria y rango esperado si se proporcionan ambos límites. El gráfico tiene descripción en la figura y su dibujo está oculto al lector de pantalla; no incorpora una tabla alternativa de puntos. `GraficoCrecimiento` cubre la comparación de crecimiento; no sustituirlo por el gráfico de serie sin revisar su propósito.

**Guía de uso:** explicar qué se mide, unidad, periodo y procedencia. Distinguir medición, referencia y estimación mediante texto y estilos de trazo, además de color. No unir huecos como si fueran datos reales ni presentar ausencia de medición como cero.

**Pendiente:** ofrecer una alternativa textual o tabular para los valores necesarios para decidir; la descripción general de la figura no equivale al acceso a cada dato. Comprobar contraste, leyendas, fechas y lectura táctil en ambos temas.

### Feedback / Empty States

**Observado:** `TablaGestion` separa carga («Cargando…») y lista vacía, con pista opcional. `EstadoVacioAnimado` admite título, texto y acción. El CSS global tematiza los avisos de Sonner. Su presencia no garantiza que cada pantalla distinga todos los estados.

**Guía de uso:** separar carga, primera utilización, búsqueda sin resultados, error y falta de permisos. Cada estado explica qué ocurre y el siguiente paso permitido. Ejemplos de redacción orientativa: «Todavía no hay pesajes en este lote» con «Registrar pesaje», o «No pudimos cargar los registros» con «Reintentar». Mostrar acciones solo si el rol puede ejecutarlas. El error que impide guardar debe permanecer junto al formulario; un aviso temporal no basta.

### Action Confirmations

**Implementado localmente:** `Confirmaciones` se monta en App dentro del router. Las 29 llamadas nativas localizadas se sustituyen por `confirmarAccion`. Cada solicitud define título, entidad opcional, explicación y texto explícito del botón; los tonos peligro y aviso utilizan sus variables semánticas.

La variante compacta tiene hasta 440px, radio xl, título de 1.25rem, cuerpo de 0.9375rem e interlineado 1.65; botones de al menos 44px de alto. Permanece centrada también en móvil y permite partir identificadores largos. El foco inicial está en «Cancelar», Tab queda contenido y Escape cancela solo el diálogo superior. El fondo conserva su aislamiento hasta finalizar la salida.

Solo hay una decisión activa; una solicitud adicional se cancela. Cambiar de ruta cancela la decisión pendiente. Con `onConfirmar` se espera la petición dentro del diálogo: muestra progreso, bloquea dobles envíos y cierre durante el envío y conserva los errores para reintentar. Los flujos de sensores usan ese modo; los demás consumidores conservan el tratamiento de resultado en su pantalla después de recibir la confirmación. Una petición ya enviada no se revierte al cambiar de ruta.

El texto de sensores refleja el backend actual: sin historial se elimina; con lecturas o alertas se retira y el historial se conserva. La muestra del sidecar es ilustrativa y no ejecuta esa acción.

### Dialogs / Child Panels

**Observado:** `Modal` tiene título accesible, `aria-modal`, aislamiento del fondo, foco contenido, cierre con Escape y devolución del foco. Su cuerpo puede desplazarse manteniendo cabecera y acciones separadas. `PantallaHija` conserva la relación con el padre y ocupa toda la ventana a 620px o menos.

**Guía de uso:** usar modal para una tarea breve y panel hijo cuando sea necesario conservar la ubicación de origen. No acumular superposiciones para completar el registro habitual. Revisar que cierre, cancelación y errores no hagan perder trabajo sin advertencia cuando haya datos modificados; este requisito no se da por implementado en todos los consumidores.

## Do's and Don'ts

### Do:

- Do usar variables semánticas y comprobar las variantes claras y oscuras.
- Do conservar la identidad y el símbolo A/gallina aprobado.
- Do reutilizar los componentes compartidos antes de duplicar estilos.
- Do mostrar el contexto granja → galpón → lote en tareas que dependen de él.
- Do mantener etiquetas, unidades, foco visible y respuestas textuales.
- Do distinguir los valores observados de las mejoras pendientes.

### Don't:

- Don't convertir el acceso fotográfico en plantilla de las pantallas operativas.
- Don't imponer Manrope a toda la aplicación ni extender utilidades heredadas como nueva jerarquía.
- Don't comunicar estados ni comparaciones solo por color.
- Don't tratar falta de datos como cero ni presentar estimaciones como mediciones.
- Don't presentar el tema oscuro, una captura histórica o una revisión de fuente como validación completa de accesibilidad o despliegue.

### Comprobación para el próximo cambio de interfaz

Esta lista guía futuras implementaciones; no informa pruebas ejecutadas en este cierre documental.

1. Abrir el registro de pesaje desde su contexto de lote y comprobar que la ubicación y los gramos sean inequívocos.
2. Revisar móvil de 360–390px y escritorio, nombres largos y zoom al 200%; asegurar acceso a campos y guardar con el teclado virtual abierto.
3. Comprobar claro y oscuro, teclado, foco y movimiento reducido; medir contraste de texto y controles antes de afirmar conformidad.
4. Probar carga, conjunto vacío, filtros sin coincidencias, error al guardar y permisos; verificar que el usuario pueda recuperarse.
5. Confirmar el guardado con la respuesta real del sistema y comprobar que no se duplique el registro al repetir la acción.

### Fuentes y alcance

Revisión de código local: PRODUCT.md; NAVEGACION.md; `avisens-frontend/src/shared/styles/index.css`; Sidebar.tsx, Sidebar.css y navConfig.tsx; LoginPage.tsx; MarcoAcceso.tsx y CSS; LoginForm.tsx y CSS; LandingPage.css; AdminKit.css, CabeceraAdmin, TarjetasResumen y BarraHerramientas; TablaGestion y CSS; Modal y su hook de foco; PantallaHija y CSS; EstadoVacioAnimado; GraficoSerie; FormularioRegistro y BitacoraPage.css. Las rutas abreviadas de componentes se resuelven bajo `avisens-frontend/src`.

El frontmatter y `.impeccable/design.json` se mantienen juntos: el primero registra los tokens observados; el segundo amplía sombras, movimiento, puntos de adaptación y ejemplos representativos. Sus muestras no ejecutan APIs, navegación ni validación. Las rampas tonales son ilustrativas y no agregan colores normativos. Se retiró la afirmación antigua de que `farm-hero.webp` faltaba: el archivo existe en `shared/assets` y no es la fotografía actual del acceso.

La actualización posterior de confirmaciones incluye cambios de componentes y CSS, con compilación, lint de archivos afectados y 586 pruebas del frontend aprobadas. La revisión visual aislada cubre escritorio 1280×720 y móvil 390×844 en ambos temas, cancelación, teclado, diálogo anidado, espera, error y reintento simulados. Movimiento reducido se revisó en fuente; no se modificó la preferencia del sistema. No se ejecutaron eliminaciones reales ni se acredita merge o despliegue. La evidencia y el contrato se describen en `avisens-frontend/src/shared/ui/ConfirmarAccion/README.md`; los briefs y capturas históricos del login siguen siendo históricos.
