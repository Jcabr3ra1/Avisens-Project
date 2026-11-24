import { IcBox, IcCheck, IcClock, IcEgg } from '@shared/ui/icons/icons'
import type { ResumenLotesDatos } from '../model/loteVista'

function ResumenLotes({ resumen }: { resumen: ResumenLotesDatos }) {
  return (
    <ul className="adm-kpis" aria-label="Resumen de lotes">
      <li>
        <div className="adm-kpi adm-kpi--primario">
          <span className="adm-kpi-cab">
            <span className="adm-kpi-etiqueta">Lotes</span>
            <span className="adm-kpi-icono" aria-hidden="true"><IcBox size={16} /></span>
          </span>
          <strong className="adm-kpi-valor">{resumen.total.toLocaleString('es-CO')}</strong>
          <span className="adm-kpi-nota">
            {resumen.inactivos > 0 ? `${resumen.inactivos} inactivos` : 'Histórico registrado'}
          </span>
        </div>
      </li>
      <li>
        <div className="adm-kpi adm-kpi--ok">
          <span className="adm-kpi-cab">
            <span className="adm-kpi-etiqueta">Activos</span>
            <span className="adm-kpi-icono" aria-hidden="true"><IcCheck size={16} /></span>
          </span>
          <strong className="adm-kpi-valor">{resumen.activos.toLocaleString('es-CO')}</strong>
          <span className="adm-kpi-nota">En crianza actualmente</span>
        </div>
      </li>
      <li>
        <div className="adm-kpi adm-kpi--alerta">
          <span className="adm-kpi-cab">
            <span className="adm-kpi-etiqueta">Finalizados</span>
            <span className="adm-kpi-icono" aria-hidden="true"><IcClock size={16} /></span>
          </span>
          <strong className="adm-kpi-valor">{resumen.finalizados.toLocaleString('es-CO')}</strong>
          <span className="adm-kpi-nota">Ciclos cerrados</span>
        </div>
      </li>
      <li>
        <div className="adm-kpi adm-kpi--info">
          <span className="adm-kpi-cab">
            <span className="adm-kpi-etiqueta">Aves alojadas</span>
            <span className="adm-kpi-icono" aria-hidden="true"><IcEgg size={16} /></span>
          </span>
          <strong className="adm-kpi-valor">{resumen.avesAlojadas.toLocaleString('es-CO')}</strong>
          <span className="adm-kpi-nota">Total en lotes activos</span>
        </div>
      </li>
    </ul>
  )
}

export default ResumenLotes
