import { useState, type FormEvent } from 'react'
import Modal from '@shared/ui/Modal/Modal'
import { mensajeDeError } from '@shared/utils/errores'
import {
  CRITICIDADES_UMBRAL,
  type CrearUmbralPayload,
  type RevisarUmbralPayload,
  type Umbral,
} from '../api/umbrales'
import { etiquetaSemana } from '../model/umbralVista'

type Props = {
  galponId: number
  variable: string
  semana: number
  unidadSugerida: string
  existente: Umbral | null
  onCrear: (payload: CrearUmbralPayload) => Promise<void>
  onRevisar: (id: number, payload: RevisarUmbralPayload) => Promise<void>
  onCerrar: () => void
}

const ID_FORMULARIO = 'formulario-umbral'

function FormularioUmbral({
  galponId, variable, semana, unidadSugerida, existente,
  onCrear, onRevisar, onCerrar,
}: Props) {
  const [minimo, setMinimo] = useState(existente ? String(existente.valor_minimo) : '')
  const [maximo, setMaximo] = useState(existente ? String(existente.valor_maximo) : '')
  const [unidad, setUnidad] = useState(existente?.unidad ?? unidadSugerida)
  const [criticidad, setCriticidad] = useState(existente?.criticidad ?? 'media')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const min = Number(minimo)
    const max = Number(maximo)
    if (minimo === '' || maximo === '' || Number.isNaN(min) || Number.isNaN(max)) {
      setError('El mínimo y el máximo son obligatorios.')
      return
    }
    if (min >= max) {
      setError('El mínimo tiene que ser menor que el máximo.')
      return
    }
    if (!unidad.trim()) {
      setError('Falta la unidad de medida.')
      return
    }

    setGuardando(true)
    setError('')
    try {
      if (existente) {
        await onRevisar(existente.id, {
          valor_minimo: min,
          valor_maximo: max,
          unidad: unidad.trim(),
          criticidad,
        })
      } else {
        await onCrear({
          galpon_id: galponId,
          variable,
          semana_vida: semana,
          valor_minimo: min,
          valor_maximo: max,
          unidad: unidad.trim(),
          criticidad,
        })
      }
      onCerrar()
    } catch (problema) {
      setError(mensajeDeError(problema, 'No se pudo guardar el umbral.'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      titulo={existente ? 'Revisar umbral' : 'Nuevo umbral'}
      subtitulo={`${variable} · ${etiquetaSemana(semana)} de vida del lote`}
      onCerrar={onCerrar}
      acciones={
        <>
          <button type="button" className="modal-btn" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          <button type="submit" form={ID_FORMULARIO} className="modal-btn modal-btn--primary" disabled={guardando}>
            {guardando ? 'Guardando…' : existente ? 'Guardar revisión' : 'Crear umbral'}
          </button>
        </>
      }
    >
      <form id={ID_FORMULARIO} onSubmit={(evento) => void enviar(evento)}>
        <div className="modal-fila">
          <label className="modal-campo">
            <span>Mínimo</span>
            <input type="number" step="any" value={minimo} onChange={(e) => setMinimo(e.target.value)} required autoFocus />
          </label>
          <label className="modal-campo">
            <span>Máximo</span>
            <input type="number" step="any" value={maximo} onChange={(e) => setMaximo(e.target.value)} required />
          </label>
          <label className="modal-campo">
            <span>Unidad</span>
            <input value={unidad} onChange={(e) => setUnidad(e.target.value)} required />
          </label>
        </div>

        <label className="modal-campo">
          <span>Criticidad</span>
          <select value={criticidad} onChange={(e) => setCriticidad(e.target.value)}>
            {CRITICIDADES_UMBRAL.map((nivel) => (
              <option key={nivel} value={nivel}>
                {nivel.charAt(0).toUpperCase() + nivel.slice(1)}
              </option>
            ))}
          </select>
          {/* Dejó de ser decorativa: ahora manda en lo grave que sale la alerta
              y el desvío de la lectura solo la matiza. */}
          <small className="modal-ayuda">
            Decide lo grave que sale la alerta cuando una lectura se sale de este
            rango. El desvío solo la matiza.
          </small>
        </label>

        {existente && (
          <p className="modal-ayuda">
            No se sobrescribe: se crea la versión {existente.version + 1} y la
            anterior queda jubilada. Así se sabe qué rango estaba vigente cuando
            saltó cada alerta.
          </p>
        )}

        {error && <p className="modal-error" role="alert">{error}</p>}
      </form>
    </Modal>
  )
}

export default FormularioUmbral
