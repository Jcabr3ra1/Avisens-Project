import { useMemo, useState, type FormEvent, type FormEventHandler } from 'react'
import { IcEgg } from '@shared/ui/icons/icons'
import Modal from '@shared/ui/Modal/Modal'
import type { Galpon } from '@features/galpones/api/galpones'
import type { LineaGenetica } from '../api/lineas-geneticas'
import {
  MARCAS_ALIMENTO,
  SEXOS_LOTE,
  opcionesLineaGenetica,
  tieneCurvaObjetivo,
  type FormularioLoteDatos,
} from '../model/formularioLote'

interface Props {
  form: FormularioLoteDatos
  modoEdicion: boolean
  galpones: Galpon[]
  lotesActivosPorGalpon?: Map<number, string>
  lineasGeneticas: LineaGenetica[]
  errorLineasGeneticas: string
  guardando: boolean
  error: string
  onCambiar: <K extends keyof FormularioLoteDatos>(
    campo: K,
    valor: FormularioLoteDatos[K],
  ) => void
  onGuardar: FormEventHandler<HTMLFormElement>
  onCerrar: () => void
}

function numeroOpcional(valor: string): number | '' {
  return valor === '' ? '' : Number(valor)
}

const ID_FORMULARIO = 'formulario-lote'

function FormularioLote({
  form,
  modoEdicion,
  galpones,
  lotesActivosPorGalpon,
  lineasGeneticas,
  errorLineasGeneticas,
  guardando,
  error,
  onCambiar,
  onGuardar,
  onCerrar,
}: Props) {
  const [mostrarAdicional, setMostrarAdicional] = useState(modoEdicion)
  const [errorValidacion, setErrorValidacion] = useState('')
  const opcionesLinea = useMemo(
    () => opcionesLineaGenetica(lineasGeneticas, form.linea_genetica_id),
    [lineasGeneticas, form.linea_genetica_id],
  )
  const galponSeleccionado = useMemo(
    () => galpones.find((g) => g.id === form.galpon_id) ?? null,
    [galpones, form.galpon_id],
  )
  const codigoLoteActivo = !modoEdicion
    ? (lotesActivosPorGalpon?.get(form.galpon_id) ?? null)
    : null
  const capacidadMaxima =
    galponSeleccionado?.capacidad_aves && galponSeleccionado.capacidad_aves > 0
      ? galponSeleccionado.capacidad_aves
      : null

  function manejarSubmit(evento: FormEvent<HTMLFormElement>) {
    let problema = ''
    if (codigoLoteActivo) {
      problema = `Este galpón ya tiene un lote activo (${codigoLoteActivo}). Debes cerrar el lote vigente antes de iniciar uno nuevo.`
    } else if (
      form.cantidad_inicial === '' ||
      !Number.isInteger(form.cantidad_inicial) ||
      form.cantidad_inicial < 1 ||
      form.cantidad_inicial > 500_000
    ) {
      problema = 'La cantidad inicial debe ser un entero entre 1 y 500.000 aves.'
    } else if (capacidadMaxima !== null && form.cantidad_inicial > capacidadMaxima) {
      problema = `La cantidad de aves (${form.cantidad_inicial.toLocaleString('es-CO')}) supera la capacidad máxima del galpón (${capacidadMaxima.toLocaleString('es-CO')} aves). Ajusta la cantidad para continuar.`
    } else if (
      form.costo_pollito_unitario !== '' &&
      (form.costo_pollito_unitario < 0 || form.costo_pollito_unitario > 10_000_000_000)
    ) {
      problema = 'El costo por pollito debe ser un valor entre $0 y $10.000.000.000.'
    } else if (
      form.presupuesto_total_cop !== '' &&
      (form.presupuesto_total_cop < 0 || form.presupuesto_total_cop > 10_000_000_000)
    ) {
      problema = 'El presupuesto total debe ser un valor entre $0 y $10.000.000.000.'
    } else if (form.fecha_salida_estimada && form.fecha_ingreso && form.fecha_salida_estimada < form.fecha_ingreso) {
      problema = 'La salida estimada no puede ser anterior a la fecha de ingreso.'
    } else if (form.fecha_salida_real && form.fecha_ingreso && form.fecha_salida_real < form.fecha_ingreso) {
      problema = 'La salida real no puede ser anterior a la fecha de ingreso.'
    }
    if (problema) {
      evento.preventDefault()
      setErrorValidacion(problema)
      return
    }
    setErrorValidacion('')
    onGuardar(evento)
  }

  return (
    <Modal
      variante="lateral"
      icono={<IcEgg size={20} />}
      titulo={modoEdicion ? 'Editar lote' : 'Nuevo lote'}
      subtitulo="El código se genera automáticamente."
      onCerrar={onCerrar}
      acciones={
        <>
          <button type="button" className="modal-btn" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          <button
            type="submit"
            form={ID_FORMULARIO}
            className="modal-btn modal-btn--primary"
            disabled={guardando || Boolean(codigoLoteActivo)}
          >
            {guardando ? 'Guardando…' : modoEdicion ? 'Guardar cambios' : 'Crear lote'}
          </button>
        </>
      }
    >
      <form id={ID_FORMULARIO} onSubmit={manejarSubmit}>
        <div className="modal-fila">
          <label className="modal-campo">
            <span>Galpón</span>
            <select
              value={form.galpon_id}
              onChange={(evento) =>
                onCambiar('galpon_id', Number(evento.target.value))
              }
              disabled={modoEdicion}
              required
              autoFocus
            >
              {galpones.map((galpon) => (
                <option key={galpon.id} value={galpon.id}>
                  {galpon.granja.nombre} · {galpon.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="modal-fila">
          <label className="modal-campo">
            <span>Fecha de ingreso</span>
            <input
              type="date"
              value={form.fecha_ingreso}
              onChange={(evento) =>
                onCambiar('fecha_ingreso', evento.target.value)
              }
              required
            />
          </label>
          <label className="modal-campo">
            <span>Cantidad inicial</span>
            <input
              type="number"
              min="1"
              max={capacidadMaxima ?? 500000}
              step="1"
              value={form.cantidad_inicial}
              onChange={(evento) =>
                onCambiar(
                  'cantidad_inicial',
                  numeroOpcional(evento.target.value),
                )
              }
              required
            />
            {capacidadMaxima !== null && (
              <small className="modal-ayuda">
                Capacidad máxima del galpón: {capacidadMaxima.toLocaleString('es-CO')} aves.
              </small>
            )}
          </label>
        </div>

        {codigoLoteActivo && (
          <p className="modal-error" role="alert">
            Este galpón ya tiene un lote activo ({codigoLoteActivo}). Debes cerrar el lote vigente antes de iniciar uno nuevo.
          </p>
        )}

        <button
          type="button"
          className="modal-desplegar"
          aria-expanded={mostrarAdicional}
          aria-controls="lotes-informacion-adicional"
          onClick={() => setMostrarAdicional((visible) => !visible)}
        >
          {mostrarAdicional
            ? '− Ocultar información adicional'
            : '+ Agregar información adicional'}
        </button>

        {mostrarAdicional && (
          <div
            id="lotes-informacion-adicional"
            className="modal-adicional"
          >
            <div className="modal-fila">
              <label className="modal-campo">
                <span>Sexo <em>(Opcional)</em></span>
                <select
                  value={form.sexo}
                  onChange={(evento) => onCambiar('sexo', evento.target.value)}
                >
                  <option value="">Sin especificar</option>
                  {SEXOS_LOTE.map((sexo) => (
                    <option key={sexo} value={sexo}>
                      {sexo.charAt(0).toUpperCase() + sexo.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="modal-campo">
                <span>Marca de alimento <em>(Opcional)</em></span>
                <select
                  value={form.marca_alimento}
                  onChange={(evento) => onCambiar('marca_alimento', evento.target.value)}
                >
                  <option value="">Sin especificar</option>
                  {MARCAS_ALIMENTO.map((marca) => (
                    <option key={marca} value={marca}>
                      {marca.charAt(0).toUpperCase() + marca.slice(1)}
                    </option>
                  ))}
                </select>
                {form.marca_alimento && !tieneCurvaObjetivo(form.marca_alimento) && (
                  <small className="modal-ayuda">
                    Todavía no hay curva de referencia para esta marca: el peso del
                    lote se registrará, pero no podrá compararse con un objetivo.
                  </small>
                )}
              </label>
            </div>
            <div className="modal-fila">
              <label className="modal-campo">
                <span>Línea genética <em>(Opcional)</em></span>
                <select
                  value={form.linea_genetica_id ?? ''}
                  onChange={(evento) => {
                    const valor = evento.target.value
                    onCambiar('linea_genetica_id', valor === '' ? null : Number(valor))
                  }}
                >
                  <option value="">Sin especificar</option>
                  {opcionesLinea.map((opcion) => (
                    <option key={opcion.id} value={opcion.id}>
                      {opcion.etiqueta}
                    </option>
                  ))}
                </select>
                {!form.linea_genetica_id && (
                  <small className="modal-ayuda">
                    Sin línea genética, el plan de crecimiento del lote no podrá
                    calcularse.
                  </small>
                )}
                {errorLineasGeneticas && (
                  <small className="modal-ayuda">{errorLineasGeneticas}</small>
                )}
              </label>
            </div>
            <div className="modal-fila">
              <label className="modal-campo">
                <span>Costo por pollito <em>(Opcional)</em></span>
                <input
                  type="number"
                  min="0"
                  max="10000000000"
                  step="any"
                  inputMode="decimal"
                  value={form.costo_pollito_unitario}
                  onChange={(evento) =>
                    onCambiar(
                      'costo_pollito_unitario',
                      numeroOpcional(evento.target.value),
                    )
                  }
                />
              </label>
              <label className="modal-campo">
                <span>Presupuesto total <em>(Opcional)</em></span>
                <input
                  type="number"
                  min="0"
                  max="10000000000"
                  step="any"
                  inputMode="decimal"
                  value={form.presupuesto_total_cop}
                  onChange={(evento) =>
                    onCambiar(
                      'presupuesto_total_cop',
                      numeroOpcional(evento.target.value),
                    )
                  }
                />
              </label>
              <label className="modal-campo">
                <span>Salida estimada <em>(Opcional)</em></span>
                <input
                  type="date"
                  min={form.fecha_ingreso || undefined}
                  value={form.fecha_salida_estimada}
                  onChange={(evento) =>
                    onCambiar('fecha_salida_estimada', evento.target.value)
                  }
                />
              </label>
            </div>
            {modoEdicion && (
              <div className="modal-fila">
                <label className="modal-campo">
                  <span>Salida real <em>(Opcional)</em></span>
                  <input
                    type="date"
                    min={form.fecha_ingreso || undefined}
                    value={form.fecha_salida_real}
                    onChange={(evento) =>
                      onCambiar('fecha_salida_real', evento.target.value)
                    }
                  />
                </label>
                <label className="modal-campo">
                  <span>Estado</span>
                  <select
                    value={form.estado}
                    onChange={(evento) =>
                      onCambiar(
                        'estado',
                        evento.target.value as FormularioLoteDatos['estado'],
                      )
                    }
                  >
                    <option value="activo">Activo</option>
                    <option value="finalizado">Finalizado</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </label>
              </div>
            )}
          </div>
        )}

        {(errorValidacion || error) && (
          <p className="modal-error" role="alert">
            {errorValidacion || error}
          </p>
        )}

      </form>
    </Modal>
  )
}

export default FormularioLote
