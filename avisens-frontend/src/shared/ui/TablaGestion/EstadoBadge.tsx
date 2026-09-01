type Tono = 'ok' | 'peligro' | 'neutral'

// El texto libre del backend ("activo", "finalizado", "en_proceso"…) se
// clasifica en tres tonos: no hay forma de saber de antemano cada palabra
// que puede llegar, así que se agrupan por lo que significan, no por el
// string exacto.
const TONO_POR_PALABRA: Record<string, Tono> = {
  activo: 'ok',
  activa: 'ok',
  completado: 'ok',
  aprobada: 'ok',
  inactivo: 'peligro',
  inactiva: 'peligro',
  cancelado: 'peligro',
  rechazada: 'peligro',
}

function EstadoBadge({ estado }: { estado: string }) {
  const tono = TONO_POR_PALABRA[estado.toLowerCase()] ?? 'neutral'
  return <span className={`tg-badge tg-badge--${tono}`}>{estado.replace(/_/g, ' ')}</span>
}

export default EstadoBadge
