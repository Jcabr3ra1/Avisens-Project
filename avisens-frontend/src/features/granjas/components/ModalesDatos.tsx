import { useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'
import Modal from '@shared/ui/Modal/Modal'
import { mensajeDeError } from '@shared/utils/errores'
import { actualizarDatosGranja, type Granja } from '../api/granjas'
import { actualizarDatosLote, type Lote } from '@features/lotes/api/lotes'
import type { LineaGenetica } from '@features/lotes/api/lineas-geneticas'
import { MARCAS_ALIMENTO, SEXOS_LOTE, opcionesLineaGenetica, tieneCurvaObjetivo } from '@features/lotes/model/formularioLote'
import {
  formDatosGranja, formDatosLote, payloadDatosGranja, payloadDatosLote,
  type FormDatosGranja, type FormDatosLote, type Resultado,
} from '../model/datosDescriptivos'

type Base = { onCerrar: () => void; onGuardado: () => Promise<unknown> | void }

function ModalDatos<T>({ id, titulo, subtitulo, preparar, enviar, mensajeExito, onCerrar, onGuardado, children }: Base & {
  id: string
  titulo: string
  subtitulo: string
  preparar: () => Resultado<T>
  enviar: (payload: T) => Promise<unknown>
  mensajeExito: string
  children: ReactNode
}) {
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const { payload, error: problema } = preparar()
    if (problema !== null) {
      setError(problema)
      return
    }
    setGuardando(true)
    setError('')
    try {
      await enviar(payload)
      toast.success(mensajeExito)
      await onGuardado()
      onCerrar()
    } catch (fallo) {
      setError(mensajeDeError(fallo, 'No se pudieron guardar los datos. Intenta de nuevo.'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      titulo={titulo}
      subtitulo={subtitulo}
      onCerrar={onCerrar}
      acciones={
        <>
          <button type="button" className="modal-btn" onClick={onCerrar} disabled={guardando}>Cancelar</button>
          <button type="submit" form={id} className="modal-btn modal-btn--primary" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar datos'}
          </button>
        </>
      }
    >
      <form id={id} onSubmit={(evento) => void guardar(evento)} noValidate>
        {children}
        {error && <p className="modal-error" role="alert">{error}</p>}
      </form>
    </Modal>
  )
}

function Campo({ etiqueta, children, ayuda }: { etiqueta: string; children: ReactNode; ayuda?: string }) {
  return (
    <label className="modal-campo">
      <span>{etiqueta}</span>
      {children}
      {ayuda && <small className="modal-ayuda">{ayuda}</small>}
    </label>
  )
}

export function ModalDatosGranja({ granja, ...base }: Base & { granja: Granja }) {
  const [form, setForm] = useState<FormDatosGranja>(() => formDatosGranja(granja))
  const cambiar = (campo: keyof FormDatosGranja) => (valor: string) => setForm((actual) => ({ ...actual, [campo]: valor }))

  return (
    <ModalDatos
      {...base}
      id="datos-granja"
      titulo={`Datos de ${granja.nombre}`}
      subtitulo="Con el municipio se trae el clima de tu zona y el equipo de Avisens sabe a dónde llegar."
      preparar={() => payloadDatosGranja(form)}
      enviar={(payload) => actualizarDatosGranja(granja.id, payload)}
      mensajeExito="Datos de la granja guardados"
    >
      <Campo etiqueta="Dirección">
        <input value={form.direccion} onChange={(e) => cambiar('direccion')(e.target.value)} placeholder="Vereda El Progreso, km 4" maxLength={200} />
      </Campo>
      <div className="modal-fila">
        <Campo etiqueta="Municipio">
          <input value={form.municipio} onChange={(e) => cambiar('municipio')(e.target.value)} placeholder="Rionegro" maxLength={100} />
        </Campo>
        <Campo etiqueta="Departamento">
          <input value={form.departamento} onChange={(e) => cambiar('departamento')(e.target.value)} placeholder="Antioquia" maxLength={100} />
        </Campo>
      </div>
      <p className="modal-ayuda gr-ayuda-coordenadas">Las coordenadas y el área las registra el administrador cuando instala los sensores.</p>
    </ModalDatos>
  )
}

export function ModalDatosLote({ lote, lineasGeneticas, proveedores, ...base }: Base & {
  lote: Lote
  lineasGeneticas: LineaGenetica[]
  proveedores: { id: number; nombre: string }[]
}) {
  const [form, setForm] = useState<FormDatosLote>(() => formDatosLote(lote))
  const cambiar = (campo: keyof FormDatosLote) => (valor: string) => setForm((actual) => ({ ...actual, [campo]: valor }))
  const lineas = opcionesLineaGenetica(lineasGeneticas, lote.linea_genetica?.id ?? null)

  return (
    <ModalDatos
      {...base}
      id="datos-lote"
      titulo={`Datos del lote ${lote.codigo}`}
      subtitulo="La línea genética y el sexo eligen la curva estándar con la que se compara el crecimiento."
      preparar={() => payloadDatosLote(form)}
      enviar={(payload) => actualizarDatosLote(lote.id, payload)}
      mensajeExito="Datos del lote guardados"
    >
      <div className="modal-fila">
        <Campo etiqueta="Línea genética" ayuda={form.linea_genetica_id ? undefined : 'Sin línea, la Guía de peso no puede comparar el lote contra un estándar.'}>
          <select value={form.linea_genetica_id} onChange={(e) => cambiar('linea_genetica_id')(e.target.value)}>
            <option value="">Elige la línea</option>
            {lineas.map((linea) => <option key={linea.id} value={linea.id}>{linea.etiqueta}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Sexo">
          <select value={form.sexo} onChange={(e) => cambiar('sexo')(e.target.value)}>
            <option value="">Elige una opción</option>
            {SEXOS_LOTE.map((sexo) => <option key={sexo} value={sexo}>{sexo.charAt(0).toUpperCase() + sexo.slice(1)}</option>)}
          </select>
        </Campo>
      </div>
      <div className="modal-fila">
        <Campo
          etiqueta="Marca de alimento"
          ayuda={form.marca_alimento && !tieneCurvaObjetivo(form.marca_alimento) ? 'Esta marca todavía no tiene curva de referencia.' : undefined}
        >
          <select value={form.marca_alimento} onChange={(e) => cambiar('marca_alimento')(e.target.value)}>
            <option value="">Elige una opción</option>
            {MARCAS_ALIMENTO.map((marca) => <option key={marca} value={marca}>{marca.charAt(0).toUpperCase() + marca.slice(1)}</option>)}
          </select>
        </Campo>
      </div>
      <Campo etiqueta="Proveedor de los pollitos">
        <select value={form.proveedor_id} onChange={(e) => cambiar('proveedor_id')(e.target.value)}>
          <option value="">Elige el proveedor</option>
          {proveedores.map((proveedor) => <option key={proveedor.id} value={proveedor.id}>{proveedor.nombre}</option>)}
        </select>
      </Campo>
    </ModalDatos>
  )
}
