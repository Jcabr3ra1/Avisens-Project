import type { ResultadoPrediccion } from '@features/predicciones/api/predicciones'
import { etiquetaConfianza, textoDeRango } from '../model/confianza'
import './AlertasTempranas.css'

type Props = {
  resultado: ResultadoPrediccion
}

function ConfianzaProyeccion({ resultado }: Props) {
  const modelo = resultado.modelos?.peso
  const rango = textoDeRango(resultado.rango, 'peso')
  const nivel = etiquetaConfianza(modelo?.nivel_confianza)
  const motivos = modelo?.motivos ?? []
  if (!rango && !nivel) return null

  return (
    <div className="gcf" role="group" aria-label="Qué tan firme es esta proyección">
      {rango && <p className="gcf-rango">{rango}</p>}
      {nivel && modelo?.nivel_confianza && (
        <span className={`gcf-nivel gcf-nivel--${modelo.nivel_confianza}`}>{nivel}</span>
      )}
      {motivos.length > 0 && (
        <ul className="gcf-motivos">
          {motivos.map((motivo) => <li key={motivo}>{motivo}</li>)}
        </ul>
      )}
    </div>
  )
}

export default ConfianzaProyeccion
