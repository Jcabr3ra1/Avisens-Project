import { useMemo, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import CabeceraAdmin from '@shared/ui/admin/CabeceraAdmin'
import TarjetasResumen, { type Stat } from '@shared/ui/admin/TarjetasResumen'
import { IcArrowUp, IcCoin, IcRefresh } from '@shared/ui/icons/icons'
import { mensajeDeError } from '@shared/utils/errores'
import { fechaDeHoy } from '@shared/utils/fechas'
import FormularioMovimiento from './components/FormularioMovimiento'
import { useMovimientosFinancieros } from './hooks/useMovimientosFinancieros'
import {
  errorDeFormulario,
  formularioDesde,
  formularioVacio,
  payloadDesdeFormulario,
  type FormularioMovimiento as DatosMovimiento,
} from './model/movimiento'
import type { MovimientoFinanciero } from './api/movimientos-financieros'
import '@shared/ui/admin/AdminKit.css'
import './FinanzasPage.css'

type FiltroTipo = 'todos' | 'ingreso' | 'egreso'
type TipoPresentado = Exclude<FiltroTipo, 'todos'> | 'sin-tipo'

function cop(valor: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor)
}

function fechaCorta(fecha: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(fecha))
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
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos')
  const [filtroLote, setFiltroLote] = useState('todos')
  const [form, setForm] = useState<DatosMovimiento | null>(null)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [errorFormulario, setErrorFormulario] = useState('')

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

  function borrar(movimiento: MovimientoFinanciero) {
    if (!window.confirm(
      `¿Eliminar este movimiento de ${cop(Number(movimiento.valor_cop))}? Esta acción no se puede deshacer.`,
    )) return
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

  const visibles = useMemo(() => movimientos.filter((movimiento) => {
    const coincideTipo = filtroTipo === 'todos' || movimiento.tipo === filtroTipo
    const coincideLote = filtroLote === 'todos' || movimiento.lote?.id === Number(filtroLote)
    return coincideTipo && coincideLote
  }), [filtroLote, filtroTipo, movimientos])

  const totalIngresos = visibles
    .filter((movimiento) => movimiento.tipo === 'ingreso')
    .reduce((total, movimiento) => total + Number(movimiento.valor_cop), 0)
  const totalEgresos = visibles
    .filter((movimiento) => movimiento.tipo === 'egreso')
    .reduce((total, movimiento) => total + Number(movimiento.valor_cop), 0)
  const balance = totalIngresos - totalEgresos

  const stats: Stat[] = [
    { label: 'Ingresos', valor: cop(totalIngresos), icono: <IcArrowUp size={18} />, tono: 'ok' },
    { label: 'Egresos', valor: cop(totalEgresos), icono: <IcArrowUp size={18} />, tono: 'peligro' },
    {
      label: 'Balance',
      valor: cop(balance),
      icono: <IcCoin size={18} />,
      tono: balance < 0 ? 'peligro' : 'info',
    },
  ]

  return (
    <div className="page-container fin-page adm-page">
      <CabeceraAdmin
        eyebrow="Control financiero"
        titulo="Finanzas"
        subtitulo="Consulta los ingresos y egresos reales registrados para las granjas y sus lotes."
        acciones={(
          <>
            <button type="button" className="adm-btn adm-btn--secundario" onClick={() => void cargar()} disabled={cargando}>
              <IcRefresh size={16} aria-hidden="true" />
              {cargando ? 'Actualizando…' : 'Actualizar'}
            </button>
            <button type="button" className="adm-btn adm-btn--primario" onClick={abrirNuevo}>
              Nuevo movimiento
            </button>
          </>
        )}
      />

      <TarjetasResumen stats={stats} etiqueta="Resumen financiero" />

      {error && (
        <div className="adm-alerta" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void cargar()}>Reintentar</button>
        </div>
      )}

      <section className="fin-tabla-card adm-panel" aria-label="Movimientos financieros">
        <div className="fin-filtros">
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
            <span>Lote</span>
            <select className="fin-select" value={filtroLote} onChange={(evento) => setFiltroLote(evento.target.value)}>
              <option value="todos">Todos los lotes</option>
              {lotes.map(([id, codigo]) => <option key={id} value={id}>{codigo}</option>)}
            </select>
          </label>

          <span className="adm-conteo">{visibles.length === movimientos.length ? movimientos.length : `${visibles.length} de ${movimientos.length}`}</span>
        </div>

        {cargando ? (
          <p className="fin-vacio" role="status">Cargando movimientos financieros…</p>
        ) : movimientos.length === 0 ? (
          <div className="fin-vacio">
            <h2>Aún no hay movimientos financieros</h2>
            <p>Los ingresos y egresos registrados en la operación aparecerán aquí.</p>
            <button type="button" className="adm-btn adm-btn--primario" onClick={abrirNuevo}>
              Registrar el primero
            </button>
          </div>
        ) : visibles.length === 0 ? (
          <div className="fin-vacio">
            <h2>No hay resultados para estos filtros</h2>
            <p>Prueba seleccionando otro tipo de movimiento o lote.</p>
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
                  <th scope="col">Monto</th>
                  <th scope="col"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((movimiento) => {
                  const tipo = presentarTipo(movimiento.tipo)
                  return (
                    <tr key={movimiento.id}>
                      <td>{fechaCorta(movimiento.fecha)}</td>
                      <td>
                        <span className={`fin-tipo-badge fin-tipo-badge--${tipo.clase}`}>
                          {tipo.etiqueta}
                        </span>
                      </td>
                      <td><span className="fin-categoria">{movimiento.categoria.nombre}</span></td>
                      <td className="fin-desc">{movimiento.descripcion || 'Sin descripción'}</td>
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
