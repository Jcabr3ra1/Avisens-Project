import { useState, type FormEventHandler } from 'react'
import Modal from '@shared/ui/Modal/Modal'
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

const ID_FORMULARIO = 'formulario-lote'

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
    <Modal
      titulo={modoEdicion ? 'Editar lote' : 'Nuevo lote'}
      subtitulo="El código se genera automáticamente y la fecha de ingreso inicia en hoy."
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
            {guardando ? 'Guardando…' : modoEdicion ? 'Guardar cambios' : 'Crear lote'}
          </button>
        </>
      }
    >
      <form id={ID_FORMULARIO} onSubmit={onGuardar}>
        <div className="modal-fila">
          <label className="modal-campo">
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
          <label className="modal-campo">
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

        <div className="modal-fila">
          <label className="modal-campo">
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
          <label className="modal-campo">
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
                <span>Raza</span>
                <input
                  value={form.raza}
                  onChange={(evento) =>
                    onCambiar('raza', evento.target.value)
                  }
                />
              </label>
              <label className="modal-campo">
                <span>Sexo</span>
                <input
                  value={form.sexo}
                  onChange={(evento) =>
                    onCambiar('sexo', evento.target.value)
                  }
                />
              </label>
              <label className="modal-campo">
                <span>Marca de alimento</span>
                <input
                  value={form.marca_alimento}
                  onChange={(evento) =>
                    onCambiar('marca_alimento', evento.target.value)
                  }
                />
              </label>
            </div>
            <div className="modal-fila">
              <label className="modal-campo">
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
              <label className="modal-campo">
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
              <label className="modal-campo">
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
              <div className="modal-fila">
                <label className="modal-campo">
                  <span>Salida real</span>
                  <input
                    type="date"
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

        {error && (
          <p className="modal-error" role="alert">
            {error}
          </p>
        )}

      </form>
    </Modal>
  )
}

export default FormularioLote
