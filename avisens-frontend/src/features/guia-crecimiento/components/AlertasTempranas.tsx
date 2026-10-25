import type { AnomaliasLote } from '@features/predicciones/api/predicciones'
import { IcCheck } from '@shared/ui/icons/icons'
import { etiquetaSeveridad, resumenDeAlertas } from '../model/confianza'

type Props = {
  datos: AnomaliasLote | null
  error: string
  cargando: boolean
  diaSeleccionado: number
  onReintentar: () => void
  onSeleccionarDia: (dia: number) => void
}

function AlertasTempranas({ datos, error, cargando, diaSeleccionado, onReintentar, onSeleccionarDia }: Props) {
  if (cargando) {
    return <p className="gdc-alertas-estado" role="status">Revisando pesos, consumo y mortalidad…</p>
  }
  if (error) {
    return (
      <div className="guia-error" role="alert">
        <span>{error}</span>
        <button type="button" onClick={onReintentar}>Reintentar</button>
      </div>
    )
  }
  if (!datos) return null

  if (datos.anomalias.length === 0) {
    return (
      <p className="gdc-alertas-estado gdc-alertas-estado--limpio" role="status">
        <IcCheck size={16} aria-hidden="true" />
        {resumenDeAlertas(datos.resumen)}
      </p>
    )
  }

  return (
    <section className="gdc-alertas" aria-label="Alertas tempranas del lote">
      <p className={`gdc-alertas-resumen gdc-alertas-resumen--${datos.resumen.severidad_maxima}`} role="status">
        {resumenDeAlertas(datos.resumen)}
      </p>
      <ul className="gdc-alertas-lista">
        {datos.anomalias.map((alerta) => (
          <li key={`${alerta.tipo}-${alerta.dia}`}>
            <button
              type="button"
              className={`gdc-alerta gdc-alerta--${alerta.severidad}`}
              aria-pressed={alerta.dia === diaSeleccionado}
              onClick={() => onSeleccionarDia(alerta.dia)}
            >
              <span className="gdc-alerta-etiqueta">{etiquetaSeveridad(alerta.severidad)}</span>
              <span className="gdc-alerta-dia">Día {alerta.dia}</span>
              <span className="gdc-alerta-mensaje">{alerta.mensaje}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default AlertasTempranas
