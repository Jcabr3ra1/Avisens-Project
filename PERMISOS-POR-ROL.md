# Permisos por rol — referencia para el frontend

Qué ve y qué puede hacer cada rol. Generado leyendo el código, no de memoria:
`PERMISOS_RUTA` en `src/app/layout/Sidebar/navConfig.tsx` para el acceso a
pantallas, y los `@Roles` / `@Permisos` de los controladores del backend para
las escrituras.

**Este documento acompaña, no reemplaza.** La fuente de verdad sigue siendo el
código. Si algo aquí no cuadra con lo que hace la aplicación, manda el código y
hay que corregir este archivo.

Se complementa con `PANELES-POR-ROL.md` (dónde entra cada rol) y
`NAVEGACION.md` (por qué unos módulos cuelgan de otros).

---

## Los tres roles en una frase

| Rol | Qué es | Dónde entra |
|-----|--------|-------------|
| **Administrador** | Superusuario de la plataforma. Arma la estructura productiva y la asigna. | `/admin` |
| **Propietario** | Dueño de la granja. Opera lo que ya le asignaron. | `/dashboard` |
| **Operario** | Personal de campo. Registra lo que pasa en el galpón. | `/mi-jornada` |

---

## Regla que más se pregunta

> **La estructura productiva —granja, galpón, lote, insumo— solo la administra
> el Administrador.**

El Administrador crea la granja, el galpón y el lote, y se los asigna al
Propietario. El Propietario **los consulta y trabaja sobre ellos, pero no los
crea, no los edita, no los activa ni desactiva y no los borra**.

En el frontend esto sale de `shared/auth/permisos.ts`:

```ts
import { permisosDeGestion } from '@shared/auth/permisos'

const permisos = permisosDeGestion(getRol())
// { crear, editar, alternarActivo, eliminar } — todos true solo para Admin
```

**Un botón que el rol no puede usar no se deshabilita: no se dibuja.**
Deshabilitado comunica «te falta un dato»; ausente comunica «esto no es tuyo».

La excepción está en `permisosDeInsumo`: el catálogo de insumos lo administra
el Admin, pero **los tres roles registran movimientos de stock**, porque apuntar
el consumo diario es el trabajo del operario.

---

## Acceso a pantallas

`✓` accede · `·` recibe 403 y rebota a su inicio.
La columna **Menú** dice si además aparece en el sidebar: una ruta sin ítem
sigue siendo accesible, solo que se entra desde su pantalla padre.

| Ruta | Admin | Propietario | Operario | Menú |
|------|:-----:|:-----------:|:--------:|:----:|
| `/admin` | ✓ | · | · | sí |
| `/dashboard` | · | ✓ | · | sí |
| `/mi-jornada` | · | · | ✓ | sí |
| `/granjas` | ✓ | ✓ | · | sí |
| `/galpones` | ✓ | ✓ | · | no |
| `/lotes` | ✓ | ✓ | ✓ | no |
| `/bitacora` | ✓ | ✓ | ✓ | sí |
| `/consumos-diarios` | ✓ | ✓ | ✓ | no |
| `/monitoreo` | ✓ | ✓ | ✓ | sí |
| `/sensores` | ✓ | ✓ | · | no |
| `/alertas` | ✓ | ✓ | ✓ | sí |
| `/notificaciones` | ✓ | ✓ | ✓ | no |
| `/inventario` | ✓ | ✓ | · | sí |
| `/finanzas` | ✓ | ✓ | · | sí |
| `/ordenes-compra` | ✓ | ✓ | · | sí |
| `/usuarios` | ✓ | ✓ | · | sí |
| `/proveedores` | ✓ | · | · | sí |
| `/auditoria` | ✓ | · | · | sí |
| `/crm` | ✓ | · | · | sí |
| `/solicitudes-pqrs` | ✓ | · | · | no |
| `/recuperaciones-password` | ✓ | · | · | no |

**Las siete rutas sin ítem en el menú no están abandonadas**: se entra a ellas
desde su padre, según la regla de `NAVEGACION.md`.

| Ruta | Se entra desde |
|------|----------------|
| `/galpones`, `/lotes` | dentro del hub de `/granjas` |
| `/consumos-diarios` | pestaña de `/bitacora` |
| `/sensores` | ficha del galpón |
| `/solicitudes-pqrs` | panel del prospecto en `/crm` |
| `/recuperaciones-password` | ficha del usuario en `/usuarios` |
| `/notificaciones` | campana de la cabecera |

Una ruta que no está en `PERMISOS_RUTA` **queda cerrada para todos**. Si añades
una pantalla nueva y no la declaras ahí, nadie podrá entrar.

---

## Qué puede escribir cada rol

Solo operaciones de escritura. Todos los roles con acceso a una pantalla pueden
**leer** lo que esa pantalla muestra; el alcance por granja o galpón lo aplica
el backend según a quién pertenezca.

### Estructura productiva — solo Administrador

