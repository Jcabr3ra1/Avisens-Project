# Tableros operativos para la administración

## Principio

Un tablero representa un flujo de trabajo real. Sus columnas se calculan a
partir de los datos del sistema; no se arrastran tarjetas ni se modifica el
estado visual de forma manual.

## Tablero de puesta en marcha productiva en Granjas

Este tablero vive dentro del módulo **Granjas** y solo se muestra a quien tenga
rol Administrador. Su objetivo es ver, en una sola pantalla, en qué punto de
configuración está cada propietario.

El Administrador coordina y asigna la estructura, pero no es propietario ni
representa una granja. Por eso nunca aparece como tarjeta ni como parte de la
jerarquía productiva: las tarjetas corresponden exclusivamente a propietarios
reales y a las granjas que les fueron asignadas.

```
Propietario
  → granja activa asignada
    → galpón registrado
      → lote activo
        → producción operativa
```

| Columna | Regla basada en datos | Acción principal |
|---|---|---|
| Sin granja activa | No tiene una granja activa | Crear, asignar o activar granja |
| Pendiente de galpones | Tiene granja activa y ningún galpón | Registrar galpón |
| Pendiente de lote | Tiene galpón y ningún lote activo | Registrar lote |
| Producción activa | Tiene al menos un lote activo | Revisar el detalle productivo |

Cada tarjeta muestra propietario, granjas activas, galpones y lotes activos.
Al seleccionarla se abre el detalle de sus granjas; el dato no se duplica en el
tablero.

## Dónde usar tablero y dónde no

- **CRM:** sí. Sus etapas comerciales son un flujo real.
- **Puesta en marcha productiva:** sí. Muestra el avance de configuración.
- **Mantenimiento de equipos:** sí, cuando el módulo esté completo: pendiente,
  en proceso y terminado.
- **PQRS:** sí solo si el volumen requiere una vista por estados; si no, se
  conserva en el detalle del prospecto.
- **Alertas:** no. Deben priorizarse por severidad y urgencia.
- **Usuarios, proveedores, inventario y recuperaciones:** no. Requieren tablas,
  filtros o bandejas de atención.

## Regla para próximos módulos

Antes de crear una pantalla se define: entidad padre, rol que crea, rol que
gestiona, estado real que muestra y entrada desde la navegación. Los hijos se
abren desde su padre; las vistas transversales conservan su acceso propio.
