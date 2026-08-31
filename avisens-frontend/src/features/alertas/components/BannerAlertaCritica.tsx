import { IcAlert } from '@shared/ui/icons/icons'
import type { Alerta } from '../api/alertas'

interface BannerAlertaCriticaProps {
  alertas: Alerta[]
  onAbrir: (alerta: Alerta) => void
}

function BannerAlertaCritica({ alertas, onAbrir }: BannerAlertaCriticaProps) {
  const critica = alertas.find((alerta) => alerta.criticidad === 'alta' && alerta.estado !== 'cerrada')
  if (!critica) return null

  return (
    <section className="ale-banner-critico" role="alert">
      <IcAlert size={22} aria-hidden="true" />
      <div>
        <strong>Hay una alerta crítica que necesita revisión</strong>
        <span>{critica.galpon.nombre}: {critica.mensaje ?? `${critica.tipo} fuera de rango`}</span>
      </div>
      <button type="button" onClick={() => onAbrir(critica)}>Ver alerta</button>
    </section>
  )
}

export default BannerAlertaCritica
