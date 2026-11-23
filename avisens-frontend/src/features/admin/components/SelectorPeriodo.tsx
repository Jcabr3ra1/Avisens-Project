import { PERIODOS, type PeriodoDias } from '../model/metricas'

type Props = {
  valor: PeriodoDias
  onCambiar: (dias: PeriodoDias) => void
}

function SelectorPeriodo({ valor, onCambiar }: Props) {
  return (
    <fieldset className="cdc-periodo">
      <legend className="cdc-solo-lectores">Periodo de las gráficas</legend>
      {PERIODOS.map((dias) => (
        <label key={dias} className={dias === valor ? 'is-activo' : undefined}>
          <input
            type="radio"
            name="cdc-periodo"
            value={dias}
            checked={dias === valor}
            onChange={() => onCambiar(dias)}
          />
          <span>{dias} días</span>
        </label>
      ))}
    </fieldset>
  )
}

export default SelectorPeriodo
