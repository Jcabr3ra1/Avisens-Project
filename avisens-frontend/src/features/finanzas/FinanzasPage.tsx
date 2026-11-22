import { confirmarAccion } from '@shared/ui/ConfirmarAccion/gestorConfirmacion'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import CabeceraAdmin from '@shared/ui/admin/CabeceraAdmin'
import { IcChart, IcCoin, IcPlus, IcSearch } from '@shared/ui/icons/icons'
import { useRefetchOnFocus } from '@shared/hooks/useRefetchOnFocus'
import { mensajeDeError } from '@shared/utils/errores'
import { fechaDeHoy } from '@shared/utils/fechas'
import FormularioMovimiento from './components/FormularioMovimiento'
import ReporteCiclo from './components/ReporteCiclo'
import { useMovimientosFinancieros } from './hooks/useMovimientosFinancieros'
import {
  errorDeFormulario,
  fechaCorta,
  filtrarMovimientos,
  formularioDesde,
  formularioVacio,
  payloadDesdeFormulario,
  type FiltroTipoMovimiento,
  type FormularioMovimiento as DatosMovimiento,
} from './model/movimiento'
import type { MovimientoFinanciero } from './api/movimientos-financieros'
import '@shared/ui/admin/AdminKit.css'
import './FinanzasPage.css'

type Vista = 'movimientos' | 'reporte'
type TipoPresentado = Exclude<FiltroTipoMovimiento, 'todos'> | 'sin-tipo'

function cop(valor: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor)
}

function presentarTipo(tipo: MovimientoFinanciero['tipo']): {
  clase: TipoPresentado
  etiqueta: string
  signo: string
} {
  if (tipo === 'ingreso') return { clase: 'ingreso', etiqueta: 'Ingreso', signo: '+' }
  if (tipo === 'egreso') return { clase: 'egreso', etiqueta: 'Egreso', signo: '−' }
  return { clase: 'sin-tipo', etiqueta: 'Sin tipo', signo: '' }
}

