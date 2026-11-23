import { IcCheck, IcDrop, IcSeed } from '@shared/ui/icons/icons'
import type { ConsumoDiario } from '../model/consumoDiario'
import { fechaDeHoy } from '@shared/utils/fechas'

function ResumenConsumos({ consumos }: { consumos: ConsumoDiario[] }) {
  const hoy = consumos.filter((consumo) => consumo.fecha.slice(0, 10) === fechaDeHoy())
  const alimento = hoy.reduce((total, consumo) => total + Number(consumo.alimento_kg ?? 0), 0)
  const agua = hoy.reduce((total, consumo) => total + Number(consumo.agua_litros ?? 0), 0)
  return (
    <ul className="adm-kpis adm-kpis--3" aria-label="Resumen de consumos de hoy">
      <li>
        <div className="adm-kpi adm-kpi--primario">
          <span className="adm-kpi-cab">
            <span className="adm-kpi-etiqueta">Registros hoy</span>
            <span className="adm-kpi-icono" aria-hidden="true"><IcCheck size={16} /></span>
          </span>
          <strong className="adm-kpi-valor">{hoy.length.toLocaleString('es-CO')}</strong>
          <span className="adm-kpi-nota">Apuntes del día</span>
        </div>
      </li>
      <li>
        <div className="adm-kpi adm-kpi--ok">
          <span className="adm-kpi-cab">
            <span className="adm-kpi-etiqueta">Alimento hoy</span>
            <span className="adm-kpi-icono" aria-hidden="true"><IcSeed size={16} /></span>
          </span>
          <strong className="adm-kpi-valor">{alimento.toLocaleString('es-CO')} kg</strong>
          <span className="adm-kpi-nota">Ración servida</span>
        </div>
      </li>
      <li>
        <div className="adm-kpi adm-kpi--info">
          <span className="adm-kpi-cab">
            <span className="adm-kpi-etiqueta">Agua hoy</span>
            <span className="adm-kpi-icono" aria-hidden="true"><IcDrop size={16} /></span>
          </span>
          <strong className="adm-kpi-valor">{agua.toLocaleString('es-CO')} L</strong>
          <span className="adm-kpi-nota">Hidratación diaria</span>
        </div>
      </li>
    </ul>
  )
}
export default ResumenConsumos
