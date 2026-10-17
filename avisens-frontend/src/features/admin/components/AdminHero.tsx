import * as Tooltip from '@radix-ui/react-tooltip'
import { IcArrowRight, IcRefresh } from '@shared/ui/icons/icons'
import type { KpiAdmin } from '../model/adminResumen'
import '@shared/ui/admin/AdminKit.css'

type Props = {
  nombre: string
  fecha: string
  kpis: KpiAdmin[]
  cargando: boolean
  sincronizando: boolean
  onSincronizar: () => void
  onNavegarKpi: (icono: KpiAdmin['icono']) => void
}

function destinoAyudaKpi(icono: KpiAdmin['icono']): string {
  const destinos = {
    organizacion: 'Ir al directorio de organizaciones',
    usuarios: 'Ir a gestión de personas y accesos',
    soporte: 'Ir a bandeja de soporte y accesos pendientes',
    sensor: 'Revisar telemetría por organización',
  }
  return destinos[icono]
}

function AdminHero({
  nombre,
  fecha,
  kpis,
  cargando,
  sincronizando,
  onSincronizar,
  onNavegarKpi,
}: Props) {
  return (
    <>
      <header className="admin-header">
        <div className="admin-header-copy">
          <span className="adm-eyebrow">
            <span className="adm-eyebrow-punto" aria-hidden="true" />
            Panel admin · Hoy
          </span>
          <h1 className="admin-header-title">Centro de control</h1>
          <p className="admin-header-subtitle">
            Hola, {nombre}. Supervisa la atención pendiente, las organizaciones clientes y el embudo comercial.
          </p>
        </div>

        <div className="admin-header-controls">
          <time className="admin-header-date">{fecha}</time>
          <button
            type="button"
            className={`admin-sync-btn${sincronizando ? ' is-spinning' : ''}`}
            onClick={onSincronizar}
            disabled={sincronizando}
          >
            <IcRefresh size={15} aria-hidden="true" />
            <span>{sincronizando ? 'Actualizando…' : 'Actualizar datos'}</span>
          </button>
        </div>
      </header>

      <section className="admin-kpis" aria-label="Indicadores generales de la plataforma" aria-busy={cargando}>
        {kpis.map((kpi) => (
          <Tooltip.Root key={kpi.etiqueta}>
            <Tooltip.Trigger asChild>
              <button
                type="button"
                className="admin-kpi"
                onClick={() => onNavegarKpi(kpi.icono)}
              >
                <span className="admin-kpi-head-row">
                  <span className="admin-kpi-label">{kpi.etiqueta}</span>
                  <IcArrowRight size={13} className="admin-kpi-go" aria-hidden="true" />
                </span>
                <strong className="admin-kpi-value">
                  {cargando ? '—' : kpi.valor}
                </strong>
                <span className="admin-kpi-detail">
                  {cargando ? 'Actualizando datos…' : kpi.detalle}
                </span>
                {!cargando && kpi.progreso !== null && kpi.progresoTexto && (
                  <div
                    className="admin-kpi-meter"
                    role="progressbar"
                    aria-label={kpi.progresoTexto}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={kpi.progreso}
                  >
                    <span style={{ width: `${Math.min(100, Math.max(0, kpi.progreso))}%` }} />
                  </div>
                )}
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content className="admin-tooltip" side="bottom" sideOffset={6}>
                {kpi.progresoTexto ? `${kpi.progresoTexto} · ` : ''}
                {destinoAyudaKpi(kpi.icono)}
                <Tooltip.Arrow className="admin-tooltip-arrow" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        ))}
      </section>
    </>
  )
}

export default AdminHero
