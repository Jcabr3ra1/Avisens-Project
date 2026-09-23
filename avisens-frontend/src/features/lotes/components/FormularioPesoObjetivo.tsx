import { useState, type FormEvent } from 'react'
import '@shared/ui/Modal/Modal.css'
import { mensajeDeError } from '@shared/utils/errores'
import { gramosALibras, librasAGramos } from '../model/pesoObjetivo'

interface Props {
  pesoActualG: number | null
  onEnviar: (pesoObjetivoG: number) => Promise<unknown>
}

function FormularioPesoObjetivo({ pesoActualG, onEnviar }: Props) {
  const [libras, setLibras] = useState(
    pesoActualG !== null ? gramosALibras(pesoActualG).toFixed(2) : '',
  )
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  async function manejarSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const valor = Number(libras)
    if (!libras || Number.isNaN(valor) || valor <= 0) {
      setError('Ingresa un peso objetivo válido, en libras.')
      return
    }
    setError('')
    setEnviando(true)
    try {
      await onEnviar(librasAGramos(valor))
    } catch (fallo) {
      setError(mensajeDeError(fallo, 'No se pudo guardar el peso objetivo.'))
    } finally {
      setEnviando(false)
    }
  }

  const librasNumero = Number(libras)
  const gramosPrevios = libras !== '' && librasNumero > 0 ? librasAGramos(librasNumero) : null

  return (
    <form className="pdl-form" onSubmit={(evento) => void manejarSubmit(evento)}>
      <label className="modal-campo">
        <span>Peso objetivo (libras)</span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={libras}
          onChange={(evento) => setLibras(evento.target.value)}
          required
        />
        {gramosPrevios !== null && (
          <small className="modal-ayuda">Equivale a {gramosPrevios.toLocaleString()} g</small>
        )}
      </label>
      <button type="submit" className="modal-btn modal-btn--primary" disabled={enviando}>
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
