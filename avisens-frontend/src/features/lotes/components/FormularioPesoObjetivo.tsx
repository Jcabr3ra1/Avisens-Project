import { useState, type FormEvent } from 'react'
import '@shared/ui/Modal/Modal.css'
import { mensajeDeError } from '@shared/utils/errores'
import { gramosALibras, validarPesoObjetivo } from '../model/pesoObjetivo'

interface Props {
  pesoActualG: number | null
  onEnviar: (pesoObjetivoG: number) => Promise<unknown>
  minLibras?: number
  deshabilitado?: boolean
}

function FormularioPesoObjetivo({ pesoActualG, onEnviar, minLibras = 0, deshabilitado = false }: Props) {
  const [libras, setLibras] = useState(
    pesoActualG !== null ? gramosALibras(pesoActualG).toFixed(2) : '',
  )
  // Solo true si el usuario tocó el campo -- distingue "reenviar tal cual"
  // de "convertir lo que hay", ver pesoAEnviar en pesoObjetivo.ts.
  const [editado, setEditado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  async function manejarSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (deshabilitado || enviando) return
    const gramos = validarPesoObjetivo(pesoActualG, editado, libras, minLibras)
    if (gramos === null) {
      setError(minLibras > 0
        ? `Ingresa un peso objetivo de al menos ${minLibras.toFixed(2)} lb.`
        : 'Ingresa un peso objetivo positivo válido, en libras.')
      return
    }
    setError('')
    setEnviando(true)
    try {
      await onEnviar(gramos)
    } catch (fallo) {
      setError(mensajeDeError(fallo, fallo instanceof Error ? fallo.message : 'No se pudo guardar el peso objetivo.'))
    } finally {
      setEnviando(false)
    }
  }

  const gramosPrevios = validarPesoObjetivo(null, true, libras)

  return (
    <form className="pdl-form" onSubmit={(evento) => void manejarSubmit(evento)}>
      <label className="modal-campo">
        <span>Peso objetivo (libras)</span>
        <input
          type="text"
          inputMode="decimal"
          disabled={deshabilitado || enviando}
          value={libras}
          onChange={(evento) => {
            setLibras(evento.target.value)
            setEditado(true)
          }}
          required
        />
        {gramosPrevios !== null && (
          <small className="modal-ayuda">Equivale a {gramosPrevios.toLocaleString()} g</small>
        )}
      </label>
      <button type="submit" className="modal-btn modal-btn--primary" disabled={deshabilitado || enviando}>
        {enviando ? 'Guardando…' : pesoActualG !== null ? 'Cambiar objetivo' : 'Calcular plan'}
      </button>
      {error && (
        <p className="modal-error" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}

export default FormularioPesoObjetivo
