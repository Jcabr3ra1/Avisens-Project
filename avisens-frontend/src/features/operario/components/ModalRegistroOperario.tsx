import { useRef, useState, type FormEvent } from 'react'
import Modal from '@shared/ui/Modal/Modal'
import { IcAlert, IcSeed } from '@shared/ui/icons/icons'
import { diasDeVida, fechaDeHoy } from '@shared/utils/fechas'
import SelectorFotoMortalidad from '@features/bitacora/components/SelectorFotoMortalidad'
import { AGUA_MAXIMO_LITROS, ALIMENTO_MAXIMO_KG } from '@features/consumos-diarios/model/consumoDiario'
import type { JornadaOperario } from '../model/jornadaOperario'
import { validarTextoSeguro } from '@shared/utils/validacion'
import { validarConsumo, validarFechaRegistro, validarMortalidad } from '../model/registroOperario'

type TipoRegistro = 'mortalidad' | 'consumo'

type Props = {
  tipo: TipoRegistro
  jornada: JornadaOperario
  loteInicialId?: number
  guardando: boolean
  onCerrar: () => void
  onRegistrarMortalidad: (
    loteId: number,
    registro: { fecha: string; cantidad_aves: number; causa_presuntiva?: string; disposicion?: string; observaciones?: string },
    foto?: File | null,
  ) => Promise<void>
  onRegistrarConsumo: (
    loteId: number,
    registro: { fecha: string; alimento_kg?: number; agua_litros?: number },
  ) => Promise<void>
}

const ID_FORMULARIO = 'registro-operario'

function ModalRegistroOperario({
  tipo,
  jornada,
  loteInicialId,
  guardando,
  onCerrar,
  onRegistrarMortalidad,
  onRegistrarConsumo,
}: Props) {
  const campoRef = useRef<HTMLInputElement>(null)
  const activos = jornada.lotesActivos.length > 0
    ? jornada.lotesActivos
    : jornada.lote ? [jornada.lote] : []
  const [loteId, setLoteId] = useState<number>(
    () => activos.find((item) => item.id === loteInicialId)?.id ?? activos[0]?.id ?? 0,
  )
  const [fecha, setFecha] = useState(fechaDeHoy)
  const [cantidadAves, setCantidadAves] = useState('')
  const [causa, setCausa] = useState('')
  const [disposicion, setDisposicion] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [foto, setFoto] = useState<File | null>(null)
  const [alimento, setAlimento] = useState('')
  const [agua, setAgua] = useState('')
  const [error, setError] = useState('')
  const esMortalidad = tipo === 'mortalidad'
  const lote = activos.find((item) => item.id === loteId) ?? activos[0] ?? null

  if (!lote) return null

  async function guardar(evento: FormEvent) {
    evento.preventDefault()
    if (!lote) return

    const problema = validarFechaRegistro(fecha, fechaDeHoy())
      ?? (esMortalidad
        ? (validarMortalidad(cantidadAves, lote.cantidad_inicial)
          ?? validarTextoSeguro(causa, 'La causa probable', { max: 150, exigirLetras: true })
          ?? validarTextoSeguro(disposicion, 'La disposición', { max: 100 })
          ?? validarTextoSeguro(observaciones, 'Las observaciones', { max: 500, multilinea: true }))
        : validarConsumo(alimento, agua))
    if (problema) {
      setError(problema)
      return
    }
    setError('')

    try {
      if (esMortalidad) {
        await onRegistrarMortalidad(
          lote.id,
          {
            fecha,
            cantidad_aves: Number(cantidadAves),
            causa_presuntiva: causa.trim() || undefined,
            disposicion: disposicion.trim() || undefined,
            observaciones: observaciones.trim() || undefined,
          },
          foto,
        )
      } else {
        await onRegistrarConsumo(lote.id, {
          fecha,
          alimento_kg: alimento.trim() ? Number(alimento) : undefined,
          agua_litros: agua.trim() ? Number(agua) : undefined,
        })
      }
      onCerrar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible guardar el registro.')
    }
  }

  return (
    <Modal
      variante="lateral"
      titulo={esMortalidad ? 'Registrar mortalidad' : 'Registrar consumo'}
      subtitulo={`${jornada.galpon.nombre} · ${lote.codigo}`}
      icono={esMortalidad ? <IcAlert size={20} /> : <IcSeed size={20} />}
      onCerrar={onCerrar}
      bloqueado={guardando}
      focoInicial={campoRef}
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
        {activos.length > 1 && (
          <label className="modal-campo">
            <span>Lote del galpón</span>
            <select
              value={lote.id}
              onChange={(evento) => setLoteId(Number(evento.target.value))}
              disabled={guardando}
            >
              {activos.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.codigo} · Día {diasDeVida(item.fecha_ingreso)} ({item.cantidad_inicial.toLocaleString('es-CO')} aves)
                </option>
              ))}
            </select>
          </label>
        )}

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
            <label className="modal-campo">
              <span>Observaciones <em>(opcional)</em></span>
              <textarea
                value={observaciones}
                onChange={(evento) => setObservaciones(evento.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Ej.: estaban concentradas en la esquina norte."
              />
            </label>
            <SelectorFotoMortalidad
              archivo={foto}
              deshabilitado={guardando}
              onSeleccionar={setFoto}
              onError={setError}
            />
          </>
        ) : (
          <div className="modal-fila">
            <label className="modal-campo">
              <span>Alimento (kg) <em>(opcional)</em></span>
              <input
                ref={campoRef}
                type="number"
                min="0.01"
                max={ALIMENTO_MAXIMO_KG}
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
                max={AGUA_MAXIMO_LITROS}
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
