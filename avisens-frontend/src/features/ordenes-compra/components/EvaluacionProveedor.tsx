import { useId, useState } from 'react'
import { mensajeDeError } from '@shared/utils/errores'
import {
  CRITERIOS_EVALUACION,
  ETIQUETA_SEMAFORO,
  NOTA_MAXIMA,
  NOTA_MINIMA,
  notaValida,
  promedioDeOrden,
  semaforoDe,
  type Calificaciones,
  type CriterioEvaluacion,
} from '../model/evaluacionProveedor'
import type { OrdenCompra } from '../model/ordenCompra'

type Props = {
  orden: OrdenCompra
  onCalificar: (calificaciones: Calificaciones) => Promise<unknown>
}

type Borrador = Record<CriterioEvaluacion, number | null>

const NOTAS = Array.from({ length: NOTA_MAXIMA - NOTA_MINIMA + 1 }, (_, i) => NOTA_MINIMA + i)

function borradorDe(orden: OrdenCompra): Borrador {
  // Las notas viejas pueden venir con decimales o en 0: se redondean al
  // valor más cercano de la escala para que el formulario las muestre.
  const nota = (valor: number | null) =>
    valor === null ? null : Math.min(NOTA_MAXIMA, Math.max(NOTA_MINIMA, Math.round(valor)))
  return {
    calificacion_cumplimiento: nota(orden.calificacion_cumplimiento),
    calificacion_calidad: nota(orden.calificacion_calidad),
    calificacion_tiempo: nota(orden.calificacion_tiempo),
  }
}

// HU-32 · escenario 2: evaluar al proveedor cuando el pedido ya llegó.
function EvaluacionProveedor({ orden, onCalificar }: Props) {
  const id = useId()
  const promedioGuardado = promedioDeOrden(orden)
  const [editando, setEditando] = useState(promedioGuardado === null)
  const [borrador, setBorrador] = useState<Borrador>(() => borradorDe(orden))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const completo = CRITERIOS_EVALUACION.every(({ campo }) => notaValida(borrador[campo]))
  const promedioBorrador = completo ? promedioDeOrden(borrador) : null

  async function guardar() {
    if (!completo) {
      setError('Califica los tres criterios antes de guardar.')
      return
    }
    setGuardando(true)
    setError('')
    try {
      await onCalificar(borrador as Calificaciones)
      setEditando(false)
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo guardar la evaluación.'))
    } finally {
      setGuardando(false)
    }
  }

  if (!editando && promedioGuardado !== null) {
    const semaforo = semaforoDe(promedioGuardado)
    return (
      <section className="oc-evaluacion" aria-labelledby={`${id}-titulo`}>
        <div className="oc-evaluacion-cabecera">
          <h3 id={`${id}-titulo`}>Evaluación del proveedor</h3>
          <span className={`oc-semaforo oc-semaforo--${semaforo}`}>
            <span className="oc-semaforo-luz" aria-hidden="true" />
            {promedioGuardado.toLocaleString('es-CO')} / {NOTA_MAXIMA} · {ETIQUETA_SEMAFORO[semaforo]}
          </span>
        </div>
        <dl className="oc-evaluacion-notas">
          {CRITERIOS_EVALUACION.map(({ campo, etiqueta }) => (
            <div key={campo}>
              <dt>{etiqueta}</dt>
              <dd>{Number(orden[campo]).toLocaleString('es-CO')} / {NOTA_MAXIMA}</dd>
            </div>
          ))}
        </dl>
        <button type="button" className="oc-evaluacion-editar" onClick={() => setEditando(true)}>
          Cambiar evaluación
        </button>
      </section>
    )
  }

  return (
    <section className="oc-evaluacion" aria-labelledby={`${id}-titulo`}>
      <div className="oc-evaluacion-cabecera">
        <h3 id={`${id}-titulo`}>Evaluar al proveedor</h3>
        {promedioBorrador !== null && (
          <span className={`oc-semaforo oc-semaforo--${semaforoDe(promedioBorrador)}`}>
            <span className="oc-semaforo-luz" aria-hidden="true" />
            {promedioBorrador.toLocaleString('es-CO')} / {NOTA_MAXIMA}
          </span>
        )}
      </div>
      <p>El pedido ya llegó. Califica de {NOTA_MINIMA} (muy malo) a {NOTA_MAXIMA} (excelente).</p>

      {CRITERIOS_EVALUACION.map(({ campo, etiqueta, ayuda }) => (
        <fieldset key={campo} className="oc-criterio" disabled={guardando}>
          <legend>
            {etiqueta}
            <small>{ayuda}</small>
          </legend>
          <div className="oc-notas" role="radiogroup" aria-label={etiqueta}>
            {NOTAS.map((nota) => (
              <label key={nota} className={`oc-nota${borrador[campo] === nota ? ' is-elegida' : ''}`}>
                <input
                  type="radio"
                  name={`${id}-${campo}`}
                  value={nota}
                  checked={borrador[campo] === nota}
                  onChange={() => {
                    setBorrador((actual) => ({ ...actual, [campo]: nota }))
                    setError('')
                  }}
                />
                {nota}
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      {error && <p className="oc-error-formulario" role="alert">{error}</p>}

      <div className="oc-evaluacion-acciones">
        {promedioGuardado !== null && (
          <button
            type="button"
            className="oc-evaluacion-editar"
            disabled={guardando}
            onClick={() => { setBorrador(borradorDe(orden)); setEditando(false); setError('') }}
          >
            Cancelar
          </button>
        )}
        <button type="button" className="oc-boton-principal" disabled={guardando || !completo} onClick={() => void guardar()}>
          {guardando ? 'Guardando…' : 'Guardar evaluación'}
        </button>
      </div>
    </section>
  )
}

export default EvaluacionProveedor
