import { IcBox, IcEgg, IcGrid, IcLeaf, IcServer } from '@shared/ui/icons/icons'
import type { KpiAdmin } from '../model/adminResumen'

type Props = {
  nombre: string
  fecha: string
  kpis: KpiAdmin[]
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

function AdminHero({ nombre, fecha, kpis }: Props) {
  return (
    <section className="admin-hero">
      <svg className="admin-hero-pattern" aria-hidden="true">
        <defs>
          <pattern id="adm-dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.9" fill="rgba(255,255,255,0.07)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#adm-dots)" />
      </svg>

      <div className="admin-hero-top">
        <div>
          <p className="admin-hero-eyebrow">Panel de administración · Avisens</p>
          <h1 className="admin-hero-title">Hola, {nombre}</h1>
        </div>
        <div className="admin-hero-badges">
          <div className="admin-hero-status">
            <span className="admin-hero-pulse" />
            <span>Sistema operativo</span>
          </div>
          <span className="admin-hero-fecha">{fecha}</span>
        </div>
      </div>

      <div className="admin-hero-kpis">
        {kpis.map((kpi) => (
          <div key={kpi.etiqueta} className="admin-hero-kpi">
            <div className="admin-hero-kpi-top">
              <span className="admin-hero-kpi-icon">{iconoKpi(kpi.icono)}</span>
            </div>
            <span className="admin-hero-kpi-valor">{kpi.valor}</span>
            <span className="admin-hero-kpi-label">{kpi.etiqueta}</span>
            <span className="admin-hero-kpi-sub">{kpi.detalle}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

export default AdminHero
