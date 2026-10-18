import { IcArrowRight, IcRefresh } from '@shared/ui/icons/icons'
import type { DashboardGranja } from '../model/dashboard'
import type { KpiGranja } from '../model/resumenGranja'

type Props = {
  nombre: string
  fecha: string
  granjas: DashboardGranja[]
  granjaId: number | null
  kpis: KpiGranja[]
  cargando: boolean
  onGranjaChange: (id: number) => void
  onRecargar: () => void
  onNavegar: (destino: string) => void
}

const DESTINOS: Record<KpiGranja['id'], string> = {
  galpones: 'Ir a tus granjas y galpones',
  aves: 'Ir a tus granjas y lotes',
  alertas: 'Ver las alertas dentro de Granjas',
  sensores: 'Ver el ambiente de tus galpones',
}

function CabeceraGranja({
  nombre, fecha, granjas, granjaId, kpis, cargando, onGranjaChange, onRecargar, onNavegar,
}: Props) {
  const granja = granjas.find((item) => item.id === granjaId)

  return (
    <>
      <header className="admin-header">
        <div className="admin-header-copy">
          <span className="adm-eyebrow">
            <span className="adm-eyebrow-punto" aria-hidden="true" />
            {granja ? `${granja.nombre} · Hoy` : 'Tu granja · Hoy'}
          </span>
          <h1 className="admin-header-title">Tu granja hoy</h1>
          <p className="admin-header-subtitle">
            Hola, {nombre}. Así están tus galpones, tus lotes y lo que necesita tu atención.
          </p>
        </div>

        <div className="admin-header-controls">
          <time className="admin-header-date">{fecha}</time>
          {granjas.length > 1 && (
            <label className="resumen-granja-selector">
              <span className="sr-only">Granja</span>
              <select
                value={granjaId ?? ''}
                onChange={(evento) => onGranjaChange(Number(evento.target.value))}
              >
                {granjas.map((item) => (
                  <option key={item.id} value={item.id}>{item.nombre}</option>
                ))}
              </select>
            </label>
          )}
          <button
            type="button"
            className={`admin-sync-btn${cargando ? ' is-spinning' : ''}`}
            onClick={onRecargar}
            disabled={cargando}
          >
            <IcRefresh size={15} aria-hidden="true" />
            <span>{cargando ? 'Actualizando…' : 'Actualizar datos'}</span>
          </button>
        </div>
      </header>

      <section className="admin-kpis" aria-label="Indicadores de la granja" aria-busy={cargando}>
        {kpis.map((kpi) => (
          <button
            key={kpi.id}
            type="button"
            className="admin-kpi"
            title={DESTINOS[kpi.id]}
            onClick={() => onNavegar(kpi.destino)}
          >
            <span className="admin-kpi-head-row">
              <span className="admin-kpi-label">{kpi.etiqueta}</span>
              <IcArrowRight size={13} className="admin-kpi-go" aria-hidden="true" />
            </span>
            <strong className="admin-kpi-value">{kpi.valor}</strong>
            <span className="admin-kpi-detail">{kpi.detalle}</span>
            {kpi.progreso !== null && (
              <div
                className="admin-kpi-meter"
                role="progressbar"
                aria-label={`${kpi.etiqueta}: ${kpi.progreso} %`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={kpi.progreso}
              >
                <span style={{ width: `${Math.min(100, Math.max(0, kpi.progreso))}%` }} />
              </div>
            )}
          </button>
        ))}
      </section>
    </>
  )
}

export default CabeceraGranja
