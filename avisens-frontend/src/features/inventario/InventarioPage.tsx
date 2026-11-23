import { confirmarAccion } from '@shared/ui/ConfirmarAccion/gestorConfirmacion'
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { toast } from 'sonner'
import { getRol } from '@shared/api'
import { permisosDeInsumo, ROL_ADMIN } from '@shared/auth/permisos'
import { useRefetchOnFocus } from '@shared/hooks/useRefetchOnFocus'
import { IcAlert, IcBox, IcCheck, IcClose, IcCoin, IcPin, IcPlus, IcSearch } from '@shared/ui/icons/icons'
import CabeceraAdmin from '@shared/ui/admin/CabeceraAdmin'
import MenuAcciones, { type AccionMenu } from '@shared/ui/MenuAcciones/MenuAcciones'
import '@shared/ui/admin/AdminKit.css'
import { listarGranjas, type Granja } from '@features/granjas/api/granjas'
import type { ActualizarInsumoPayload, CrearInsumoPayload, Insumo } from './api/insumos'
import FormularioInsumo from './components/FormularioInsumo'
import FormularioMovimiento from './components/FormularioMovimiento'
import HistorialMovimientos from './components/HistorialMovimientos'
import { AvisoInsumo, useFormularioInsumo } from './hooks/useFormularioInsumo'
import { useInventario } from './hooks/useInventario'
import { useMovimientosInsumo } from './hooks/useMovimientosInsumo'
import { buscarInsumoDuplicado } from './model/formularioInsumo'
import {
  ETIQUETA_STOCK,
  estadoStock,
  filtrarInsumos,
  ordenarPorUrgencia,
  porcentajeDeStock,
  resumirInventario,
  siguienteInsumo,
  textoBodegaVacia,
  type FiltroStock,
} from './model/inventario'
import './InventarioPage.css'

const FILTROS: { valor: FiltroStock; etiqueta: string }[] = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'reposicion', etiqueta: 'Por reponer' },
  { valor: 'agotados', etiqueta: 'Agotados' },
  { valor: 'inactivos', etiqueta: 'Inactivos' },
]

const cop = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

