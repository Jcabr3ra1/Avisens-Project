# Paneles por rol

Avisens comparte componentes de base —sesión, navegación, alertas y el panel de
comunicación—, pero no comparte una pantalla inicial para todos. Cada rol entra
en un panel que refleja su responsabilidad real.

| Rol | Ruta de inicio | Objetivo del panel | No debe mostrar como inicio |
| --- | --- | --- | --- |
| Administrador | `/admin` | Control global de la plataforma: personas, granjas asignadas, solicitudes, auditoría y seguimiento transversal. | La operación diaria de una granja concreta. |
| Propietario | `/dashboard` | Seguimiento de su granja: galpones, lotes, alertas y estado productivo. | Herramientas globales de administración. |
| Operario | `/mi-jornada` | Tareas y registros del día en los galpones o lotes que tiene asignados. | Gestión de personas, estructura global o reportes administrativos. |

## Reglas que no se deben romper

1. `PERMISOS_RUTA` en `src/app/layout/Sidebar/navConfig.tsx` es la fuente de
   verdad del acceso. Una ruta sin permiso explícito permanece cerrada.
2. El inicio después del login debe coincidir con la tabla anterior. No se debe
   enviar a todos los roles a `/dashboard`.
3. Si se habilita una vista de prueba para el Administrador, solo debe cambiar
   la interfaz para probar un rol. La sesión continúa siendo administrativa y
   las acciones reales se validan con los permisos del backend.
4. El administrador puede revisar el estado de los demás roles desde sus
   módulos globales, sin convertir su panel en una copia del dashboard del
   propietario.
5. La jerarquía productiva se conserva en todos los paneles: **Granjas →
   Galpones → Lotes**. Galpones y Lotes se navegan desde su padre, conforme a
   `NAVEGACION.md`.

## Criterio para nuevos módulos

Antes de crear una ruta, definir primero quién necesita tomar esa decisión:

- Si coordina toda la plataforma o cruza granjas, pertenece al Administrador.
- Si gestiona y consulta su producción, pertenece al Propietario.
- Si registra o ejecuta una tarea concreta en campo, pertenece al Operario.
- Si es una urgencia o cruza entidades —por ejemplo Alertas— puede ser una
  vista transversal, siempre con permisos explícitos para cada rol.

El mismo módulo puede tener datos diferentes por rol, pero no por eso se debe
usar un único dashboard genérico. Se conserva una intención clara por pantalla
y se evita mezclar controles administrativos con la operación de campo.
