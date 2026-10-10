import { IcAlert, IcGrid, IcServer, IcUserCircle, IcUsers } from '@shared/ui/icons/icons'
import type { KpiAdmin } from '../model/adminResumen'

type Props = {
  nombre: string
  fecha: string
  kpis: KpiAdmin[]
  cargando: boolean
}

function iconoKpi(icono: KpiAdmin['icono']) {
  const iconos = {
    organizacion: <IcUsers size={16} />,
    usuarios: <IcUserCircle size={16} />,
    soporte: <IcAlert size={16} />,
    sensor: <IcServer size={16} />,
  }
  return iconos[icono] ?? <IcGrid size={16} />
}

function AdminHero({ nombre, fecha, kpis, cargando }: Props) {
  return (
    <>
      <header className="admin-header">
        <div>
          <h1 className="admin-header-title">Centro de control</h1>
          <p className="admin-header-subtitle">Hola, {nombre}. Supervisa clientes, accesos y prioridades de la plataforma desde un solo lugar.</p>
        </div>
        <div className="admin-header-context">
          <span>Vista administrativa</span>
          <time className="admin-header-date">{fecha}</time>
        </div>
      </header>

      <section className="admin-kpis" aria-label="Estado general" aria-busy={cargando}>
        {kpis.map((kpi) => (
          <article key={kpi.etiqueta} className="admin-kpi">
            <span className="admin-kpi-icon" aria-hidden="true">{iconoKpi(kpi.icono)}</span>
            <div className="admin-kpi-copy">
              <span className="admin-kpi-label">{kpi.etiqueta}</span>
              <strong className="admin-kpi-value">{cargando ? '—' : kpi.valor}</strong>
              <span className="admin-kpi-detail">{cargando ? 'Actualizando datos…' : kpi.detalle}</span>
              {!cargando && kpi.progreso !== null && kpi.progresoTexto && (
                <div
                  className="admin-kpi-meter"
                  role="progressbar"
                  aria-label={kpi.progresoTexto}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={kpi.progreso}
                >
                  <span style={{ transform: `scaleX(${kpi.progreso / 100})` }} />
                </div>
              )}
            </div>
          </article>
        ))}
      </section>
    </>
  )
}

export default AdminHero
