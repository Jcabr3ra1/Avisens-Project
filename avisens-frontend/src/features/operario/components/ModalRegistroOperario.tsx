import { useEffect, useRef, useState, type FormEvent } from 'react'
import { IcClose, IcHeart, IcSeed } from '@shared/ui/icons/icons'
import type { JornadaOperario } from '../model/jornadaOperario'

type TipoRegistro = 'mortalidad' | 'consumo'

type Props = {
  tipo: TipoRegistro
  jornada: JornadaOperario
  guardando: boolean
  onCerrar: () => void
  onRegistrarMortalidad: (
    loteId: number,
    registro: { fecha: string; cantidad_aves: number; causa_presuntiva?: string; disposicion?: string },
  ) => Promise<void>
  onRegistrarConsumo: (
    loteId: number,
    registro: { fecha: string; alimento_kg?: number; agua_litros?: number },
  ) => Promise<void>
}

function fechaActual() {
  return new Date().toISOString().slice(0, 10)
}

function ModalRegistroOperario({
  tipo,
  jornada,
  guardando,
  onCerrar,
  onRegistrarMortalidad,
  onRegistrarConsumo,
}: Props) {
  const campoRef = useRef<HTMLInputElement>(null)
  const [fecha, setFecha] = useState(fechaActual)
  const [cantidadAves, setCantidadAves] = useState('')
  const [causa, setCausa] = useState('')
  const [disposicion, setDisposicion] = useState('')
  const [alimento, setAlimento] = useState('')
  const [agua, setAgua] = useState('')
  const [error, setError] = useState('')
  const esMortalidad = tipo === 'mortalidad'
  const lote = jornada.lote

  useEffect(() => {
    campoRef.current?.focus()
    const cerrarConEscape = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape' && !guardando) onCerrar()
    }
    window.addEventListener('keydown', cerrarConEscape)
    return () => window.removeEventListener('keydown', cerrarConEscape)
  }, [guardando, onCerrar])

  if (!lote) return null

  async function guardar(evento: FormEvent) {
    evento.preventDefault()
    setError('')
    if (!lote) return

    try {
      if (esMortalidad) {
        await onRegistrarMortalidad(lote.id, {
          fecha,
          cantidad_aves: Number(cantidadAves),
          causa_presuntiva: causa.trim() || undefined,
          disposicion: disposicion.trim() || undefined,
        })
      } else {
        const alimentoKg = alimento ? Number(alimento) : undefined
        const aguaLitros = agua ? Number(agua) : undefined
        if (!alimentoKg && !aguaLitros) {
          setError('Indica al menos el alimento o el agua consumida.')
          return
        }
        await onRegistrarConsumo(lote.id, {
          fecha,
          alimento_kg: alimentoKg,
          agua_litros: aguaLitros,
        })
      }
      onCerrar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible guardar el registro.')
    }
  }

  return (
    <div className="operario-modal-overlay" onMouseDown={guardando ? undefined : onCerrar}>
      <div
        className="operario-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="operario-registro-titulo"
        onMouseDown={(evento) => evento.stopPropagation()}
      >
        <div className="operario-modal-head">
          <div>
            <span className="operario-modal-icon">
              {esMortalidad ? <IcHeart size={20} /> : <IcSeed size={20} />}
            </span>
            <h2 id="operario-registro-titulo">
              {esMortalidad ? 'Registrar mortalidad' : 'Registrar consumo'}
            </h2>
            <p>{jornada.galpon.nombre} · {lote.codigo}</p>
          </div>
          <button
            type="button"
            className="operario-modal-close"
            onClick={onCerrar}
            disabled={guardando}
            aria-label="Cerrar formulario"
          >
            <IcClose size={20} />
          </button>
        </div>

        <form className="operario-form" onSubmit={guardar}>
          <label>
            <span>Fecha</span>
            <input type="date" value={fecha} onChange={(evento) => setFecha(evento.target.value)} required />
          </label>

          {esMortalidad ? (
            <>
              <label>
                <span>Aves fallecidas</span>
                <input
                  ref={campoRef}
                  type="number"
                  min="1"
                  step="1"
                  value={cantidadAves}
                  onChange={(evento) => setCantidadAves(evento.target.value)}
                  inputMode="numeric"
                  required
                />
              </label>
              <label>
                <span>Causa probable <em>(opcional)</em></span>
                <input value={causa} onChange={(evento) => setCausa(evento.target.value)} />
              </label>
              <label>
                <span>¿Qué hiciste con las aves? <em>(opcional)</em></span>
                <select value={disposicion} onChange={(evento) => setDisposicion(evento.target.value)}>
                  <option value="">Sin manejar aún</option>
                  <option value="compostaje">Compostaje</option>
                  <option value="incineracion">Incineración</option>
                  <option value="entierro">Entierro</option>
                  <option value="otro">Otro</option>
                </select>
              </label>
            </>
          ) : (
            <div className="operario-form-grid">
              <label>
                <span>Alimento (kg) <em>(opcional)</em></span>
                <input
                  ref={campoRef}
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={alimento}
                  onChange={(evento) => setAlimento(evento.target.value)}
                  inputMode="decimal"
                />
              </label>
              <label>
                <span>Agua (litros) <em>(opcional)</em></span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={agua}
                  onChange={(evento) => setAgua(evento.target.value)}
                  inputMode="decimal"
                />
              </label>
            </div>
          )}

          {error && <p className="operario-form-error" role="alert">{error}</p>}

          <div className="operario-form-actions">
            <button type="button" className="operario-btn-secondary" onClick={onCerrar} disabled={guardando}>
              Cancelar
            </button>
            <button type="submit" className="operario-btn-primary" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar registro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ModalRegistroOperario
