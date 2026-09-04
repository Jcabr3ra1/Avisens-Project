import { IcChevronDown, IcPin, IcPlus } from '@shared/ui/icons/icons'
import type { PermisosInsumo } from '@shared/auth/permisos'
import type { Insumo } from '../api/insumos'
import type { MovimientoInventario } from '../api/movimientos'
import { ETIQUETA_STOCK, estadoStock, porcentajeDeStock } from '../model/inventario'
import HistorialMovimientos from './HistorialMovimientos'
import MenuAcciones, { type AccionMenu } from '@shared/ui/MenuAcciones/MenuAcciones'

interface Props {
  insumo: Insumo
  expandido: boolean
  onAlternarExpansion: () => void
  movimientos: MovimientoInventario[] | undefined
  cargandoMovimientos: boolean
  permisos: PermisosInsumo
  onEditar: (insumo: Insumo) => void
  onAlternar: (insumo: Insumo) => void
  onEliminar: (insumo: Insumo) => void
  onRegistrarMovimiento: (insumo: Insumo) => void
}

function AcordeonInsumo({
  insumo,
  expandido,
  onAlternarExpansion,
  movimientos,
  cargandoMovimientos,
  permisos,
  onEditar,
  onAlternar,
  onEliminar,
  onRegistrarMovimiento,
}: Props) {
  const estado = estadoStock(insumo)
  const panelId = `inv-panel-${insumo.id}`

  const acciones: AccionMenu[] = [
    ...(permisos.editar
      ? [{ etiqueta: 'Editar insumo', onSeleccionar: () => onEditar(insumo) }]
      : []),
    ...(permisos.alternarActivo
      ? [
          {
            etiqueta: insumo.activo ? 'Desactivar' : 'Activar',
            onSeleccionar: () => onAlternar(insumo),
          },
        ]
      : []),
    ...(permisos.eliminar
      ? [
          {
            etiqueta: 'Eliminar insumo',
            onSeleccionar: () => onEliminar(insumo),
            peligrosa: true,
          },
        ]
      : []),
  ]

  return (
    <section className={`inv-insumo inv-insumo--${estado}`}>
      <div className="inv-insumo-barra">
        <button
          type="button"
          className="inv-insumo-disparador"
          aria-expanded={expandido}
          aria-controls={panelId}
          onClick={onAlternarExpansion}
        >
          <IcChevronDown
            size={16}
            aria-hidden="true"
            className={expandido ? 'inv-chevron is-abierto' : 'inv-chevron'}
          />
          <span className="inv-insumo-identidad">
            <strong>{insumo.nombre}</strong>
            {insumo.tipo && <span className="inv-tipo">{insumo.tipo}</span>}
          </span>
        </button>

        <div className="inv-insumo-datos">
          <span className={`inv-badge inv-badge--${estado}`}>
            <span className="inv-badge-punto" aria-hidden="true" />
            {ETIQUETA_STOCK[estado]}
          </span>

          <span className="inv-stock">
            <strong>{insumo.stock_actual.toLocaleString()}</strong>
            <small>{insumo.unidad_medida}</small>
            <em>mín. {insumo.stock_minimo.toLocaleString()}</em>
          </span>

          <div className="inv-barra" aria-hidden="true">
            <span
              className={`inv-barra-nivel inv-barra-nivel--${estado}`}
              style={{ width: `${porcentajeDeStock(insumo)}%` }}
            />
          </div>

          {permisos.registrarMovimiento && insumo.activo && (
            <button
              type="button"
              className="inv-accion-suave"
              onClick={() => onRegistrarMovimiento(insumo)}
            >
              <IcPlus size={13} aria-hidden="true" />
              Movimiento
            </button>
          )}

          <MenuAcciones acciones={acciones} etiqueta={`Acciones de ${insumo.nombre}`} />
        </div>
      </div>

      {expandido && (
        <div className="inv-insumo-panel" id={panelId}>
          <div className="inv-ficha">
            <div>
              <span className="inv-ficha-etiqueta">Ubicación</span>
              <span className="inv-ficha-valor">
                {insumo.ubicacion_almacen ? (
                  <>
                    <IcPin size={13} aria-hidden="true" />
                    {insumo.ubicacion_almacen}
                  </>
                ) : (
                  <span className="inv-sin-dato">—</span>
                )}
              </span>
            </div>
            <div>
              <span className="inv-ficha-etiqueta">Precio unitario</span>
              <span className="inv-ficha-valor">
                {insumo.precio_unitario_cop === null ? (
                  <span className="inv-sin-dato">—</span>
                ) : (
                  `${insumo.precio_unitario_cop.toLocaleString('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                    maximumFractionDigits: 0,
                  })} / ${insumo.unidad_medida}`
                )}
              </span>
            </div>
            <div>
              <span className="inv-ficha-etiqueta">Valor en bodega</span>
              <span className="inv-ficha-valor">
                {insumo.precio_unitario_cop === null ? (
                  <span className="inv-sin-dato">—</span>
                ) : (
                  (insumo.stock_actual * insumo.precio_unitario_cop).toLocaleString('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                    maximumFractionDigits: 0,
                  })
                )}
              </span>
            </div>
            <div>
              <span className="inv-ficha-etiqueta">Vence</span>
              <span className="inv-ficha-valor">
                {insumo.fecha_vencimiento?.slice(0, 10) ?? <span className="inv-sin-dato">—</span>}
              </span>
            </div>
          </div>

          <h4 className="inv-historial-titulo">Movimientos</h4>
          <HistorialMovimientos
            movimientos={movimientos ?? []}
            cargando={cargandoMovimientos && movimientos === undefined}
            unidad={insumo.unidad_medida}
          />
        </div>
      )}
    </section>
  )
}

export default AcordeonInsumo