| Operación | Admin | Prop. | Oper. |
|-----------|:-----:|:-----:|:-----:|
| Crear, editar, activar y borrar **granjas** | ✓ | · | · |
| Crear, editar, activar y borrar **galpones** | ✓ | · | · |
| Crear, editar, activar y borrar **lotes** | ✓ | · | · |
| Crear, editar, activar y borrar **insumos** | ✓ | · | · |
| Crear, editar y borrar **zonas del galpón** | ✓ | · | · |
| Catálogo de **sensores** y **tipos de alimento** | ✓ | · | · |
| **Proveedores** | ✓ | · | · |
| **Organizaciones**, **curvas objetivo**, **modelos ML** | ✓ | · | · |

### Operación diaria — los tres roles

Es el trabajo de campo: si el operario no pudiera hacerlo, el módulo no tendría
sentido.

| Operación | Admin | Prop. | Oper. |
|-----------|:-----:|:-----:|:-----:|
| **Pesajes**: crear, editar, borrar | ✓ | ✓ | ✓ |
| **Mortalidad**: crear, editar, borrar | ✓ | ✓ | ✓ |
| **Eventos sanitarios**: crear, editar, borrar | ✓ | ✓ | ✓ |
| **Registros de plagas**: crear, editar, borrar | ✓ | ✓ | ✓ |
| **Consumos diarios**: crear, editar, borrar | ✓ | ✓ | ✓ |
| **Movimientos de stock** de un insumo | ✓ | ✓ | ✓ |
| **Aceptar** y **cerrar** una alerta | ✓ | ✓ | ✓ |
| **Evidencias** de alerta | ✓ | ✓ | ✓ |
| Marcar **notificaciones** leídas y borrarlas | ✓ | ✓ | ✓ |
| Registrar y cerrar **accionamientos de equipo** | ✓ | ✓ | ✓ |
| Resolver una **recomendación** | ✓ | ✓ | ✓ |

### Gestión de la operación — Admin y Propietario

| Operación | Admin | Prop. | Oper. |
|-----------|:-----:|:-----:|:-----:|
| **Usuarios**: crear, editar, activar, borrar | ✓ | ✓ | · |
| Asignar y quitar **galpones a un usuario** | ✓ | ✓ | · |
| **Alertas**: crear, editar, borrar, **escalar** | ✓ | ✓ | · |
| **Políticas de alerta** y canales de envío | ✓ | ✓ | · |
| **Umbrales** del galpón: crear, revisar, borrar | ✓ | ✓ | · |
| **Sensores** y **dispositivos**: alta y baja | ✓ | ✓ | · |
| **Equipos** y **mantenimientos** | ✓ | ✓ | · |
| **Órdenes de compra**, detalles y recepciones | ✓ | ✓ | · |
| **Movimientos financieros** | ✓ | ✓ | · |
| Calcular **indicadores** y generar predicciones | ✓ | ✓ | · |
| Preguntar al **copiloto** | ✓ | ✓ | · |

### Solo Administrador, fuera de la estructura

| Operación | Admin | Prop. | Oper. |
|-----------|:-----:|:-----:|:-----:|
| **Aprobar** o **rechazar** una recuperación de contraseña | ✓ | · | · |
| Responder y borrar **PQRS** | ✓ | · | · |
| Asignar un **prospecto** a un asesor · generar cotizaciones | ✓ | · | · |
| Crear **notificaciones** | ✓ | · | · |
| Traer el **clima** de una granja bajo demanda | ✓ | · | · |

**Solicitar** una recuperación de contraseña sí la puede hacer cualquiera —
si no, quien perdió el acceso no podría pedirlo.

---

## Cómo consultarlo desde el código

```ts
// ¿Puede este rol entrar a esta ruta?
import { puedeAcceder } from '@app/layout/Sidebar/navConfig'
puedeAcceder('/granjas', rol)          // true para Admin y Propietario

// ¿Puede administrar la estructura productiva?
import { permisosDeGestion } from '@shared/auth/permisos'
const { crear, editar, alternarActivo, eliminar } = permisosDeGestion(rol)

// Bodega, que tiene su propia regla
import { permisosDeInsumo } from '@shared/auth/permisos'
const { crear, registrarMovimiento } = permisosDeInsumo(rol)
```

---

## Dos cosas que conviene tener claras

**Esto no es seguridad, es honestidad de la interfaz.** Ocultar un botón evita
ofrecer algo que va a fallar con 403, pero quien decide de verdad es el backend.
Nunca des por hecho que algo está protegido solo porque el frontend no lo
muestra.

**El backend usa dos sistemas de autorización a la vez.** La mayoría de
controladores va con `@Roles`; catálogos, proveedores y organizaciones van con
`@Permisos`, que hoy se resuelve como una función del rol y no añade
granularidad real. Las tablas de arriba ya combinan los dos, así que reflejan lo
que de verdad ocurre. Si algún día hay permisos por usuario, la vía es pedir
`GET /v1/auth/permisos`, **no** copiar la tabla del backend al frontend.
