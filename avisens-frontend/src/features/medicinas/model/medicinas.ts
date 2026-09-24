import { fechaDeHoy } from '@shared/utils/fechas'
import type {
  ActualizarEventoSanitarioPayload,
  CrearEventoSanitarioPayload,
  EventoSanitario,
  RegistroMedicina,
  TipoMedicacion,
} from '../api/medicinas'

export type FiltroTipo = 'todos' | 'medicacion' | 'tratamiento' | 'diagnostico'

export const TIPOS_EVENTO = [
  { valor: 'medicacion', etiqueta: 'Medicación', ayuda: 'Medicinas y vacunas aplicadas' },
  { valor: 'tratamiento', etiqueta: 'Tratamiento', ayuda: 'Atención sanitaria en curso' },
  { valor: 'diagnostico', etiqueta: 'Diagnóstico', ayuda: 'Registro de una enfermedad o hallazgo' },
] as const

export const VIAS_APLICACION = [
  { valor: 'oral', etiqueta: 'Oral' },
  { valor: 'ocular', etiqueta: 'Ocular' },
  { valor: 'nasal', etiqueta: 'Nasal' },
  { valor: 'subcutanea', etiqueta: 'Subcutánea' },
  { valor: 'intramuscular', etiqueta: 'Intramuscular' },
  { valor: 'agua', etiqueta: 'Agua de bebida' },
] as const

export type FormularioMedicina = {
  lote_id: number
  tipo: TipoMedicacion
  fecha: string
  insumo_id: number
  producto: string
  diagnostico: string
  dosis: string
  via_aplicacion: string
  cantidad_aves: string
  observaciones: string
}

export type FormularioMedicamentoDatos = FormularioMedicina

export const FORMULARIO_MEDICINA_INICIAL: FormularioMedicina = {
  lote_id: 0,
  tipo: 'medicacion',
  fecha: fechaDeHoy(),
  insumo_id: 0,
  producto: '',
  diagnostico: '',
  dosis: '',
  via_aplicacion: '',
  cantidad_aves: '',
  observaciones: '',
}

export function crearFormularioMedicamento(loteId = 0): FormularioMedicamentoDatos {
  return { ...FORMULARIO_MEDICINA_INICIAL, lote_id: loteId }
}

export function formularioDesdeEvento(evento: EventoSanitario): FormularioMedicamentoDatos {
  return {
    lote_id: evento.lote_id,
    tipo: evento.tipo as TipoMedicacion,
    fecha: evento.fecha.slice(0, 10),
    insumo_id: evento.insumo_id ?? 0,
    producto: evento.producto ?? '',
    diagnostico: evento.diagnostico ?? '',
    dosis: evento.dosis ?? '',
    via_aplicacion: evento.via_aplicacion ?? '',
    cantidad_aves: evento.cantidad_aves?.toString() ?? '',
    observaciones: evento.observaciones ?? '',
  }
}

function textoOpcional(valor: string) {
  const limpio = valor.trim()
  return limpio || undefined
}

function payloadDesdeFormulario(form: FormularioMedicamentoDatos) {
  const cantidad = Number.parseInt(form.cantidad_aves, 10)
  return {
    lote_id: form.lote_id,
    tipo: form.tipo,
    fecha: form.fecha,
    insumo_id: form.insumo_id > 0 ? form.insumo_id : undefined,
    producto: textoOpcional(form.producto),
    diagnostico: textoOpcional(form.diagnostico),
    dosis: textoOpcional(form.dosis),
    via_aplicacion: textoOpcional(form.via_aplicacion),
    cantidad_aves: cantidad > 0 ? cantidad : undefined,
    metodo_registro: 'manual' as const,
    observaciones: textoOpcional(form.observaciones),
  }
}

export function crearPayloadEvento(
  form: FormularioMedicamentoDatos,
): CrearEventoSanitarioPayload {
  return payloadDesdeFormulario(form)
}

export function actualizarPayloadEvento(
  form: FormularioMedicamentoDatos,
): ActualizarEventoSanitarioPayload {
  return payloadDesdeFormulario(form)
}

export function validarFormulario(form: FormularioMedicamentoDatos): string {
  if (form.lote_id <= 0) return 'Selecciona un lote.'
  if (!form.fecha) return 'Selecciona una fecha.'
  if (form.cantidad_aves && (!/^\d+$/.test(form.cantidad_aves) || Number(form.cantidad_aves) <= 0)) {
    return 'La cantidad de aves debe ser un número positivo.'
  }
  return ''
}

export function tipoUsaProducto(tipo: FormularioMedicina['tipo']) {
  return tipo === 'medicacion' || tipo === 'tratamiento'
}

export function etiquetaDeLote(lote: { codigo: string; galpon?: { nombre?: string } }) {
  return lote.galpon?.nombre ? `${lote.codigo} - ${lote.galpon.nombre}` : lote.codigo
}

export function agruparInsumos<T extends { categoria?: string | null; granja_id: number }>(
  insumos: T[],
  granjaId: number,
) {
  const disponibles = insumos.filter((insumo) => insumo.granja_id === granjaId)

  return {
    sanitarios: disponibles.filter((insumo) =>
      insumo.categoria?.toLocaleLowerCase().includes('sanitari') ?? false,
    ),
    otros: disponibles.filter(
      (insumo) => !(insumo.categoria?.toLocaleLowerCase().includes('sanitari') ?? false),
    ),
  }
}

export function diaDeEvento(fecha: string) {
  return fecha.slice(0, 10)
}

export function partesDeFecha(fecha: string) {
  const dia = diaDeEvento(fecha)
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia)
  if (!coincidencia) return null

  const [, anio, mes, numeroDia] = coincidencia
  const fechaLocal = new Date(Number(anio), Number(mes) - 1, Number(numeroDia))
  return {
    dia: numeroDia,
    mes: fechaLocal.toLocaleDateString('es-CO', { month: 'short' }).replace('.', ''),
    anio: Number(anio),
  }
}

export function formatearFecha(fecha: string) {
  return new Date(`${diaDeEvento(fecha)}T00:00:00`).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function esTipoConocido(tipo: string): tipo is (typeof TIPOS_EVENTO)[number]['valor'] {
  return TIPOS_EVENTO.some((opcion) => opcion.valor === tipo)
}

export function etiquetaDeTipo(tipo: string) {
  return TIPOS_EVENTO.find((opcion) => opcion.valor === tipo)?.etiqueta ?? 'Otro'
}

export function etiquetaDeVia(via: string) {
  return VIAS_APLICACION.find((opcion) => opcion.valor === via)?.etiqueta ?? via
}

export function tituloDeEvento(evento: Pick<RegistroMedicina, 'tipo' | 'producto' | 'diagnostico'>) {
  if (evento.producto) return evento.producto
  if (evento.diagnostico) return evento.diagnostico
  return etiquetaDeTipo(evento.tipo)
}

export function esRegistroMedicina(registro: RegistroMedicina) {
  return registro.tipo === 'medicacion' || registro.tipo === 'tratamiento'
}

export function filtrarMedicinas<T extends RegistroMedicina>(
  registros: T[],
  busqueda: string,
  loteId: number | null,
): T[] {
  const termino = busqueda.trim().toLocaleLowerCase()

  return registros.filter((registro) => {
    const coincideLote = loteId === null || registro.lote_id === loteId

    const texto = [
      registro.producto,
      registro.insumo?.nombre,
      registro.diagnostico,
      registro.dosis,
      registro.via_aplicacion,
    ]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase()

    return coincideLote && (!termino || texto.includes(termino))
  })
}
