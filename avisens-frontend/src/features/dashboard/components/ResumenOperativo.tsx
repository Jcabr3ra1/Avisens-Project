import type { ReactNode } from 'react'
import { IcAlert, IcCal, IcEgg, IcLeaf } from '@shared/ui/icons/icons'
import type { DashboardGalpon, DashboardLote } from '../model/dashboard'

interface ResumenOperativoProps {
  galpon: DashboardGalpon | null
  lote: DashboardLote | null
  diaLote: number | null
  alertasAbiertas: number
}

interface MetricaProps {
  icono: ReactNode
  etiqueta: string
  valor: string
  ayuda: string
}

function Metrica({ icono, etiqueta, valor, ayuda }: MetricaProps) {
  return (
    <div className="dashboard-metric">
      <span className="dashboard-metric__icon" aria-hidden="true">{icono}</span>
      <span className="dashboard-metric__label">{etiqueta}</span>
      <strong>{valor}</strong>
      <small>{ayuda}</small>
    </div>
  )
}

function ResumenOperativo({ galpon, lote, diaLote, alertasAbiertas }: ResumenOperativoProps) {
  const estado = !lote
    ? 'Sin lote activo'
    : alertasAbiertas === 0
      ? 'Sin alertas abiertas'
      : `${alertasAbiertas} ${alertasAbiertas === 1 ? 'alerta abierta' : 'alertas abiertas'}`

  return (
    <section className="dashboard-panel dashboard-operacion" aria-labelledby="resumen-operativo-title">
      <div className="dashboard-operacion__contexto">
        <div>
          <p className="dashboard-section-label">Contexto del galpón</p>
          <div className="dashboard-operacion__title-row">
            <h2 id="resumen-operativo-title">{galpon?.nombre ?? 'Sin galpón seleccionado'}</h2>
            {galpon && <span className="dashboard-operacion__code">{galpon.codigo}</span>}
          </div>
          <p className="dashboard-operacion__meta">
            {lote
              ? `${lote.codigo} · ${lote.cantidadInicial.toLocaleString('es-CO')} aves al ingreso · Día ${diaLote ?? '—'}`
              : 'Registra un lote para iniciar el seguimiento productivo.'}
          </p>
        </div>
        <span className={`dashboard-operacion__estado${alertasAbiertas > 0 ? ' has-alertas' : ''}`}>{estado}</span>
      </div>
      <div className="dashboard-metrics">
        <Metrica
          icono={<IcLeaf size={21} />}
          etiqueta="Galpón"
          valor={galpon?.nombre ?? 'Sin galpón'}
          ayuda={galpon?.codigo ?? 'No seleccionado'}
        />
        <Metrica
          icono={<IcEgg size={21} />}
          etiqueta="Lote activo"
          valor={lote?.codigo ?? 'Sin lote'}
          ayuda={lote ? `${lote.cantidadInicial.toLocaleString('es-CO')} aves al ingreso` : 'Pendiente por registrar'}
        />
        <Metrica
          icono={<IcCal size={21} />}
          etiqueta="Día del lote"
          valor={diaLote ? `Día ${diaLote}` : 'Sin datos'}
          ayuda={lote ? `Ingresó el ${new Date(`${lote.fechaIngreso.slice(0, 10)}T00:00:00`).toLocaleDateString('es-CO')}` : 'Disponible con un lote activo'}
        />
        <Metrica
          icono={<IcAlert size={21} />}
          etiqueta="Alertas abiertas"
          valor={alertasAbiertas.toLocaleString('es-CO')}
          ayuda={alertasAbiertas === 0 ? 'No requieren atención' : 'Requieren revisión'}
        />
      </div>
    </section>
  )
}

export default ResumenOperativo
