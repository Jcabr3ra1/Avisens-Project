import { IcAlert, IcPlus } from '../icons/icons'
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
              {g.status === 'empty' ? 'Sin lote · Limpieza' : `${g.aves.toLocaleString('es-CO')} aves · día ${g.dia}`}
            </span>
            {g.alertas > 0 && (
              <span className="dash-galpon-badge">
                <IcAlert size={10} /> {g.alertas}
              </span>
            )}
          </div>
        </button>
      )
    })}
    <button className="dash-galpon-add" title="Añadir galpón">
      <IcPlus size={18} />
    </button>
  </div>
)

export default GalponStrip
