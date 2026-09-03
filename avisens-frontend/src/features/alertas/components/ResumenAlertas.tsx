import { IcAlert, IcCheck, IcClock } from '@shared/ui/icons/icons'
import type { ResumenAlertas as Resumen } from '../model/alerta'

interface ResumenAlertasProps {
  resumen: Resumen
}

function ResumenAlertas({ resumen }: ResumenAlertasProps) {
  const tarjetas = [
    { etiqueta: 'Alertas registradas', valor: resumen.total, icono: <IcAlert size={20} /> },
    { etiqueta: 'Por atender', valor: resumen.abiertas, icono: <IcAlert size={20} /> },
    { etiqueta: 'En atención', valor: resumen.enProceso, icono: <IcClock size={20} /> },
    { etiqueta: 'Críticas activas', valor: resumen.criticas, icono: <IcCheck size={20} /> },
  ]

  return (
    <section className="ale-resumen" aria-label="Resumen de alertas">
      {tarjetas.map((tarjeta, indice) => (
        <article key={tarjeta.etiqueta} className={`ale-resumen-tarjeta ale-resumen-tarjeta--${indice}`}>
          <span className="ale-resumen-icono" aria-hidden="true">{tarjeta.icono}</span>
          <strong>{tarjeta.valor}</strong>
          <span>{tarjeta.etiqueta}</span>
        </article>
      ))}
    </section>
  )
}

export default ResumenAlertas
