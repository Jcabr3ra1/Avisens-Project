import { useState, type FormEvent } from 'react'
import Modal from '@shared/ui/Modal/Modal'
import { mensajeDeError } from '@shared/utils/errores'
import type {
  CrearCurvaObjetivoPayload,
  CurvaObjetivo,
} from '@features/indicadores/api/curvas-objetivo'
import { capitalizar, ETAPAS_ALIMENTO, MARCAS_ALIMENTO } from '../model/catalogos'

const SEXOS = ['macho', 'hembra', 'mixto'] as const

type Props = {
  editando: CurvaObjetivo | null
  onGuardar: (payload: CrearCurvaObjetivoPayload, editandoId: number | null) => Promise<void>
  onCerrar: () => void
}

const ID_FORMULARIO = 'formulario-curva-objetivo'

type Campos = {
  marca: string
  sexo: string
  dia: string
  peso_esperado_g: string
  consumo_diario_g: string
  consumo_acumulado_g: string
  fcr_objetivo: string
  etapa_alimentacion: string
  fuente: string
}

function camposIniciales(curva: CurvaObjetivo | null): Campos {
  const texto = (valor: number | null | undefined) =>
    valor === null || valor === undefined ? '' : String(valor)
  return {
    marca: curva?.marca ?? 'italcol',
    sexo: curva?.sexo ?? 'macho',
    dia: texto(curva?.dia),
    peso_esperado_g: texto(curva?.peso_esperado_g),
    consumo_diario_g: texto(curva?.consumo_diario_g),
    consumo_acumulado_g: texto(curva?.consumo_acumulado_g),
    fcr_objetivo: texto(curva?.fcr_objetivo),
    etapa_alimentacion: curva?.etapa_alimentacion ?? '',
    fuente: curva?.fuente ?? '',
  }
}

function FormularioCurva({ editando, onGuardar, onCerrar }: Props) {
  const [form, setForm] = useState<Campos>(() => camposIniciales(editando))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  function cambiar(campo: keyof Campos, valor: string) {
    setForm((actual) => ({ ...actual, [campo]: valor }))
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const dia = Number(form.dia)
    if (form.dia === '' || Number.isNaN(dia) || dia < 1) {
      setError('El día de vida debe ser un número mayor que cero.')
      return
    }

    // Los opcionales vacíos se omiten: el backend los valida como número y un
    // '' se rechaza con un 400 que desde la pantalla no se entiende.
    const payload: CrearCurvaObjetivoPayload = {
      marca: form.marca,
      sexo: form.sexo,
      dia,
    }
    const numero = (valor: string) => (valor === '' ? null : Number(valor))
    const peso = numero(form.peso_esperado_g)
    const diario = numero(form.consumo_diario_g)
    const acumulado = numero(form.consumo_acumulado_g)
    const fcr = numero(form.fcr_objetivo)
    if (peso !== null) payload.peso_esperado_g = peso
    if (diario !== null) payload.consumo_diario_g = diario
    if (acumulado !== null) payload.consumo_acumulado_g = acumulado
    if (fcr !== null) payload.fcr_objetivo = fcr
    if (form.etapa_alimentacion) payload.etapa_alimentacion = form.etapa_alimentacion
    if (form.fuente.trim()) payload.fuente = form.fuente.trim()

    setGuardando(true)
    setError('')
    try {
      await onGuardar(payload, editando?.id ?? null)
      onCerrar()
    } catch (problema) {
      // El 409 de punto repetido y el 403 de curva del manual traen mensajes
      // propios y mostrables; se prefieren al respaldo.
      setError(mensajeDeError(problema, 'No se pudo guardar el punto de curva.'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      titulo={editando ? 'Editar punto de curva' : 'Nuevo punto de curva'}
      subtitulo="Un punto es una combinación de marca, sexo y día de vida. El peso del lote se compara contra el último punto que no supere su día."
      onCerrar={onCerrar}
      acciones={
        <>
          <button type="button" className="modal-btn" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          <button type="submit" form={ID_FORMULARIO} className="modal-btn modal-btn--primary" disabled={guardando}>
            {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear punto'}
          </button>
        </>
      }
    >
      <form id={ID_FORMULARIO} onSubmit={(evento) => void enviar(evento)}>
        <div className="modal-fila">
          <label className="modal-campo">
            <span>Marca</span>
            <select value={form.marca} onChange={(e) => cambiar('marca', e.target.value)}>
              {MARCAS_ALIMENTO.map((marca) => (
                <option key={marca} value={marca}>{capitalizar(marca)}</option>
              ))}
            </select>
          </label>
          <label className="modal-campo">
            <span>Sexo</span>
            <select value={form.sexo} onChange={(e) => cambiar('sexo', e.target.value)}>
              {SEXOS.map((sexo) => (
                <option key={sexo} value={sexo}>{capitalizar(sexo)}</option>
              ))}
            </select>
          </label>
          <label className="modal-campo">
            <span>Día de vida</span>
            <input type="number" min="1" max="70" value={form.dia} onChange={(e) => cambiar('dia', e.target.value)} required />
          </label>
        </div>

        <div className="modal-fila">
          <label className="modal-campo">
            <span>Peso esperado en g <em>(Opcional)</em></span>
            <input type="number" min="0" value={form.peso_esperado_g} onChange={(e) => cambiar('peso_esperado_g', e.target.value)} />
          </label>
          <label className="modal-campo">
            <span>FCR objetivo <em>(Opcional)</em></span>
            <input type="number" min="0" step="0.01" value={form.fcr_objetivo} onChange={(e) => cambiar('fcr_objetivo', e.target.value)} />
          </label>
        </div>

        <div className="modal-fila">
          <label className="modal-campo">
            <span>Consumo diario en g <em>(Opcional)</em></span>
            <input type="number" min="0" value={form.consumo_diario_g} onChange={(e) => cambiar('consumo_diario_g', e.target.value)} />
          </label>
          <label className="modal-campo">
            <span>Consumo acumulado en g <em>(Opcional)</em></span>
            <input type="number" min="0" value={form.consumo_acumulado_g} onChange={(e) => cambiar('consumo_acumulado_g', e.target.value)} />
          </label>
        </div>

        <label className="modal-campo">
          <span>Etapa <em>(Opcional)</em></span>
          <select value={form.etapa_alimentacion} onChange={(e) => cambiar('etapa_alimentacion', e.target.value)}>
            <option value="">Sin especificar</option>
            {ETAPAS_ALIMENTO.map((etapa) => (
              <option key={etapa} value={etapa}>{capitalizar(etapa)}</option>
            ))}
          </select>
        </label>

        <label className="modal-campo">
          <span>Fuente <em>(Opcional)</em></span>
          <input value={form.fuente} onChange={(e) => cambiar('fuente', e.target.value)} maxLength={120} />
          <small className="modal-ayuda">
            De dónde sale el dato. Escribirlo permite defenderlo cuando alguien
            pregunte por qué el objetivo es ese y no otro.
          </small>
        </label>

        {error && <p className="modal-error" role="alert">{error}</p>}
      </form>
    </Modal>
  )
}

export default FormularioCurva
