# Confirmaciones de acciones en AVISENS

## Alcance y contrato

Sustituir las 29 llamadas a `window.confirm` localizadas en 23 archivos por una
confirmación integrada con la identidad existente. Reutilizar Modal y Motion,
ya instalado. Conservar endpoints, permisos y reglas de negocio. No añadir
SweetAlert2 ni publicar o confirmar eliminaciones reales durante las pruebas.

- Título que nombra la acción, entidad identificable y explicación de consecuencias.
- Variante compacta de hasta 440px, compatible con móvil y ambos temas.
- Entrada de 200ms y salida de 160ms; curva compartida `--ease-standard`.
- Transformación y opacidad; con movimiento reducido, solo opacidad.
- Cancelar o Escape no autoriza la operación. Foco inicial en Cancelar.
- El fondo permanece aislado hasta terminar la salida y luego se restaura el foco.
- Una confirmación sobre otra ventana no cierra la ventana de origen con Escape.
- Solo existe una decisión activa; una petición adicional se cancela.
- Cambiar de ruta cancela decisiones pendientes; no revierte una petición ya enviada.
- Con `onConfirmar`, el diálogo espera la petición, bloquea dobles clics y cierre
  durante el envío, y permite reintentar si falla. Sensores utiliza este modo.
- Los demás consumidores esperan el booleano de confirmación y conservan su
  gestión existente de carga, éxito y errores en la pantalla de origen.

## Organización

`shared/ui/ConfirmarAccion/gestorConfirmacion.ts` gestiona la decisión y su promesa.
`Confirmaciones.tsx` se monta dentro del router de App y representa el diálogo.
`Modal` conserva sus tamaños normal y ancho y añade compacto, foco inicial,
bloqueo y presencia para coordinar la salida. El hook de foco atiende únicamente
la ventana superior y mantiene el bloqueo de scroll hasta el último cierre.

En sensores el mensaje refleja `sensores.service.ts`: sin historial se elimina;
con lecturas o alertas se retira y conserva el historial.

## Verificación

Estado local verificado el 2026-10-18:

- `npm run build`: aprobado; permanecen los avisos de Lottie/eval y chunks grandes.
- ESLint de Modal, ConfirmarAccion, App y los 23 consumidores: aprobado.
- `npm test`: 62 archivos, 586 pruebas aprobadas, incluidas 7 de confirmaciones.
- `git diff --check`: aprobado; sin llamadas nativas confirm/alert/prompt en src.
- Navegador: escritorio 1280×720 y móvil 390×844, con identificador largo, sin
  desbordamiento horizontal. Capturas en `.impeccable/review/confirmaciones/`.
- Foco inicial en Cancelar, Tab contenido, Escape cancela y devuelve el foco.
- Escape sobre una confirmación anidada conserva el formulario de origen.
- Petición simulada muestra espera y bloquea controles; error conserva el diálogo,
  devuelve foco a Cancelar y permite reintento exitoso. No se llamó al backend.
- Tema oscuro verificado visualmente. Movimiento reducido revisado en fuente;
  no se cambió la preferencia del sistema ni se probó un dispositivo físico.
- Detector: dos avisos sobre fuentes Inter y Space Grotesk ya existentes;
  se conserva la identidad aprobada, sin incidencias nuevas en la confirmación.

No se ejecutaron eliminaciones reales, commits, push, PR ni despliegue. Los cambios
concurrentes de EstructuraOrganizacion.tsx y CSS no forman parte de esta entrega.
