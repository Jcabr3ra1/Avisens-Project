// GalponStrip.tsx — Tira horizontal de cards de galpones
// Muestra los 4 galpones de la granja con semáforo de estado
// Al hacer click selecciona el galpón y actualiza todo el dashboard
import { IcAlert, IcPlus } from '@shared/ui/icons/icons'
import type { Galpon } from '../../model'
import './GalponStrip.css'

type Props = {
  galpones: Galpon[]
  active: number
  setActive: (id: number) => void
}

const GalponStrip = ({ galpones, active, setActive }: Props) => (
  <div className="dash-galpon-strip">
    {galpones.map((g) => {
      const on = g.id === active
      const statusColor =
        g.status === 'ok' ? 'var(--green)' :
        g.status === 'warn' ? 'var(--amber)' :
        'var(--text4)'
      const occupancy = g.status === 'empty' ? 0 : Math.min(100, Math.round((g.aves / 20000) * 100))

      return (
        <button
          key={g.id}
          onClick={() => setActive(g.id)}
          className={`dash-galpon-card${on ? ' active' : ''}${g.status === 'empty' ? ' empty' : ''}`}
        >
          <div className="dash-galpon-card-head">
            <div className="dash-galpon-card-title">
              <span
                className="dot"
                style={{
                  background: statusColor,
                  boxShadow: g.status === 'ok' ? '0 0 0 3px rgba(16, 185, 129, 0.18)' : 'none',
                }}
              />
              <span>{g.nombre}</span>
            </div>
            <span className="mono dash-galpon-card-code">{g.codigo}</span>
          </div>
          <div className="dash-galpon-card-info">
            <span>
              {g.status === 'empty' ? 'Vacío · en limpieza' : `${g.aves.toLocaleString('es-CO')} aves · día ${g.dia}`}
            </span>
            {g.alertas > 0 && (
              <span className="dash-galpon-badge">
                <IcAlert size={10} /> {g.alertas}
              </span>
            )}
          </div>
          <span className="dash-galpon-meter" aria-hidden="true">
            <span style={{ width: `${occupancy}%`, background: statusColor }} />
          </span>
        </button>
      )
    })}
    <button className="dash-galpon-add" title="Agregar galpón">
      <IcPlus size={18} />
    </button>
  </div>
)

export default GalponStrip
