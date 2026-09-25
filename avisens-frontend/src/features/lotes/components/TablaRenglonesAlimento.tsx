import type { RenglonDesglose } from '../api/plan-alimento'
import { etiquetaRenglon } from '../model/planAlimentoVista'

interface Props {
  renglones: RenglonDesglose[]
}

function TablaRenglonesAlimento({ renglones }: Props) {
  if (renglones.length === 0) return null

  return (
    <div className="tg-tabla-wrap">
      <table className="tg-tabla">
        <thead>
          <tr>
            <th scope="col">Etapa</th>
            <th scope="col">Días</th>
            <th scope="col">g / ave</th>
            <th scope="col">Total (kg)</th>
          </tr>
        </thead>
        <tbody>
          {renglones.map((renglon) => (
            <tr
              key={renglon.orden}
              className={renglon.tipo_alimento_id === null ? 'tg-fila-inactiva' : undefined}
            >
              <td>
                {etiquetaRenglon(renglon)}
                {renglon.extendido_hasta_dia_objetivo && (
                  <span className="tg-badge tg-badge--neutral">Extendido</span>
                )}
              </td>
              <td className="tg-num">
                {renglon.dia_inicio}–{renglon.dia_fin}
              </td>
              <td className="tg-num">{renglon.consumo_por_ave_g.toLocaleString()}</td>
              <td className="tg-num">{renglon.consumo_total_kg.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default TablaRenglonesAlimento
