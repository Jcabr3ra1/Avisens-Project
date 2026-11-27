import { useEffect, useRef, type FormEvent, type ReactNode } from 'react'
import Modal from '@shared/ui/Modal/Modal'
import { fechaDeHoy } from '@shared/utils/fechas'
import type { Insumo } from '@features/inventario/api/insumos'
import {
  AVES_MAXIMO,
  PESO_MAXIMO_G,
  PESO_MINIMO_G,
  VIAS_APLICACION,
  type EventoSanitario,
  type FormularioRegistro as Datos,
  type TipoRegistro,
} from '../model/bitacora'
import SelectorFotoMortalidad from './SelectorFotoMortalidad'

type Props = {
  tipo: TipoRegistro
  form: Datos
  guardando: boolean
  error: string
  onCambiar: <K extends keyof Datos>(campo: K, valor: Datos[K]) => void
  onGuardar: (evento: FormEvent<HTMLFormElement>) => void
  onCerrar: () => void
  // Información de apoyo que se muestra dentro del formulario (no se envía).
  complemento?: ReactNode
  editando?: boolean
  // Vacunas y medicamentos de bodega que se pueden indicar en un evento sanitario.
  insumos?: Insumo[]
  // Casos sanitarios activos del lote para enlazar seguimientos.
  casosSanitariosActivos?: EventoSanitario[]
  // Evidencia fotográfica opcional para registros de mortalidad.
  fotoMortalidad?: File | null
  tieneFotoActual?: boolean
  onCambiarFotoMortalidad?: (archivo: File | null) => void
  onErrorFoto?: (mensaje: string) => void
}

const ID_FORMULARIO = 'formulario-registro'

const TITULOS_EDICION: Record<TipoRegistro, string> = {
  peso: 'Corregir pesaje',
  mortalidad: 'Corregir mortalidad',
  sanitario: 'Corregir evento sanitario',
}

const TITULOS: Record<TipoRegistro, string> = {
  peso: 'Registrar pesaje',
  mortalidad: 'Registrar mortalidad',
  sanitario: 'Registrar evento sanitario',
}

const EVENTOS_SANITARIOS = [
  ['vacunacion', 'Vacunación'],
  ['medicacion', 'Medicación'],
  ['tratamiento', 'Tratamiento'],
  ['diagnostico', 'Diagnóstico'],
  ['revision', 'Revisión'],
  ['seguimiento', 'Seguimiento'],
] as const

