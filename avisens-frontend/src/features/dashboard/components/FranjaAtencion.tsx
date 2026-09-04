import { useNavigate } from 'react-router-dom'
import { IcAlert, IcChevronRight, IcHeart, IcServer, IcSparkle } from '@shared/ui/icons/icons'
import type { ChipAtencion } from '../model/atencion'

const ICONOS: Record<string, React.ReactNode> = {
  alertas: <IcAlert size={14} />,
  sensores: <IcServer size={14} />,
  mortalidad: <IcHeart size={14} />,
  curva: <IcSparkle size={14} />,
}

function FranjaAtencion({ chips }: { chips: ChipAtencion[] }) {
  const navigate = useNavigate()
  // Cuando nada reclama atención, la franja lo dice y baja el tono en vez de
  // seguir gritando "Atención hoy" sobre cuatro ceros.
  const todoEnOrden = chips.every((chip) => chip.tono === 'ok' || chip.tono === 'info')

  return (
    <section
      className={`dash-atencion${todoEnOrden ? ' es-en-orden' : ''}`}
      aria-label="Resumen de atención de hoy"
    >
      <div className="dash-atencion-rotulo">
        <span className="dash-atencion-punto" />
        {todoEnOrden ? 'Todo en orden' : 'Atención hoy'}
      </div>

      <div className="dash-atencion-chips">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className={`dash-chip dash-chip--${chip.tono}`}
            onClick={() => navigate(chip.destino)}
          >
            <span className="dash-chip-icono">{ICONOS[chip.id]}</span>
            <span className="dash-chip-cuerpo">
              <span className="dash-chip-linea">
                <span className="dash-chip-valor mono">{chip.valor}</span>
                <span className="dash-chip-etiqueta">{chip.etiqueta}</span>
              </span>
              <span className="dash-chip-detalle">{chip.detalle}</span>
            </span>
            <span className="dash-chip-flecha"><IcChevronRight size={11} /></span>
          </button>
        ))}
      </div>
    </section>
  )
}

export default FranjaAtencion
