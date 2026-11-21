import type { TipoAtencionGranja } from '@features/dashboard/model/resumenGranja'

// Mi jornada reutiliza el hero y los paneles del resumen del propietario.
// Allí los atajos llevan a /granjas (la ficha de la granja), que el operario
// no puede abrir: aquí se traducen a las pantallas que sí tiene en su menú.
export function rutaDeOperario(destino: string): string {
  if (!destino.startsWith('/granjas')) return destino
  const pestana = new URLSearchParams(destino.split('?')[1] ?? '').get('pestana')
  if (pestana === 'alertas') return '/alertas'
  if (pestana === 'ambiente') return '/monitoreo/sensores'
  return '/bitacora'
}

// A dónde lleva «Revisar ahora» según lo que pide atención.
export function rutaDeAtencion(item: { tipo: TipoAtencionGranja; loteId?: number }): string {
  if (item.tipo === 'crecimiento') {
    return item.loteId !== undefined ? `/guia-crecimiento?lote=${item.loteId}` : '/guia-crecimiento'
  }
  return item.tipo === 'alerta' ? '/alertas' : '/monitoreo/sensores'
}