function FormularioRegistro({
  tipo,
  form,
  guardando,
  error,
  onCambiar,
  onGuardar,
  onCerrar,
  editando = false,
  insumos = [],
  casosSanitariosActivos = [],
  fotoMortalidad = null,
  tieneFotoActual = false,
  onCambiarFotoMortalidad,
  onErrorFoto,
}: Props) {
  const fechaRef = useRef<HTMLInputElement>(null)
  const insumoSeleccionado = insumos.find((item) => String(item.id) === form.insumo_id)

  useEffect(() => {
    fechaRef.current?.focus()
  }, [])

  return (
    <Modal
      variante="lateral"
      titulo={editando ? TITULOS_EDICION[tipo] : TITULOS[tipo]}
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
            disabled={guardando}
          >
            {guardando ? 'Guardando…' : editando ? 'Guardar corrección' : 'Guardar registro'}
          </button>
        </>
      }
    >
      <form id={ID_FORMULARIO} onSubmit={onGuardar}>
        <label className="modal-campo">
          <span>Fecha</span>
          <input
            ref={fechaRef}
            type="date"
            value={form.fecha}
            max={fechaDeHoy()}
            onChange={(evento) => onCambiar('fecha', evento.target.value)}
            required
          />
        </label>

        {tipo === 'peso' && (
          <>
            <label className="modal-campo">
              <span>Peso promedio (g)</span>
              <input
                type="number"
                min={PESO_MINIMO_G}
                max={PESO_MAXIMO_G}
                step="any"
                inputMode="decimal"
                value={form.peso_promedio_g}
                onChange={(evento) => onCambiar('peso_promedio_g', evento.target.value)}
                required
              />
            </label>
            <div className="modal-fila">
              <label className="modal-campo">
                <span>Aves pesadas <em>(Opcional)</em></span>
                <input
                  type="number"
                  min="1"
                  max={AVES_MAXIMO}
                  step="1"
                  inputMode="numeric"
                  value={form.cantidad_aves_pesadas}
                  onChange={(evento) => onCambiar('cantidad_aves_pesadas', evento.target.value)}
                />
              </label>
              <label className="modal-campo">
                <span>Peso objetivo (g) <em>(Opcional)</em></span>
                <input
                  type="number"
                  min={PESO_MINIMO_G}
                  max={PESO_MAXIMO_G}
                  step="any"
                  inputMode="decimal"
                  value={form.peso_objetivo_g}
                  onChange={(evento) => onCambiar('peso_objetivo_g', evento.target.value)}
                />
              </label>
            </div>
          </>
        )}

        {tipo === 'mortalidad' && (
          <>
            <label className="modal-campo">
              <span>Aves fallecidas</span>
              <input
                type="number"
                min="1"
                max={AVES_MAXIMO}
                step="1"
                inputMode="numeric"
                value={form.cantidad_aves}
                onChange={(evento) => onCambiar('cantidad_aves', evento.target.value)}
                required
              />
            </label>
            <label className="modal-campo">
              <span>Causa probable <em>(Opcional)</em></span>
              <input
                value={form.causa_presuntiva}
                maxLength={200}
                onChange={(evento) => onCambiar('causa_presuntiva', evento.target.value)}
              />
            </label>
            {onCambiarFotoMortalidad && (
              <SelectorFotoMortalidad
                archivo={fotoMortalidad}
                tieneFotoActual={tieneFotoActual}
                deshabilitado={guardando}
                onSeleccionar={onCambiarFotoMortalidad}
                onError={onErrorFoto}
              />
            )}
          </>
        )}

        {tipo === 'sanitario' && (
          <>
            <label className="modal-campo">
              <span>Tipo de evento</span>
              <select
                value={form.tipo}
                onChange={(evento) => onCambiar('tipo', evento.target.value)}
              >
                {EVENTOS_SANITARIOS.map(([valor, etiqueta]) => (
                  <option key={valor} value={valor}>
                    {etiqueta}
                  </option>
                ))}
              </select>
            </label>
            {!editando && casosSanitariosActivos.length > 0 && (
              <label className="modal-campo">
                <span>Seguimiento de un caso activo <em>(Opcional)</em></span>
                <select
                  value={form.evento_padre_id}
                  onChange={(evento) => onCambiar('evento_padre_id', evento.target.value)}
                >
                  <option value="">Es un caso sanitario nuevo</option>
                  {casosSanitariosActivos.map((caso) => (
                    <option key={caso.id} value={String(caso.id)}>
                      #{caso.id} · {caso.diagnostico || caso.producto || caso.tipo} ({caso.fecha.slice(0, 10)})
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="modal-campo">
              <span>Producto o vacuna <em>(Opcional)</em></span>
              <input
                value={form.producto}
                maxLength={120}
                onChange={(evento) => onCambiar('producto', evento.target.value)}
              />
            </label>
            {insumos.length > 0 && (
              <>
                <label className="modal-campo">
                  <span>Insumo de bodega <em>(Opcional)</em></span>
                  <select
                    value={form.insumo_id}
                    onChange={(evento) => {
                      onCambiar('insumo_id', evento.target.value)
                      if (!evento.target.value) onCambiar('cantidad_insumo', '')
                    }}
                  >
                    <option value="">No salió de bodega</option>
                    {insumos.map((insumo) => (
                      <option key={insumo.id} value={String(insumo.id)}>
                        {insumo.nombre} ({insumo.stock_actual.toLocaleString('es-CO')} {insumo.unidad_medida})
                      </option>
                    ))}
                  </select>
                </label>
                {!editando && form.insumo_id && (
                  <label className="modal-campo">
                    <span>
                      Cantidad a descontar de bodega{' '}
                      {insumoSeleccionado ? `(${insumoSeleccionado.unidad_medida})` : ''}{' '}
                      <em>(Opcional)</em>
                    </span>
                    <input
                      type="number"
                      min="0.001"
                      max={insumoSeleccionado ? insumoSeleccionado.stock_actual : 10000000}
                      step="0.001"
                      inputMode="decimal"
                      value={form.cantidad_insumo}
                      placeholder="Ej.: 1 o 0.5"
                      onChange={(evento) => onCambiar('cantidad_insumo', evento.target.value)}
                    />
                    {insumoSeleccionado && (
                      <small className="modal-ayuda">
                        Disponible en bodega: {insumoSeleccionado.stock_actual.toLocaleString('es-CO')} {insumoSeleccionado.unidad_medida}. Se registra la salida automáticamente.
                      </small>
                    )}
                  </label>
                )}
              </>
            )}
            <div className="modal-fila">
              <label className="modal-campo">
                <span>Dosis <em>(Opcional)</em></span>
                <input
                  value={form.dosis}
                  maxLength={80}
                  placeholder="Ej.: 0,5 ml por ave"
                  onChange={(evento) => onCambiar('dosis', evento.target.value)}
                />
              </label>
              <label className="modal-campo">
                <span>Vía de aplicación <em>(Opcional)</em></span>
                <select
                  value={form.via_aplicacion}
                  onChange={(evento) => onCambiar('via_aplicacion', evento.target.value)}
                >
                  <option value="">Sin indicar</option>
                  {VIAS_APLICACION.map(([valor, etiqueta]) => (
                    <option key={valor} value={valor}>{etiqueta}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="modal-fila">
              <label className="modal-campo">
                <span>Aves tratadas <em>(Opcional)</em></span>
                <input
                  type="number"
                  min="1"
                  max={AVES_MAXIMO}
                  step="1"
                  inputMode="numeric"
                  value={form.cantidad_aves}
                  onChange={(evento) => onCambiar('cantidad_aves', evento.target.value)}
                />
              </label>
              <label className="modal-campo">
                <span>Diagnóstico <em>(Opcional)</em></span>
                <input
                  value={form.diagnostico}
                  maxLength={200}
                  onChange={(evento) => onCambiar('diagnostico', evento.target.value)}
                />
              </label>
            </div>
          </>
        )}

        <label className="modal-campo">
          <span>Observaciones <em>(Opcional)</em></span>
          <textarea
            rows={3}
            style={{ resize: 'none' }}
            maxLength={500}
            value={form.observaciones}
            onChange={(evento) => onCambiar('observaciones', evento.target.value)}
          />
        </label>

        {error && (
          <p className="modal-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  )
}

export default FormularioRegistro
