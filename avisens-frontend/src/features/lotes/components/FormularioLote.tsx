import { useState, type FormEventHandler, type MouseEvent } from 'react'
import type { Galpon } from '@features/galpones/api/galpones'
import type { Proveedor } from '@features/proveedores/api/proveedores'
import type { FormularioLoteDatos } from '../model/formularioLote'

interface Props {
  form: FormularioLoteDatos
  modoEdicion: boolean
  galpones: Galpon[]
  proveedores: Proveedor[]
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

function detenerPropagacion(evento: MouseEvent<HTMLDivElement>) {
  evento.stopPropagation()
}

function FormularioLote({
  form,
  modoEdicion,
  galpones,
  proveedores,
  guardando,
  error,
  onCambiar,
  onGuardar,
  onCerrar,
}: Props) {
  const [mostrarAdicional, setMostrarAdicional] = useState(modoEdicion)

  return (
    <div className="lotes-modal" role="presentation" onClick={onCerrar}>
      <div
        className="lotes-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="formulario-lote-titulo"
        onClick={detenerPropagacion}
      >
        <h2 id="formulario-lote-titulo">
          {modoEdicion ? 'Editar lote' : 'Nuevo lote'}
        </h2>
        <p className="lotes-form-ayuda">
          El código se genera automáticamente y la fecha de ingreso inicia en
          hoy.
        </p>
        <form onSubmit={onGuardar}>
          <div className="lotes-form-fila">
            <label>
              <span>Galpón *</span>
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
            <label>
              <span>Proveedor *</span>
              <select
                value={form.proveedor_id}
                onChange={(evento) =>
                  onCambiar('proveedor_id', Number(evento.target.value))
                }
                required
              >
                {proveedores.map((proveedor) => (
                  <option key={proveedor.id} value={proveedor.id}>
                    {proveedor.nombre}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="lotes-form-fila">
            <label>
              <span>Fecha de ingreso *</span>
              <input
                type="date"
                value={form.fecha_ingreso}
                onChange={(evento) =>
                  onCambiar('fecha_ingreso', evento.target.value)
                }
                required
              />
            </label>
            <label>
              <span>Cantidad inicial *</span>
              <input
                type="number"
                min="1"
                value={form.cantidad_inicial}
                onChange={(evento) =>
                  onCambiar(
                    'cantidad_inicial',
                    numeroOpcional(evento.target.value),
                  )
                }
                required
              />
            </label>
          </div>

          <button
            type="button"
            className="lotes-form-desplegar"
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
              className="lotes-form-adicional"
            >
              <div className="lotes-form-fila">
                <label>
                  <span>Raza</span>
                  <input
                    value={form.raza}
                    onChange={(evento) =>
                      onCambiar('raza', evento.target.value)
                    }
                  />
                </label>
                <label>
                  <span>Sexo</span>
                  <input
                    value={form.sexo}
                    onChange={(evento) =>
                      onCambiar('sexo', evento.target.value)
                    }
                  />
                </label>
                <label>
                  <span>Marca de alimento</span>
                  <input
                    value={form.marca_alimento}
                    onChange={(evento) =>
                      onCambiar('marca_alimento', evento.target.value)
                    }
                  />
                </label>
              </div>
              <div className="lotes-form-fila">
                <label>
                  <span>Costo por pollito</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.costo_pollito_unitario}
                    onChange={(evento) =>
                      onCambiar(
                        'costo_pollito_unitario',
                        numeroOpcional(evento.target.value),
                      )
                    }
                  />
                </label>
                <label>
                  <span>Presupuesto total</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.presupuesto_total_cop}
                    onChange={(evento) =>
                      onCambiar(
                        'presupuesto_total_cop',
                        numeroOpcional(evento.target.value),
                      )
                    }
                  />
                </label>
                <label>
                  <span>Salida estimada</span>
                  <input
                    type="date"
                    value={form.fecha_salida_estimada}
                    onChange={(evento) =>
                      onCambiar('fecha_salida_estimada', evento.target.value)
                    }
                  />
                </label>
              </div>
              {modoEdicion && (
                <div className="lotes-form-fila">
                  <label>
                    <span>Salida real</span>
                    <input
                      type="date"
                      value={form.fecha_salida_real}
                      onChange={(evento) =>
                        onCambiar('fecha_salida_real', evento.target.value)
                      }
                    />
                  </label>
                  <label>
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

          {error && (
            <p className="lotes-form-error" role="alert">
              {error}
            </p>
          )}

          <div className="lotes-form-acciones">
            <button type="button" onClick={onCerrar} disabled={guardando}>
              Cancelar
            </button>
            <button
              type="submit"
              className="lotes-btn-primary"
              disabled={guardando}
            >
              {guardando
                ? 'Guardando…'
                : modoEdicion
                  ? 'Guardar cambios'
                  : 'Crear lote'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default FormularioLote
