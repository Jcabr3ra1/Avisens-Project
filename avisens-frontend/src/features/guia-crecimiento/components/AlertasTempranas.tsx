import { useAnomaliasLote } from '../hooks/useAnomaliasLote'
import { etiquetaSeveridad, resumenDeAlertas } from '../model/confianza'
import './AlertasTempranas.css'

type Props = {
  loteId: number
  habilitado: boolean
}

function AlertasTempranas({ loteId, habilitado }: Props) {
  const { datos, error, cargando, recargar } = useAnomaliasLote(loteId, habilitado)

  return (
    <section className="adm-panel guia-panel gat" aria-labelledby="gat-titulo">
      <div>
        <span className="adm-eyebrow">Alertas tempranas</span>
        <h2 id="gat-titulo">Lo que el lote te está avisando</h2>
      </div>
      {cargando ? (
        <p className="guia-cargando" role="status">Revisando pesos, consumo y mortalidad…</p>
      ) : error ? (
        <div className="guia-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={recargar}>Reintentar</button>
        </div>
      ) : datos ? (
        <>
          <p className={`gat-resumen gat-resumen--${datos.resumen.severidad_maxima}`} role="status">
            {resumenDeAlertas(datos.resumen)}
          </p>
          {datos.anomalias.length > 0 && (
            <ul className="gat-lista">
              {datos.anomalias.map((alerta) => (
                <li key={`${alerta.tipo}-${alerta.dia}`} className={`gat-item gat-item--${alerta.severidad}`}>
                  <span className="gat-etiqueta">{etiquetaSeveridad(alerta.severidad)}</span>
                  <span className="gat-dia">Día {alerta.dia}</span>
                  <span className="gat-mensaje">{alerta.mensaje}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </section>
  )
}

export default AlertasTempranas