function FinanzasPage() {
  const datos = useMovimientosFinancieros()
  const { movimientos, cargando, error } = datos
  const cargar = datos.recargar
  const [vista, setVista] = useState<Vista>('movimientos')
  useRefetchOnFocus(cargar)
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipoMovimiento>('todos')
  const [filtroLote, setFiltroLote] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [form, setForm] = useState<DatosMovimiento | null>(null)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [errorFormulario, setErrorFormulario] = useState('')
  const buscadorRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function manejarTeclaGlobal(evento: KeyboardEvent) {
      if (vista !== 'movimientos') return
      if (evento.key !== '/' || evento.ctrlKey || evento.metaKey || evento.altKey) return
      const tag = (evento.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      evento.preventDefault()
      buscadorRef.current?.focus()
    }
    window.addEventListener('keydown', manejarTeclaGlobal)
    return () => window.removeEventListener('keydown', manejarTeclaGlobal)
  }, [vista])

  function abrirNuevo() {
    setEditandoId(null)
    setErrorFormulario('')
    setForm(formularioVacio(fechaDeHoy()))
  }

  function abrirEdicion(movimiento: MovimientoFinanciero) {
    setEditandoId(movimiento.id)
    setErrorFormulario('')
    setForm(formularioDesde(movimiento))
  }

  function cambiarCampo<K extends keyof DatosMovimiento>(campo: K, valor: DatosMovimiento[K]) {
    setForm((actual) => (actual === null ? actual : { ...actual, [campo]: valor }))
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (form === null) return
    const problema = errorDeFormulario(form)
    if (problema) {
      setErrorFormulario(problema)
      return
    }
    setGuardando(true)
    setErrorFormulario('')
    try {
      const payload = payloadDesdeFormulario(form)
      if (editandoId === null) {
        await datos.crear(payload)
        toast.success('Movimiento registrado')
      } else {
        await datos.actualizar(editandoId, payload)
        toast.success('Movimiento actualizado')
      }
      setForm(null)
      setEditandoId(null)
    } catch (problemaAlGuardar) {
      setErrorFormulario(mensajeDeError(problemaAlGuardar, 'No se pudo guardar el movimiento.'))
    } finally {
      setGuardando(false)
    }
  }

  async function borrar(movimiento: MovimientoFinanciero) {
    if (!(await confirmarAccion({
      titulo: '¿Eliminar este movimiento?',
      entidad: cop(Number(movimiento.valor_cop)),
      descripcion: 'Esta acción no se puede deshacer.',
      textoConfirmar: 'Eliminar movimiento',
      tono: 'peligro',
    }))) return
    void datos.eliminar(movimiento.id)
      .then(() => toast.success('Movimiento eliminado'))
      .catch((problema) => {
        toast.error(mensajeDeError(problema, 'No se pudo eliminar el movimiento.'))
      })
  }

  const lotes = useMemo(() => {
    const porId = new Map<number, string>()
    movimientos.forEach((movimiento) => {
      if (movimiento.lote) porId.set(movimiento.lote.id, movimiento.lote.codigo)
    })
    return [...porId.entries()].sort((a, b) => a[1].localeCompare(b[1], 'es'))
  }, [movimientos])

  // Totales del alcance actual (lote + búsqueda) para que los KPIs de Ingresos
  // y Egresos no se pongan en $0 al hacer clic en uno de los dos filtros.
  const baseAlcance = useMemo(
    () => filtrarMovimientos(movimientos, { tipo: 'todos', loteId: filtroLote, busqueda }),
    [movimientos, filtroLote, busqueda],
  )
  const visibles = useMemo(
    () => filtrarMovimientos(movimientos, { tipo: filtroTipo, loteId: filtroLote, busqueda }),
    [movimientos, filtroTipo, filtroLote, busqueda],
  )

  const totalIngresos = baseAlcance
    .filter((movimiento) => movimiento.tipo === 'ingreso')
    .reduce((total, movimiento) => total + Number(movimiento.valor_cop), 0)
  const totalEgresos = baseAlcance
    .filter((movimiento) => movimiento.tipo === 'egreso')
    .reduce((total, movimiento) => total + Number(movimiento.valor_cop), 0)
  const conteoIngresos = baseAlcance.filter((movimiento) => movimiento.tipo === 'ingreso').length
  const conteoEgresos = baseAlcance.filter((movimiento) => movimiento.tipo === 'egreso').length
  const balance = totalIngresos - totalEgresos
  const hayFiltrosActivos = filtroTipo !== 'todos' || filtroLote !== 'todos' || busqueda.trim() !== ''

  function limpiarFiltros() {
    setFiltroTipo('todos')
    setFiltroLote('todos')
    setBusqueda('')
  }

  return (
    <div className="page-container fin-page adm-page">
      <CabeceraAdmin
        eyebrow="Control financiero"
        titulo="Finanzas"
        subtitulo="Ingresos, egresos y rentabilidad real de tus granjas y lotes."
        acciones={(
          <button type="button" className="adm-btn adm-btn--primario" onClick={abrirNuevo}>
            <IcPlus size={15} aria-hidden="true" />
            Nuevo movimiento
          </button>
        )}
      />

      <div className="fin-tabs rc-no-imprimir" role="tablist" aria-label="Vistas de finanzas">
        <button
          type="button"
          role="tab"
          aria-selected={vista === 'movimientos'}
          className={`fin-tab${vista === 'movimientos' ? ' is-activa' : ''}`}
          onClick={() => setVista('movimientos')}
        >
          <IcCoin size={15} aria-hidden="true" />
          <span>Movimientos</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={vista === 'reporte'}
          className={`fin-tab${vista === 'reporte' ? ' is-activa' : ''}`}
          onClick={() => setVista('reporte')}
        >
          <IcChart size={15} aria-hidden="true" />
          <span>Reporte por ciclo</span>
        </button>
      </div>

      {vista === 'reporte' ? (
        <ReporteCiclo lotes={datos.lotes} granjas={datos.granjas} />
      ) : (
        <>
          <div className="fin-kpis" role="group" aria-label="Resumen financiero">
            <button
              type="button"
              className={`fin-kpi${filtroTipo === 'todos' ? ' is-activo' : ''}`}
              aria-pressed={filtroTipo === 'todos'}
              onClick={() => setFiltroTipo('todos')}
            >
              <span className="fin-kpi-etiqueta">Movimientos</span>
              <strong>{baseAlcance.length}</strong>
              <small>{filtroLote === 'todos' ? 'En todas las granjas' : 'En el lote filtrado'}</small>
            </button>

            <button
              type="button"
              className={`fin-kpi${filtroTipo === 'ingreso' ? ' is-activo' : ''}`}
              aria-pressed={filtroTipo === 'ingreso'}
              onClick={() => setFiltroTipo('ingreso')}
            >
              <span className="fin-kpi-etiqueta">Ingresos</span>
              <strong className="fin-kpi--ok">{cop(totalIngresos)}</strong>
              <small>{conteoIngresos === 1 ? '1 registro' : `${conteoIngresos} registros`}</small>
            </button>

            <button
              type="button"
              className={`fin-kpi${filtroTipo === 'egreso' ? ' is-activo' : ''}`}
              aria-pressed={filtroTipo === 'egreso'}
              onClick={() => setFiltroTipo('egreso')}
            >
              <span className="fin-kpi-etiqueta">Egresos</span>
              <strong className="fin-kpi--peligro">{cop(totalEgresos)}</strong>
              <small>{conteoEgresos === 1 ? '1 registro' : `${conteoEgresos} registros`}</small>
            </button>

            <div className="fin-kpi fin-kpi--estatico">
              <span className="fin-kpi-etiqueta">Balance</span>
              <strong className={balance < 0 ? 'fin-kpi--peligro' : balance > 0 ? 'fin-kpi--ok' : undefined}>
                {cop(balance)}
              </strong>
              <small>{balance < 0 ? 'Déficit en el alcance' : balance > 0 ? 'Superávit en el alcance' : 'En equilibrio'}</small>
            </div>
          </div>

          {error && (
            <div className="adm-alerta" role="alert">
              <span>{error}</span>
              <button type="button" onClick={() => void cargar()}>Reintentar</button>
            </div>
          )}

          <section className="fin-tabla-card" aria-label="Movimientos financieros">
            <div className="fin-filtros">
              <div className="fin-buscador">
                <IcSearch size={15} aria-hidden="true" />
                <input
                  ref={buscadorRef}
                  type="search"
                  value={busqueda}
                  onChange={(evento) => setBusqueda(evento.target.value)}
                  placeholder="Buscar por descripción, categoría, granja, lote o factura"
                  aria-label="Buscar movimientos financieros"
                />
                {!busqueda && <kbd className="fin-atajo" aria-hidden="true">/</kbd>}
              </div>

              <div className="fin-filtro-grupo" role="group" aria-label="Filtrar por tipo de movimiento">
                {(['todos', 'ingreso', 'egreso'] as const).map((tipo) => (
                  <button
                    key={tipo}
                    type="button"
                    className="fin-filtro-btn"
                    aria-pressed={filtroTipo === tipo}
                    onClick={() => setFiltroTipo(tipo)}
                  >
                    {tipo === 'todos' ? 'Todos' : tipo === 'ingreso' ? 'Ingresos' : 'Egresos'}
                  </button>
                ))}
              </div>

              <label className="fin-filtro-lote">
                <span className="sr-only">Filtrar por lote</span>
                <select className="fin-select" value={filtroLote} onChange={(evento) => setFiltroLote(evento.target.value)}>
                  <option value="todos">Todos los lotes</option>
                  {lotes.map(([id, codigo]) => <option key={id} value={id}>{codigo}</option>)}
                </select>
              </label>

              {hayFiltrosActivos && (
                <button type="button" className="fin-limpiar" onClick={limpiarFiltros}>
                  Limpiar
                </button>
              )}

              <span className="fin-conteo">
                {visibles.length === movimientos.length ? `${movimientos.length}` : `${visibles.length} de ${movimientos.length}`}
              </span>
            </div>

            {cargando ? (
              <p className="fin-vacio" role="status">Cargando movimientos financieros…</p>
            ) : movimientos.length === 0 ? (
              <div className="fin-vacio">
                <h2>Aún no hay movimientos financieros</h2>
                <p>Los ingresos y egresos registrados en la operación aparecerán aquí.</p>
                <button type="button" className="adm-btn adm-btn--primario" onClick={abrirNuevo}>
                  <IcPlus size={15} aria-hidden="true" />
                  Registrar el primero
                </button>
              </div>
            ) : visibles.length === 0 ? (
              <div className="fin-vacio">
                <h2>No hay resultados para estos filtros</h2>
                <p>Prueba cambiando el tipo, el lote o el texto de búsqueda.</p>
                <button type="button" className="adm-btn adm-btn--secundario" onClick={limpiarFiltros}>
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <div className="fin-tabla-scroll">
                <table className="fin-tabla">
                  <thead>
                    <tr>
                      <th scope="col">Fecha</th>
                      <th scope="col">Tipo</th>
                      <th scope="col">Categoría</th>
                      <th scope="col">Descripción</th>
                      <th scope="col">Ubicación</th>
                      <th scope="col" className="fin-col-monto">Monto</th>
                      <th scope="col"><span className="sr-only">Acciones</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibles.map((movimiento) => {
                      const tipo = presentarTipo(movimiento.tipo)
                      return (
                        <tr key={movimiento.id}>
                          <td className="fin-fecha">{fechaCorta(movimiento.fecha)}</td>
                          <td>
                            <span className={`fin-tipo-badge fin-tipo-badge--${tipo.clase}`}>
                              {tipo.etiqueta}
                            </span>
                          </td>
                          <td><span className="fin-categoria">{movimiento.categoria.nombre}</span></td>
                          <td className="fin-desc">
                            <span>{movimiento.descripcion || 'Sin descripción'}</span>
                            {movimiento.numero_factura && (
                              <small className="fin-factura">
                                Fac: {movimiento.numero_factura}
                              </small>
                            )}
                          </td>
                          <td>
                            <strong>{movimiento.lote?.codigo || movimiento.granja.nombre}</strong>
                            {movimiento.lote && <span className="fin-ubicacion-secundaria">{movimiento.granja.nombre}</span>}
                          </td>
                          <td className={`fin-monto fin-monto--${tipo.clase}`}>
                            {tipo.signo}{cop(Number(movimiento.valor_cop))}
                          </td>
                          <td className="fin-acciones">
                            <button type="button" className="adm-btn-fila" onClick={() => abrirEdicion(movimiento)}>
                              Editar
                            </button>
                            <button type="button" className="adm-btn-fila adm-btn-fila--peligro" onClick={() => borrar(movimiento)}>
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {form !== null && (
        <FormularioMovimiento
          form={form}
          categorias={datos.categorias}
          granjas={datos.granjas}
          lotes={datos.lotes}
          modoEdicion={editandoId !== null}
          guardando={guardando}
          error={errorFormulario}
          onCambiar={cambiarCampo}
          onGuardar={(evento) => void guardar(evento)}
          onCerrar={() => { setForm(null); setEditandoId(null) }}
        />
      )}
    </div>
  )
}

export default FinanzasPage
