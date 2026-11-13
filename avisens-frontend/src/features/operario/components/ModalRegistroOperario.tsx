import { useRef, useState, type FormEvent } from 'react'
import Modal from '@shared/ui/Modal/Modal'
import { IcHeart, IcSeed } from '@shared/ui/icons/icons'
import { fechaDeHoy } from '@shared/utils/fechas'
import type { JornadaOperario } from '../model/jornadaOperario'
import { validarConsumo, validarFechaRegistro, validarMortalidad } from '../model/registroOperario'

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

const ID_FORMULARIO = 'registro-operario'

// Usa el mismo Modal que el resto de la plataforma (foco atrapado, Escape,
// animación y estilos), en vez del diálogo propio que tenía Mi jornada.
function ModalRegistroOperario({
  tipo,
  jornada,
  guardando,
  onCerrar,
  onRegistrarMortalidad,
  onRegistrarConsumo,
}: Props) {
  const campoRef = useRef<HTMLInputElement>(null)
  const [fecha, setFecha] = useState(fechaDeHoy)
  const [cantidadAves, setCantidadAves] = useState('')
  const [causa, setCausa] = useState('')
  const [disposicion, setDisposicion] = useState('')
  const [alimento, setAlimento] = useState('')
  const [agua, setAgua] = useState('')
  const [error, setError] = useState('')
  const esMortalidad = tipo === 'mortalidad'
  const lote = jornada.lote

  if (!lote) return null

  async function guardar(evento: FormEvent) {
    evento.preventDefault()
    if (!lote) return

    const problema = validarFechaRegistro(fecha, fechaDeHoy())
      ?? (esMortalidad
        ? validarMortalidad(cantidadAves, lote.cantidad_inicial)
        : validarConsumo(alimento, agua))
    if (problema) {
      setError(problema)
      return
    }
    setError('')

    try {
      if (esMortalidad) {
        await onRegistrarMortalidad(lote.id, {
          fecha,
          cantidad_aves: Number(cantidadAves),
          causa_presuntiva: causa.trim() || undefined,
          disposicion: disposicion.trim() || undefined,
        })
      } else {
        await onRegistrarConsumo(lote.id, {
          fecha,
          alimento_kg: alimento.trim() ? Number(alimento) : undefined,
          agua_litros: agua.trim() ? Number(agua) : undefined,
        })
      }
      onCerrar()
    } catch (err) {
      // useJornadaOperario ya traduce el error del servidor y lo relanza.
      setError(err instanceof Error ? err.message : 'No fue posible guardar el registro.')
    }
  }

  return (
    <Modal
      titulo={esMortalidad ? 'Registrar mortalidad' : 'Registrar consumo'}
      subtitulo={`${jornada.galpon.nombre} · ${lote.codigo}`}
      icono={esMortalidad ? <IcHeart size={20} /> : <IcSeed size={20} />}
      onCerrar={onCerrar}
      bloqueado={guardando}
      focoInicial={campoRef}
      ancho="compacto"
      acciones={(
        <>
          <button type="button" className="modal-btn" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          <button type="submit" form={ID_FORMULARIO} className="modal-btn modal-btn--primary" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar registro'}
          </button>
        </>
      )}
    >
      <form id={ID_FORMULARIO} onSubmit={guardar} noValidate>
        <label className="modal-campo">
          <span>Fecha</span>
          <input
            type="date"
            value={fecha}
            max={fechaDeHoy()}
            onChange={(evento) => setFecha(evento.target.value)}
            required
          />
        </label>

        {esMortalidad ? (
          <>
            <label className="modal-campo">
              <span>Aves fallecidas</span>
              <input
                ref={campoRef}
                type="number"
                min="1"
                max={lote.cantidad_inicial}
                step="1"
                value={cantidadAves}
                onChange={(evento) => setCantidadAves(evento.target.value)}
                inputMode="numeric"
                required
              />
            </label>
            <label className="modal-campo">
              <span>Causa probable <em>(opcional)</em></span>
              <input value={causa} onChange={(evento) => setCausa(evento.target.value)} />
            </label>
            <label className="modal-campo">
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
          <div className="modal-fila">
            <label className="modal-campo">
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
            <label className="modal-campo">
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

        {error && <p className="modal-error" role="alert">{error}</p>}
      </form>
    </Modal>
  )
}

export default ModalRegistroOperario
