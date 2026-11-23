import { IcAlert, IcCheck, IcEgg, IcGrid } from '@shared/ui/icons/icons'
import type { ResumenGalponesDatos } from '../model/galponVista'

function ResumenGalpones({ resumen }: { resumen: ResumenGalponesDatos }) {
  return (
    <ul className="adm-kpis" aria-label="Resumen de galpones">
      <li>
        <div className="adm-kpi adm-kpi--primario">
          <span className="adm-kpi-cabecera">
            <span className="adm-kpi-etiqueta">Galpones</span>
            <span className="adm-kpi-icono" aria-hidden="true"><IcGrid size={16} /></span>
          </span>
          <strong className="adm-kpi-valor">{resumen.total.toLocaleString('es-CO')}</strong>
          <span className="adm-kpi-nota">Total registrados</span>
        </div>
      </li>
      <li>
        <div className="adm-kpi adm-kpi--ok">
          <span className="adm-kpi-cabecera">
            <span className="adm-kpi-etiqueta">Activos</span>
            <span className="adm-kpi-icono" aria-hidden="true"><IcCheck size={16} /></span>
          </span>
          <strong className="adm-kpi-valor">{resumen.activos.toLocaleString('es-CO')}</strong>
          <span className="adm-kpi-nota">Disponibles para producción</span>
        </div>
      </li>
      <li>
        <div className={`adm-kpi adm-kpi--${resumen.inactivos > 0 ? 'peligro' : 'ok'}`}>
          <span className="adm-kpi-cabecera">
            <span className="adm-kpi-etiqueta">Inactivos</span>
            <span className="adm-kpi-icono" aria-hidden="true"><IcAlert size={16} /></span>
          </span>
          <strong className="adm-kpi-valor">{resumen.inactivos.toLocaleString('es-CO')}</strong>
          <span className="adm-kpi-nota">{resumen.inactivos > 0 ? 'Fuera de servicio' : 'Todos operativos'}</span>
        </div>
      </li>
      <li>
        <div className="adm-kpi adm-kpi--info">
          <span className="adm-kpi-cabecera">
            <span className="adm-kpi-etiqueta">Capacidad total</span>
            <span className="adm-kpi-icono" aria-hidden="true"><IcEgg size={16} /></span>
          </span>
          <strong className="adm-kpi-valor">{resumen.capacidad.toLocaleString('es-CO')}</strong>
          <span className="adm-kpi-nota">Aves máximas alojables</span>
        </div>
      </li>
    </ul>
  )
}

export default ResumenGalpones
