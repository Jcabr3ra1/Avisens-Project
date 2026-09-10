import { useState, type FormEvent } from 'react'
import Modal from '@shared/ui/Modal/Modal'
import { mensajeDeError } from '@shared/utils/errores'
import type {
  CrearTipoAlimentoPayload,
  TipoAlimento,
} from '@features/consumos-diarios/api/tipos-alimento'
import {
  capitalizar,
  ETAPAS_ALIMENTO,
  MARCAS_ALIMENTO,
  PRESENTACIONES_ALIMENTO,
} from '../model/catalogos'

type Props = {
  editando: TipoAlimento | null
  onGuardar: (payload: CrearTipoAlimentoPayload, editandoId: number | null) => Promise<void>
  onCerrar: () => void
}

const ID_FORMULARIO = 'formulario-tipo-alimento'

type Campos = {
  nombre: string
  marca: string
  etapa: string
  presentacion: string
  dia_inicio: string
  dia_fin: string
  consumo_total_esperado_g: string
}

function camposIniciales(tipo: TipoAlimento | null): Campos {
  return {
    nombre: tipo?.nombre ?? '',
    marca: tipo?.marca ?? '',
    etapa: tipo?.etapa ?? '',
    presentacion: tipo?.presentacion ?? '',
    dia_inicio: tipo?.dia_inicio === null || tipo === null ? '' : String(tipo.dia_inicio),
    dia_fin: tipo?.dia_fin === null || tipo === null ? '' : String(tipo.dia_fin),
    consumo_total_esperado_g:
      tipo?.consumo_total_esperado_g === null || tipo === null
        ? ''
        : String(tipo.consumo_total_esperado_g),
  }
}

function FormularioTipoAlimento({ editando, onGuardar, onCerrar }: Props) {
  const [form, setForm] = useState<Campos>(() => camposIniciales(editando))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  function cambiar<K extends keyof Campos>(campo: K, valor: string) {
    setForm((actual) => ({ ...actual, [campo]: valor }))
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    const inicio = form.dia_inicio === '' ? null : Number(form.dia_inicio)
    const fin = form.dia_fin === '' ? null : Number(form.dia_fin)
    if (inicio !== null && fin !== null && inicio > fin) {
      setError('El día de inicio no puede ser posterior al de fin.')
      return
    }

    // Los opcionales vacíos se omiten en vez de mandarse como cadena vacía:
    // el backend los valida como número y un '' se rechaza con un 400.
    const payload: CrearTipoAlimentoPayload = { nombre: form.nombre.trim() }
    if (form.marca) payload.marca = form.marca
    if (form.etapa) payload.etapa = form.etapa
    if (form.presentacion) payload.presentacion = form.presentacion
    if (inicio !== null) payload.dia_inicio = inicio
    if (fin !== null) payload.dia_fin = fin
    if (form.consumo_total_esperado_g !== '') {
      payload.consumo_total_esperado_g = Number(form.consumo_total_esperado_g)
    }

    setGuardando(true)
    setError('')
    try {
      await onGuardar(payload, editando?.id ?? null)
      onCerrar()
    } catch (problema) {
      setError(mensajeDeError(problema, 'No se pudo guardar el tipo de alimento.'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      titulo={editando ? 'Editar tipo de alimento' : 'Nuevo tipo de alimento'}
      subtitulo="Solo el nombre es obligatorio. Los días de vida sirven para saber en qué etapa se usa."
      onCerrar={onCerrar}
      acciones={
        <>
          <button type="button" className="modal-btn" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          <button type="submit" form={ID_FORMULARIO} className="modal-btn modal-btn--primary" disabled={guardando}>
            {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear alimento'}
          </button>
        </>
      }
    >
      <form id={ID_FORMULARIO} onSubmit={(evento) => void enviar(evento)}>
        <label className="modal-campo">
          <span>Nombre</span>
          <input value={form.nombre} onChange={(e) => cambiar('nombre', e.target.value)} required autoFocus />
        </label>

        <div className="modal-fila">
          <label className="modal-campo">
            <span>Marca <em>(Opcional)</em></span>
            <select value={form.marca} onChange={(e) => cambiar('marca', e.target.value)}>
              <option value="">Sin especificar</option>
              {MARCAS_ALIMENTO.map((marca) => (
                <option key={marca} value={marca}>{capitalizar(marca)}</option>
              ))}
            </select>
          </label>
          <label className="modal-campo">
            <span>Etapa <em>(Opcional)</em></span>
            <select value={form.etapa} onChange={(e) => cambiar('etapa', e.target.value)}>
              <option value="">Sin especificar</option>
              {ETAPAS_ALIMENTO.map((etapa) => (
                <option key={etapa} value={etapa}>{capitalizar(etapa)}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="modal-campo">
          <span>Presentación <em>(Opcional)</em></span>
          <select value={form.presentacion} onChange={(e) => cambiar('presentacion', e.target.value)}>
            <option value="">Sin especificar</option>
            {PRESENTACIONES_ALIMENTO.map((presentacion) => (
              <option key={presentacion} value={presentacion}>{capitalizar(presentacion)}</option>
            ))}
          </select>
        </label>

        <div className="modal-fila">
          <label className="modal-campo">
            <span>Desde el día <em>(Opcional)</em></span>
            <input type="number" min="1" max="70" value={form.dia_inicio} onChange={(e) => cambiar('dia_inicio', e.target.value)} />
          </label>
          <label className="modal-campo">
            <span>Hasta el día <em>(Opcional)</em></span>
            <input type="number" min="1" max="70" value={form.dia_fin} onChange={(e) => cambiar('dia_fin', e.target.value)} />
          </label>
        </div>

        <label className="modal-campo">
          <span>Consumo total esperado en gramos <em>(Opcional)</em></span>
          <input type="number" min="0" value={form.consumo_total_esperado_g} onChange={(e) => cambiar('consumo_total_esperado_g', e.target.value)} />
        </label>

        {error && <p className="modal-error" role="alert">{error}</p>}
      </form>
    </Modal>
  )
}

export default FormularioTipoAlimento
