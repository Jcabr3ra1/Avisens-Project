import { useState } from 'react'
import type { AnomaliasLote } from '@features/predicciones/api/predicciones'
import { IcCheck } from '@shared/ui/icons/icons'
import { etiquetaSeveridad, resumenDeAlertas } from '../model/confianza'

const LIMITE_ALERTAS_INICIAL = 3

type Props = {
  datos: AnomaliasLote | null
  error: string
  cargando: boolean
  diaSeleccionado: number
  onReintentar: () => void
  onSeleccionarDia: (dia: number) => void
}

function AlertasTempranas({ datos, error, cargando, diaSeleccionado, onReintentar, onSeleccionarDia }: Props) {
  const [desplegado, setDesplegado] = useState(false)
  const [oculto, setOculto] = useState(false)

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

  const total = datos.anomalias.length
  const hayMas = total > LIMITE_ALERTAS_INICIAL
  // Si el usuario selecciona un día específico en la regla que está más allá del límite,
  // mostramos todas para no ocultar la alerta activa.
  const indiceActivo = datos.anomalias.findIndex((a) => a.dia === diaSeleccionado)
  const debeMostrarTodas = desplegado || (indiceActivo >= LIMITE_ALERTAS_INICIAL)
  const alertasVisibles = debeMostrarTodas ? datos.anomalias : datos.anomalias.slice(0, LIMITE_ALERTAS_INICIAL)

  return (
    <section className="gdc-alertas" aria-label="Alertas tempranas del lote">
      <div className="gdc-alertas-cabecera">
        <p className={`gdc-alertas-resumen gdc-alertas-resumen--${datos.resumen.severidad_maxima}`} role="status">
          {resumenDeAlertas(datos.resumen)}
        </p>
        <button
          type="button"
          className="gdc-alertas-btn-accion"
          onClick={() => setOculto((prev) => !prev)}
          aria-expanded={!oculto}
        >
          {oculto ? 'Mostrar alertas' : 'Ocultar'}
        </button>
      </div>

      {!oculto && (
        <>
          <ul className="gdc-alertas-lista">
            {alertasVisibles.map((alerta) => (
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
          {hayMas && (
            <div className="gdc-alertas-pie">
              <button
                type="button"
                className="gdc-alertas-btn-accion"
                onClick={() => setDesplegado((prev) => !prev)}
                aria-expanded={debeMostrarTodas}
              >
                {debeMostrarTodas
                  ? `Mostrar menos (primeras ${LIMITE_ALERTAS_INICIAL})`
                  : `Ver todas las alertas (${total})`}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default AlertasTempranas
