export type TonoBadge = 'activo' | 'preparacion' | 'finalizado' | 'alerta' | 'neutral'

const ETIQUETA: Record<TonoBadge, string> = {
  activo: 'Activo',
  preparacion: 'En preparación',
  finalizado: 'Finalizado',
  alerta: 'Alerta',
  neutral: 'Inactivo',
}

// Estado siempre con texto además del color: el color solo no lo distingue
// todo el mundo.
function Badge({ tono, texto }: { tono: TonoBadge; texto?: string }) {
  return (
    <span className={`gr-badge gr-badge--${tono}`}>
      <span className="gr-badge-punto" aria-hidden="true" />
      {texto ?? ETIQUETA[tono]}
    </span>
  )
}

export default Badge
