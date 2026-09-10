import { IcBox, IcEgg, IcGrid, IcLeaf, IcServer } from '@shared/ui/icons/icons'
import type { KpiAdmin } from '../model/adminResumen'

type Props = {
  nombre: string
  fecha: string
  kpis: KpiAdmin[]
  cargando: boolean
}

function iconoKpi(icono: KpiAdmin['icono']) {
  const iconos = {
    granja: <IcLeaf size={16} />,
    galpon: <IcBox size={16} />,
    aves: <IcEgg size={16} />,
    sensor: <IcServer size={16} />,
  }
  return iconos[icono] ?? <IcGrid size={16} />
}

function AdminHero({ nombre, fecha, kpis, cargando }: Props) {
  return (
    <>
      <header className="admin-header">
        <div>
          <p className="admin-header-eyebrow">Panel de administración</p>
          <h1 className="admin-header-title">Buen día, {nombre}</h1>
          <p className="admin-header-subtitle">Revisa lo prioritario y continúa con la gestión de Avisens.</p>
        </div>
        <time className="admin-header-date">{fecha}</time>
      </header>

      <section className="admin-kpis" aria-label="Estado general" aria-busy={cargando}>
        {kpis.map((kpi) => (
          <article key={kpi.etiqueta} className="admin-kpi">
            <span className="admin-kpi-icon" aria-hidden="true">{iconoKpi(kpi.icono)}</span>
            <div className="admin-kpi-copy">
              <span className="admin-kpi-label">{kpi.etiqueta}</span>
              <strong className="admin-kpi-value">{cargando ? '—' : kpi.valor}</strong>
              <span className="admin-kpi-detail">{cargando ? 'Actualizando datos…' : kpi.detalle}</span>
            </div>
          </article>
        ))}
      </section>
    </>
  )
}

export default AdminHero