function InventarioPage() {
  const rol = getRol()
  const esAdministrador = rol === ROL_ADMIN
  const permisos = permisosDeInsumo(rol)

  const gestion = useInventario()
  useRefetchOnFocus(gestion.recargar)
  const [granjas, setGranjas] = useState<Granja[]>([])
  useEffect(() => {
    if (!permisos.crear) return
    let vigente = true
    void listarGranjas()
      .then((lista) => {
        if (vigente) setGranjas(lista.filter((granja) => granja.activa))
      })
      .catch(() => {
        if (vigente) setGranjas([])
      })
    return () => {
      vigente = false
    }
  }, [permisos.crear])

  const { insumos, guardar: guardarEnBodega, registrarMovimiento } = gestion
  const guardarInsumo = useCallback(
    async (datos: CrearInsumoPayload | ActualizarInsumoPayload, editandoId: number | null) => {
      if (editandoId === null) {
        const nuevo = datos as CrearInsumoPayload
        const duplicadoId = buscarInsumoDuplicado(insumos, {
          granja_id: nuevo.granja_id,
          nombre: nuevo.nombre,
        })
        const existente = insumos.find((insumo) => insumo.id === duplicadoId)
        if (existente) {
          const cantidad = nuevo.stock_actual ?? 0
          if (cantidad <= 0) {
            throw new AvisoInsumo(
              `«${existente.nombre}» ya existe en esta granja. Para sumar stock, regístrale una entrada desde su ficha.`,
            )
          }
          const sumar = await confirmarAccion({
            titulo: 'Este insumo ya está en la bodega',
            entidad: existente.nombre,
            descripcion: `Tiene ${existente.stock_actual.toLocaleString('es-CO')} ${existente.unidad_medida} en bodega. En lugar de duplicarlo, se sumarán ${cantidad.toLocaleString('es-CO')} ${existente.unidad_medida} como una entrada.`,
            textoConfirmar: 'Sumar al existente',
            tono: 'aviso',
          })
          if (!sumar) {
            throw new AvisoInsumo('No se guardó: ya existe un insumo con ese nombre en esta granja.')
          }
          await registrarMovimiento(existente.id, {
            tipo_movimiento: 'entrada',
            cantidad,
            motivo: 'Ingreso sumado desde «Nuevo insumo»',
          })
          toast.success(`Se sumaron ${cantidad.toLocaleString('es-CO')} ${existente.unidad_medida} a ${existente.nombre}`)
          return
        }
      }
      await guardarEnBodega(datos, editandoId)
    },
    [insumos, guardarEnBodega, registrarMovimiento],
  )

  const formulario = useFormularioInsumo(
    guardarInsumo,
    granjas.length === 1 ? granjas[0].id : 0,
  )

  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<FiltroStock>('todos')
  const [seleccionadoId, setSeleccionadoId] = useState<number | null>(null)
  const [inspectorAbiertoMovil, setInspectorAbiertoMovil] = useState(false)
  const [movimientoDe, setMovimientoDe] = useState<Insumo | null>(null)
  const buscadorRef = useRef<HTMLInputElement>(null)

  const activos = useMemo(() => gestion.insumos.filter((item) => item.activo), [gestion.insumos])
  const inactivosCount = gestion.insumos.length - activos.length
  const resumen = useMemo(() => resumirInventario(activos), [activos])
  const porReponer = resumen.bajos + resumen.criticos + resumen.agotados
  const conteosFiltro: Record<FiltroStock, number> = {
    todos: activos.length,
    reposicion: porReponer,
    agotados: resumen.agotados,
    inactivos: inactivosCount,
  }
  const visibles = useMemo(
    () => ordenarPorUrgencia(filtrarInsumos(gestion.insumos, busqueda, filtro)),
    [gestion.insumos, busqueda, filtro],
  )

  const seleccionado = useMemo(
    () => visibles.find((item) => item.id === seleccionadoId) ?? visibles[0] ?? null,
    [visibles, seleccionadoId],
  )

  const historial = useMovimientosInsumo(seleccionado?.id ?? null)

  // Atajo `/` para enfocar el buscador rápidamente y Escape para cerrar el inspector móvil.
  useEffect(() => {
    function manejarTeclaGlobal(evento: globalThis.KeyboardEvent) {
      if (evento.key === 'Escape' && inspectorAbiertoMovil) {
        setInspectorAbiertoMovil(false)
        return
      }
      if (evento.key !== '/' || evento.ctrlKey || evento.metaKey || evento.altKey) return
      const tag = (evento.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      evento.preventDefault()
      buscadorRef.current?.focus()
    }
    window.addEventListener('keydown', manejarTeclaGlobal)
    return () => window.removeEventListener('keydown', manejarTeclaGlobal)
  }, [inspectorAbiertoMovil])

  function manejarTecladoLista(evento: KeyboardEvent<HTMLDivElement>) {
    const siguiente = siguienteInsumo(visibles, seleccionado?.id ?? null, evento.key)
    if (siguiente === null) return
    evento.preventDefault()
    setSeleccionadoId(siguiente)
  }

  async function confirmarEliminacion(insumo: Insumo) {
    const confirmado = await confirmarAccion({
      titulo: '¿Eliminar este insumo?',
      entidad: insumo.nombre,
      descripcion: 'Esta acción no se puede deshacer.',
      textoConfirmar: 'Eliminar insumo',
      tono: 'peligro',
    })
    if (confirmado) {
      await gestion.eliminar(insumo)
      setInspectorAbiertoMovil(false)
    }
  }

  const accionesSeleccionado: AccionMenu[] = seleccionado
    ? [
        ...(permisos.editar
          ? [{ etiqueta: 'Editar insumo', onSeleccionar: () => formulario.abrirEditar(seleccionado) }]
          : []),
        ...(permisos.alternarActivo
          ? [
              {
                etiqueta: seleccionado.activo ? 'Desactivar' : 'Activar',
                onSeleccionar: () => void gestion.alternarActivo(seleccionado),
              },
            ]
          : []),
        ...(permisos.eliminar
          ? [
              {
                etiqueta: 'Eliminar insumo',
                onSeleccionar: () => void confirmarEliminacion(seleccionado),
                peligrosa: true,
              },
            ]
          : []),
      ]
    : []

  const soloSalida = permisos.tiposMovimiento.length === 1 && permisos.tiposMovimiento[0] === 'salida'

  if (gestion.cargando && gestion.insumos.length === 0) {
    return (
      <div className="page-container inv-page adm-page">
        <div className="inv-esqueleto" aria-busy="true" aria-label="Cargando la bodega">
          <div className="inv-hueso inv-hueso--cabecera" />
          <div className="inv-hueso inv-hueso--resumen" />
          {[0, 1, 2, 3].map((indice) => (
            <div key={indice} className="inv-hueso inv-hueso--fila" />
          ))}
        </div>
      </div>
    )
  }

  const estadoSeleccionado = seleccionado ? estadoStock(seleccionado) : null
  const movimientosSeleccionado = seleccionado ? historial.porInsumo.get(seleccionado.id) : undefined

  return (
    <div className="page-container inv-page adm-page">
      <CabeceraAdmin
        eyebrow={esAdministrador ? 'Control de bodega' : 'Bodega'}
        titulo="Insumos"
        subtitulo={permisos.verCostos
          ? 'Stock, movimientos y reposición de tus granjas. Cada insumo guarda su historial.'
          : 'Lo que hay en bodega: el stock de cada insumo y su mínimo.'}
        acciones={permisos.crear ? (
          <button
            type="button"
            className="adm-btn adm-btn--primario"
            onClick={formulario.abrirCrear}
          >
            <IcPlus size={15} aria-hidden="true" />
            Nuevo insumo
          </button>
        ) : undefined}
      />

      <div
        className={`inv-kpis${permisos.verCostos ? '' : ' inv-kpis--tres'}`}
        role="group"
        aria-label="Resumen de la bodega"
      >
        <button
          type="button"
          className={`inv-kpi inv-kpi--primario${filtro === 'todos' ? ' is-activo' : ''}`}
          aria-pressed={filtro === 'todos'}
          onClick={() => setFiltro('todos')}
        >
          <span className="inv-kpi-cab">
            <span className="inv-kpi-etiqueta">Insumos activos</span>
            <span className="inv-kpi-icono" aria-hidden="true"><IcBox size={15} /></span>
          </span>
          <strong>{resumen.total}</strong>
          <small>En catálogo</small>
        </button>

        <button
          type="button"
          className={`inv-kpi inv-kpi--${porReponer > 0 ? 'aviso' : 'ok'}${filtro === 'reposicion' ? ' is-activo' : ''}`}
          aria-pressed={filtro === 'reposicion'}
          onClick={() => setFiltro('reposicion')}
        >
          <span className="inv-kpi-cab">
            <span className="inv-kpi-etiqueta">Por reponer</span>
            <span className="inv-kpi-icono" aria-hidden="true">
              {porReponer > 0 ? <IcAlert size={15} /> : <IcCheck size={15} />}
            </span>
          </span>
          <strong>{porReponer}</strong>
          <small>{porReponer > 0 ? 'Debajo del mínimo' : 'Stock al día'}</small>
        </button>

        <button
          type="button"
          className={`inv-kpi inv-kpi--${resumen.agotados > 0 ? 'peligro' : 'ok'}${filtro === 'agotados' ? ' is-activo' : ''}`}
          aria-pressed={filtro === 'agotados'}
          onClick={() => setFiltro('agotados')}
        >
          <span className="inv-kpi-cab">
            <span className="inv-kpi-etiqueta">Agotados</span>
            <span className="inv-kpi-icono" aria-hidden="true">
              {resumen.agotados > 0 ? <IcAlert size={15} /> : <IcCheck size={15} />}
            </span>
          </span>
          <strong>{resumen.agotados}</strong>
          <small>{resumen.agotados > 0 ? 'Sin existencias' : 'Ninguno en cero'}</small>
        </button>

        {permisos.verCostos && (
          <div className="inv-kpi inv-kpi--info inv-kpi--estatico">
            <span className="inv-kpi-cab">
              <span className="inv-kpi-etiqueta">Valor en bodega</span>
              <span className="inv-kpi-icono" aria-hidden="true"><IcCoin size={15} /></span>
            </span>
            <strong>{cop.format(resumen.valorTotalCop)}</strong>
            <small>Existencias activas</small>
          </div>
        )}
      </div>

      {gestion.error && (
        <div className="adm-alerta" role="alert">
          <span>{gestion.error}</span>
          <button type="button" onClick={() => void gestion.recargar()}>Reintentar</button>
        </div>
      )}

      {gestion.insumos.length === 0 ? (
        <div className="inv-vacio inv-vacio--grande">
          <span className="inv-vacio-icono" aria-hidden="true">
            <IcBox size={26} />
          </span>
          <h2>La bodega todavía no tiene insumos.</h2>
          <p>{textoBodegaVacia(permisos)}</p>
          {permisos.crear && (
            <button
              type="button"
              className="adm-btn adm-btn--primario"
              onClick={formulario.abrirCrear}
            >
              <IcPlus size={15} aria-hidden="true" />
              Registrar primer insumo
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="inv-pildoras" role="group" aria-label="Filtrar insumos por estado">
            {FILTROS.map((opcion) => {
              const activa = filtro === opcion.valor
              return (
                <button
                  key={opcion.valor}
                  type="button"
                  className={`inv-pildora${activa ? ' is-activa' : ''}`}
                  aria-pressed={activa}
                  onClick={() => setFiltro(opcion.valor)}
                >
                  <span>{opcion.etiqueta}</span>
                  <span className="inv-pildora-conteo">{conteosFiltro[opcion.valor]}</span>
                </button>
              )
            })}
          </div>

          <div className="inv-layout">
            <section className="inv-panel" aria-label="Catálogo de insumos">
              <div className="inv-herramientas">
                <div className="inv-buscador">
                  <IcSearch size={15} aria-hidden="true" />
                  <input
                    ref={buscadorRef}
                    type="search"
                    value={busqueda}
                    onChange={(evento) => setBusqueda(evento.target.value)}
                    placeholder="Buscar por nombre, tipo o ubicación"
                    aria-label="Buscar insumos"
                  />
                  {!busqueda && <kbd className="inv-atajo" aria-hidden="true">/</kbd>}
                </div>

                <span className="inv-conteo">
                  {visibles.length} {visibles.length === 1 ? 'insumo' : 'insumos'}
                </span>
              </div>

            {visibles.length === 0 ? (
              <div className="inv-vacio">
                <p>Ningún insumo coincide con estos filtros.</p>
                {(busqueda || filtro !== 'todos') && (
                  <button
                    type="button"
                    className="adm-btn adm-btn--secundario"
                    onClick={() => {
                      setBusqueda('')
                      setFiltro('todos')
                    }}
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            ) : (
              <div
                className="inv-lista"
                role="listbox"
                aria-label="Lista de insumos"
                tabIndex={0}
                onKeyDown={manejarTecladoLista}
              >
                {visibles.map((insumo) => {
                  const estado = estadoStock(insumo)
                  const esActivo = seleccionado?.id === insumo.id
                  return (
                    <button
                      key={insumo.id}
                      type="button"
                      role="option"
                      aria-selected={esActivo}
                      className={`inv-fila inv-fila--${estado}${esActivo ? ' is-seleccionada' : ''}`}
                      onClick={() => {
                        setSeleccionadoId(insumo.id)
                        setInspectorAbiertoMovil(true)
                      }}
                    >
                      <div className="inv-fila-top">
                        <div className="inv-fila-ident">
                          <strong>{insumo.nombre}</strong>
                          {insumo.tipo && <span className="inv-tipo">{insumo.tipo}</span>}
                        </div>
                        <span className={`inv-badge inv-badge--${estado}`}>
                          <span className="inv-badge-punto" aria-hidden="true" />
                          {ETIQUETA_STOCK[estado]}
                        </span>
                      </div>

                      <div className="inv-fila-pie">
                        <span className="inv-stock">
                          <strong>{insumo.stock_actual.toLocaleString('es-CO')}</strong>
                          <small>{insumo.unidad_medida}</small>
                          <em>mín. {insumo.stock_minimo.toLocaleString('es-CO')}</em>
                        </span>
                        <div className="inv-barra-stock" aria-hidden="true">
                          <span
                            className={`inv-barra-nivel inv-barra-nivel--${estado}`}
                            style={{ width: `${porcentajeDeStock(insumo)}%` }}
                          />
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          {inspectorAbiertoMovil && (
            <div
              className="inv-backdrop"
              aria-hidden="true"
              onClick={() => setInspectorAbiertoMovil(false)}
            />
          )}

          <aside
            className={`inv-inspector${inspectorAbiertoMovil ? ' is-abierto-movil' : ''}`}
            aria-label={seleccionado ? `Detalle de ${seleccionado.nombre}` : 'Inspector de insumo'}
          >
            {!seleccionado || !estadoSeleccionado ? (
              <div className="inv-inspector-vacio">
                <IcBox size={24} aria-hidden="true" />
                <p>Selecciona un insumo para consultar su stock e historial.</p>
              </div>
            ) : (
              <>
                <header className="inv-inspector-hero">
                  <div className="inv-inspector-hero-top">
                    <div className="inv-inspector-top">
                      <span className="inv-hero-pill">
                        <span className={`inv-hero-dot inv-hero-dot--${estadoSeleccionado}`} aria-hidden="true" />
                        {ETIQUETA_STOCK[estadoSeleccionado]}
                      </span>
                      {!seleccionado.activo && (
                        <span className="inv-hero-pill">Inactivo</span>
                      )}
                    </div>

                    <div className="inv-inspector-controles">
                      {accionesSeleccionado.length > 0 && (
                        <MenuAcciones
                          acciones={accionesSeleccionado}
                          etiqueta={`Acciones de ${seleccionado.nombre}`}
                        />
                      )}
                      <button
                        type="button"
                        className="inv-cerrar-movil"
                        aria-label="Cerrar panel"
                        onClick={() => setInspectorAbiertoMovil(false)}
                      >
                        <IcClose size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <h2 className="inv-inspector-nombre">{seleccionado.nombre}</h2>

                  <div className="inv-inspector-tags">
                    <span className="inv-hero-tag">{seleccionado.tipo ?? 'Insumo'}</span>
                    {seleccionado.ubicacion_almacen && (
                      <span className="inv-hero-tag">
                        <IcPin size={12} aria-hidden="true" />
                        {seleccionado.ubicacion_almacen}
                      </span>
                    )}
                  </div>
                </header>

                <div className="inv-inspector-cuerpo">
                  {permisos.registrarMovimiento && seleccionado.activo && (
                    <button
                      type="button"
                      className="adm-btn adm-btn--primario inv-inspector-cta"
                      onClick={() => setMovimientoDe(seleccionado)}
                    >
                      <IcPlus size={15} aria-hidden="true" />
                      {soloSalida ? 'Registrar salida' : 'Registrar movimiento'}
                    </button>
                  )}

                  <div className="inv-stock-card">
                    <div className="inv-stock-card-fila">
                      <div>
                        <span className="inv-rotulo">Stock disponible</span>
                        <div className="inv-stock-grande">
                          <strong>{seleccionado.stock_actual.toLocaleString('es-CO')}</strong>
                          <small>{seleccionado.unidad_medida}</small>
                        </div>
                      </div>
                      <div className="inv-stock-minimo">
                        <span>Mínimo</span>
                        <strong>
                          {seleccionado.stock_minimo.toLocaleString('es-CO')} {seleccionado.unidad_medida}
                        </strong>
                      </div>
                    </div>
                    <div className="inv-barra-stock inv-barra-stock--grande" aria-hidden="true">
                      <span
                        className={`inv-barra-nivel inv-barra-nivel--${estadoSeleccionado}`}
                        style={{ width: `${porcentajeDeStock(seleccionado)}%` }}
                      />
                    </div>
                  </div>

                  <dl className="inv-ficha">
                    <div>
                      <dt>Ubicación</dt>
                      <dd>
                        {seleccionado.ubicacion_almacen ? (
                          <span className="inv-ficha-con-icono">
                            <IcPin size={13} aria-hidden="true" />
                            {seleccionado.ubicacion_almacen}
                          </span>
                        ) : (
                          <span className="inv-sin-dato">Sin definir</span>
                        )}
                      </dd>
                    </div>

                    <div>
                      <dt>Vencimiento</dt>
                      <dd>
                        {seleccionado.fecha_vencimiento?.slice(0, 10) ?? (
                          <span className="inv-sin-dato">No aplica</span>
                        )}
                      </dd>
                    </div>

                    {permisos.verCostos && (
                      <>
                        <div>
                          <dt>Precio unitario</dt>
                          <dd>
                            {seleccionado.precio_unitario_cop === null ? (
                              <span className="inv-sin-dato">—</span>
                            ) : (
                              `${cop.format(seleccionado.precio_unitario_cop)} / ${seleccionado.unidad_medida}`
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt>Valor en bodega</dt>
                          <dd>
                            {seleccionado.precio_unitario_cop === null ? (
                              <span className="inv-sin-dato">—</span>
                            ) : (
                              cop.format(seleccionado.stock_actual * seleccionado.precio_unitario_cop)
                            )}
                          </dd>
                        </div>
                      </>
                    )}
                  </dl>

                  <div className="inv-inspector-historial">
                    <div className="inv-inspector-historial-cabecera">
                      <span className="inv-rotulo">Movimientos</span>
                      {movimientosSeleccionado && (
                        <span className="inv-conteo">{movimientosSeleccionado.length}</span>
                      )}
                    </div>
                    <HistorialMovimientos
                      movimientos={movimientosSeleccionado ?? []}
                      cargando={historial.cargando && movimientosSeleccionado === undefined}
                      unidad={seleccionado.unidad_medida}
                    />
                  </div>
                </div>
              </>
            )}
          </aside>
        </div>
        </>
      )}

      {formulario.abierto && (
        <FormularioInsumo
          form={formulario.form}
          granjas={granjas}
          modoEdicion={formulario.modoEdicion}
          guardando={formulario.guardando}
          error={formulario.error}
          onCambiar={formulario.cambiar}
          onGuardar={formulario.guardar}
          onCerrar={formulario.cerrar}
        />
      )}

      {movimientoDe && (
        <FormularioMovimiento
          insumo={movimientoDe}
          tiposPermitidos={permisos.tiposMovimiento}
          onCerrar={() => setMovimientoDe(null)}
          onRegistrar={async (payload) => {
            await gestion.registrarMovimiento(movimientoDe.id, payload)
            await historial.refrescar(movimientoDe.id)
          }}
        />
      )}
    </div>
  )
}

export default InventarioPage
