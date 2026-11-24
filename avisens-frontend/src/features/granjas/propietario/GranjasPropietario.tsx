import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import type { Lote } from '@features/lotes/api/lotes'
import {
  IcAlert,
  IcArrowRight,
  IcBarn,
  IcCheck,
  IcClose,
  IcEdit,
  IcEgg,
  IcLeaf,
  IcPin,
  IcPointer,
  IcSearch,
  IcSidebar,
} from '@shared/ui/icons/icons'
import { useRefetchOnFocus } from '@shared/hooks/useRefetchOnFocus'
import { formatearFechaCalendario } from '@shared/utils/fechas'
import { getRol } from '@shared/api'
import { puedeCompletarDatos } from '@shared/auth/permisos'
import type { Granja } from '../api/granjas'
import EsqueletoGranjas from '../components/EsqueletoGranjas'
import { ModalDatosGranja, ModalDatosLote } from '../components/ModalesDatos'
import { useEstructuraGranjas } from '../hooks/useEstructuraGranjas'
import { useIndicadoresDeLotes } from '../hooks/useIndicadoresDeLotes'
import { avesActuales, diasDeVida, lecturaPorTipo } from '../model/estructura'
import {
  filtrarGalpones,
  progresoDatos,
  proximoPaso,
  resumenGalponesGranja,
  sensoresReportando,
  tarjetaGalpon,
  type DestinoPaso,
  type FiltroGalponPropietario,
  type PendienteDatos,
} from './explorador'
import ListaGalpones from './ListaGalpones'
import '@shared/ui/admin/AdminKit.css'
import '@shared/ui/movimiento.css'
import './GranjasPropietario.css'

type DatosAbiertos =
  | { tipo: 'granja'; granja: Granja }
  | { tipo: 'lote'; lote: Lote }
  | null

const decimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })

function enteroPositivo(valor: string | null): number | null {
  const numero = Number(valor)
  return Number.isSafeInteger(numero) && numero > 0 ? numero : null
}

function GranjasPropietario() {
  const navigate = useNavigate()
  const [parametros] = useSearchParams()
  const galponDirecto = enteroPositivo(parametros.get('galpon'))
  const { estructura, lineasGeneticas, cargando, error, recargar } = useEstructuraGranjas()
  const [granjaId, setGranjaId] = useState<number | null>(() => enteroPositivo(parametros.get('granjaId')))
  const [galponId, setGalponId] = useState<number | null>(null)
  const [filtro, setFiltro] = useState<FiltroGalponPropietario>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [abiertoMovil, setAbiertoMovil] = useState(false)
  const [datos, setDatos] = useState<DatosAbiertos>(null)
  const buscadorRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const pGranja = enteroPositivo(parametros.get('granjaId'))
    if (pGranja !== null) setGranjaId(pGranja)
  }, [parametros])

  useEffect(() => {
    const alPresionarTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape' && abiertoMovil) {
        setAbiertoMovil(false)
        return
      }
      if (evento.key !== '/' || evento.metaKey || evento.ctrlKey || evento.altKey) return
      const destino = evento.target as HTMLElement | null
      if (destino && (destino.tagName === 'INPUT' || destino.tagName === 'TEXTAREA' || destino.tagName === 'SELECT' || destino.isContentEditable)) {
        return
      }
      if (!buscadorRef.current) return
      evento.preventDefault()
      buscadorRef.current.focus()
    }
    window.addEventListener('keydown', alPresionarTecla)
    return () => window.removeEventListener('keydown', alPresionarTecla)
  }, [abiertoMovil])

  useRefetchOnFocus(() => {
    void recargar()
  })

  const seleccionada = estructura.find((item) => item.granja.id === granjaId) ?? estructura[0] ?? null

  const galpones = useMemo(
    () => [...(seleccionada?.galpones ?? [])].sort((a, b) => Number(b.activo) - Number(a.activo)),
    [seleccionada],
  )
  const resumen = useMemo(() => resumenGalponesGranja(galpones), [galpones])
  const galponesVisibles = useMemo(
    () => filtrarGalpones(galpones, filtro, busqueda),
    [galpones, filtro, busqueda],
  )

  const galpon = galponesVisibles.find((item) => item.id === galponId)
    ?? galponesVisibles.find((item) => item.loteEnCurso !== null)
    ?? galponesVisibles[0]
    ?? null

  const loteIds = useMemo(
    () => galpones.flatMap((item) => (item.loteEnCurso ? [item.loteEnCurso.id] : [])),
    [galpones],
  )
  const { porLote } = useIndicadoresDeLotes(loteIds)
  const indicador = galpon?.loteEnCurso ? porLote.get(galpon.loteEnCurso.id)?.ultimo ?? null : null
  const progreso = seleccionada ? progresoDatos(seleccionada) : null

  // Compatibilidad con enlaces existentes (?galpon=ID&pestana=...&vista=...)
  if (galponDirecto !== null) {
    const query = new URLSearchParams()
    const pestana = parametros.get('pestana')
    const vista = parametros.get('vista')
    if (pestana) query.set('pestana', pestana)
    if (vista) query.set('vista', vista)
    const sufijo = query.toString() ? `?${query.toString()}` : ''
    return <Navigate to={`/granjas/galpones/${galponDirecto}${sufijo}`} replace />
  }

  function abrirPendiente(pendiente: PendienteDatos) {
    if (!seleccionada) return
    if (pendiente.tipo === 'granja') setDatos({ tipo: 'granja', granja: seleccionada.granja })
    else setDatos({ tipo: 'lote', lote: pendiente.lote })
  }

  function abrirFicha(id: number, pestanaDestino?: string) {
    const query = pestanaDestino ? `?pestana=${pestanaDestino}` : ''
    navigate(`/granjas/galpones/${id}${query}`)
  }

  function irADestino(destino: DestinoPaso) {
    if (!galpon) return
    if (destino.tipo === 'datos-lote') {
      setDatos({ tipo: 'lote', lote: destino.lote })
    } else if (destino.tipo === 'ruta') {
      if (destino.ruta.startsWith('/bitacora')) abrirFicha(galpon.id, 'bitacora')
      else if (destino.ruta.startsWith('/alertas')) abrirFicha(galpon.id, 'alertas')
      else if (destino.ruta.startsWith('/monitoreo/actuadores')) abrirFicha(galpon.id, 'actuadores')
      else if (destino.ruta.startsWith('/monitoreo')) abrirFicha(galpon.id, 'ambiente')
      else navigate(destino.ruta)
    }
  }

  function elegirGalpon(id: number) {
    setGalponId(id)
    setAbiertoMovil(true)
  }

  function alternarFiltro(nuevo: FiltroGalponPropietario) {
    setFiltro((actual) => (actual === nuevo && nuevo !== 'todos' ? 'todos' : nuevo))
  }

  if (cargando && estructura.length === 0) {
    return <div className="page-container gp-page"><EsqueletoGranjas /></div>
  }

  if (!seleccionada) {
    return (
      <div className="page-container gp-page">
        {error && (
          <div className="adm-alerta" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => void recargar()}>Reintentar</button>
          </div>
        )}
        <div className="gp-vacio">
          <IcLeaf size={28} aria-hidden="true" />
          <h1>Aún no tienes granjas asignadas</h1>
          <p>Cuando el administrador registre tu granja, aquí verás sus galpones, lotes y sensores.</p>
        </div>
      </div>
    )
  }

  const { granja } = seleccionada
  const ubicacion = [granja.municipio, granja.departamento].filter(Boolean).join(', ')
  const puedeEditar = puedeCompletarDatos(getRol())

  const tarjetaActiva = galpon ? tarjetaGalpon(galpon) : null
  const sensoresActivo = galpon ? sensoresReportando(galpon) : null
  const paso = galpon ? proximoPaso(galpon, indicador) : null
  const lote = galpon?.loteEnCurso ?? null
  const temperatura = galpon ? lecturaPorTipo(galpon.sensores, 'temp') : null
  const humedad = galpon ? lecturaPorTipo(galpon.sensores, 'hum') : null
  const vivas = lote ? avesActuales(lote.cantidad_inicial, indicador?.mortalidadAcumuladaPct ?? null) : 0

  return (
    <div className="page-container gp-page adm-page">
      <header className="gp-cabecera">
        <div className="gp-cabecera-info">
          <span className="adm-eyebrow">
            <span className="adm-eyebrow-punto" aria-hidden="true" />
            Mi operación · Granja
          </span>
          <div className="gp-cabecera-titulo-fila">
            <h1 className="gp-titulo">{granja.nombre}</h1>
            <span className={`gp-pill-estado${granja.activa ? ' is-activa' : ''}`}>
              <span className="gp-pill-punto" aria-hidden="true" />
              {granja.activa ? 'Activa' : 'Inactiva'}
            </span>
            {progreso && progreso.pendientes.length === 0 && (
              <span className="gp-pill-datos">
                <IcCheck size={12} aria-hidden="true" /> Datos completos
              </span>
            )}
          </div>
          <p className="gp-subtitulo">
            <IcPin size={13} aria-hidden="true" />
            <span>{ubicacion || 'Ubicación pendiente'}</span>
            <span aria-hidden="true">·</span>
            <span>Registrada el {formatearFechaCalendario(granja.fecha_creacion)}</span>
          </p>
        </div>

        <div className="gp-cabecera-acciones">
          {progreso && progreso.pendientes.length > 0 ? (
            <button
              type="button"
              className="adm-btn adm-btn--primario"
              onClick={() => abrirPendiente(progreso.pendientes[0])}
            >
              Completar datos ({progreso.completos}/{progreso.total})
              <IcArrowRight size={15} aria-hidden="true" />
            </button>
          ) : puedeEditar ? (
            <button
              type="button"
              className="adm-btn adm-btn--secundario"
              onClick={() => setDatos({ tipo: 'granja', granja })}
            >
              <IcEdit size={15} aria-hidden="true" />
              Datos de granja
            </button>
          ) : null}
        </div>
      </header>

      {estructura.length > 1 && (
        <div className="gp-granjas" role="tablist" aria-label="Tus granjas">
          {estructura.map((item) => (
            <button
              key={item.granja.id}
              type="button"
              role="tab"
              aria-selected={item.granja.id === granja.id}
              className={`gp-granja-chip${item.granja.id === granja.id ? ' is-activa' : ''}`}
              onClick={() => {
                setGranjaId(item.granja.id)
                setGalponId(null)
                setFiltro('todos')
                setBusqueda('')
                setAbiertoMovil(false)
              }}
            >
              <IcLeaf size={14} aria-hidden="true" />
              <span>{item.granja.nombre}</span>
              <span className="gp-granja-chip-cuenta">{item.galpones.length}</span>
            </button>
          ))}
        </div>
      )}

      <div className="gp-indicadores" role="group" aria-label={`Resumen de ${granja.nombre}`}>
        <button
          type="button"
          className={`gp-indicador gp-indicador--primario${filtro === 'todos' ? ' is-activo' : ''}`}
          aria-pressed={filtro === 'todos'}
          onClick={() => setFiltro('todos')}
        >
          <span className="gp-indicador-cab">
            <span className="gp-indicador-etiqueta">Galpones</span>
            <span className="gp-indicador-icono" aria-hidden="true"><IcBarn size={15} /></span>
          </span>
          <strong className="gp-indicador-valor">{resumen.total}</strong>
          <span className="gp-indicador-nota">
            {resumen.sensoresTotal > 0
              ? `${resumen.sensoresActivos} de ${resumen.sensoresTotal} sensores activos`
              : 'Sin sensores instalados'}
          </span>
        </button>

        <button
          type="button"
          className={`gp-indicador gp-indicador--ok${filtro === 'con_lote' ? ' is-activo' : ''}`}
          aria-pressed={filtro === 'con_lote'}
          onClick={() => alternarFiltro('con_lote')}
        >
          <span className="gp-indicador-cab">
            <span className="gp-indicador-etiqueta">Con lote activo</span>
            <span className="gp-indicador-icono" aria-hidden="true"><IcEgg size={15} /></span>
          </span>
          <strong className="gp-indicador-valor">{resumen.conLote}</strong>
          <span className="gp-indicador-nota">
            {seleccionada.avesAlojadas.toLocaleString('es-CO')} aves alojadas
          </span>
        </button>

        <button
          type="button"
          className={`gp-indicador gp-indicador--${resumen.conAlertas > 0 ? 'alerta' : 'ok'}${filtro === 'alertas' ? ' is-activo' : ''}`}
          aria-pressed={filtro === 'alertas'}
          onClick={() => alternarFiltro('alertas')}
        >
          <span className="gp-indicador-cab">
            <span className="gp-indicador-etiqueta">Con atención / alerta</span>
            <span className="gp-indicador-icono" aria-hidden="true">
              {resumen.conAlertas > 0 ? <IcAlert size={15} /> : <IcCheck size={15} />}
            </span>
          </span>
          <strong className="gp-indicador-valor">{resumen.conAlertas}</strong>
          <span className="gp-indicador-nota">
            {seleccionada.alertasAbiertas === 0
              ? 'Sin alertas abiertas'
              : seleccionada.alertasAbiertas === 1
                ? '1 alerta abierta'
                : `${seleccionada.alertasAbiertas} alertas abiertas`}
          </span>
        </button>

        <button
          type="button"
          className={`gp-indicador gp-indicador--info${filtro === 'disponibles' ? ' is-activo' : ''}`}
          aria-pressed={filtro === 'disponibles'}
          onClick={() => alternarFiltro('disponibles')}
        >
          <span className="gp-indicador-cab">
            <span className="gp-indicador-etiqueta">Disponibles</span>
            <span className="gp-indicador-icono" aria-hidden="true"><IcCheck size={15} /></span>
          </span>
          <strong className="gp-indicador-valor">{resumen.disponibles}</strong>
          <span className="gp-indicador-nota">Sin lote en curso</span>
        </button>
      </div>

      {error && (
        <div className="adm-alerta" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void recargar()}>Reintentar</button>
        </div>
      )}

      <div id="gp-galpones" className="gp-layout gp-layout--inspector">
        <div className="gp-columna-principal">
          <div className="gp-barra-lista">
            <div className="gp-columna-cabecera">
              <h2>Tus galpones</h2>
              <span className="gp-conteo">
                {galponesVisibles.length === galpones.length
                  ? galpones.length
                  : `${galponesVisibles.length} / ${galpones.length}`}
              </span>
            </div>

            {galpones.length > 1 && (
              <label className="gp-buscador">
                <IcSearch size={15} aria-hidden="true" />
                <input
                  ref={buscadorRef}
                  type="search"
                  value={busqueda}
                  onChange={(evento) => setBusqueda(evento.target.value)}
                  placeholder="Buscar galpón o lote… (/)"
                  aria-label="Buscar galpón o lote"
                />
                {busqueda && (
                  <button
                    type="button"
                    className="gp-buscador-limpiar"
                    onClick={() => setBusqueda('')}
                    aria-label="Limpiar búsqueda"
                  >
                    <IcClose size={13} aria-hidden="true" />
                  </button>
                )}
              </label>
            )}
          </div>

          <ListaGalpones
            galpones={galponesVisibles}
            totalSinFiltro={galpones.length}
            galponId={galpon?.id ?? null}
            onSeleccionar={elegirGalpon}
            onLimpiarFiltros={() => { setFiltro('todos'); setBusqueda('') }}
          />
        </div>

        {abiertoMovil && (
          <div
            className="gp-panel-fondo"
            aria-hidden="true"
            onClick={() => setAbiertoMovil(false)}
          />
        )}

        <aside
          className={`gp-inspector${abiertoMovil ? ' is-abierto-movil' : ''}`}
          aria-labelledby="gp-inspector-titulo"
        >
          <div className="gp-detalle-barra">
            <IcSidebar size={15} aria-hidden="true" />
            <span>Galpón seleccionado</span>
            {tarjetaActiva && (
              <span className={`gp-estado gp-estado--${tarjetaActiva.estado} gp-estado--barra`}>
                {tarjetaActiva.etiquetaEstado}
              </span>
            )}
            <button
              type="button"
              className="gp-detalle-cerrar"
              onClick={() => setAbiertoMovil(false)}
              aria-label="Cerrar panel del galpón"
            >
              <IcClose size={17} aria-hidden="true" />
            </button>
          </div>

          {galpon && tarjetaActiva && paso ? (
            <div className="gp-inspector-cuerpo" key={galpon.id}>
              <div className="gp-inspector-cabecera">
                <h2 id="gp-inspector-titulo">{galpon.nombre}</h2>
                <p className="gp-inspector-sub">
                  <code>{galpon.codigo}</code>
                  <span aria-hidden="true">·</span>
                  <span>{tarjetaActiva.lote ?? 'Sin lote en curso'}</span>
                </p>
              </div>

              <dl className="gp-inspector-metricas">
                <div>
                  <dt>Día de vida</dt>
                  <dd>{lote ? String(diasDeVida(lote.fecha_ingreso)) : '—'}</dd>
                </div>
                <div>
                  <dt>Aves</dt>
                  <dd>{lote ? vivas.toLocaleString('es-CO') : '—'}</dd>
                </div>
                <div>
                  <dt>Temperatura</dt>
                  <dd>{temperatura?.valor != null ? `${decimal.format(temperatura.valor)} ${temperatura.unidad}` : '—'}</dd>
                </div>
                <div>
                  <dt>Humedad</dt>
                  <dd>{humedad?.valor != null ? `${decimal.format(humedad.valor)} ${humedad.unidad}` : '—'}</dd>
                </div>
              </dl>

              {tarjetaActiva.ocupacion !== null && (
                <div className="gp-inspector-ocupacion">
                  <div className="gp-inspector-ocupacion-fila">
                    <span>Ocupación del galpón</span>
                    <strong>{Math.round(tarjetaActiva.ocupacion)} %</strong>
                  </div>
                  <div className="gp-ocupacion-barra" aria-hidden="true">
                    <span style={{ width: `${Math.min(100, tarjetaActiva.ocupacion)}%` }} />
                  </div>
                  {galpon.capacidadAves ? (
                    <small>Capacidad total: {galpon.capacidadAves.toLocaleString('es-CO')} aves</small>
                  ) : null}
                </div>
              )}

              <div className={`gp-inspector-paso gp-paso--${paso.tono}`}>
                <span className="gp-paso-rotulo">Siguiente paso</span>
                <strong>{paso.titulo}</strong>
                <p>{paso.detalle}</p>
                {paso.accion && (
                  <button
                    type="button"
                    className="gp-inspector-paso-link"
                    onClick={() => irADestino(paso.destino)}
                  >
                    {paso.accion} <IcArrowRight size={13} aria-hidden="true" />
                  </button>
                )}
              </div>

              <div className="gp-inspector-sensores">
                <span>Sensores</span>
                <strong>
                  {sensoresActivo && sensoresActivo.total > 0
                    ? `${sensoresActivo.reportando} de ${sensoresActivo.total} reportando`
                    : 'Sin sensores instalados'}
                </strong>
              </div>

              <div className="gp-inspector-pie">
                <button
                  type="button"
                  className="adm-btn adm-btn--primario gp-inspector-cta"
                  onClick={() => abrirFicha(galpon.id)}
                >
                  Abrir ficha del galpón
                  <IcArrowRight size={15} aria-hidden="true" />
                </button>
              </div>
            </div>
          ) : (
            <div className="gp-detalle-vacio">
              <IcPointer size={24} aria-hidden="true" />
              <p>Elige un galpón de la lista para ver su resumen y abrir su ficha completa.</p>
            </div>
          )}
        </aside>
      </div>

      {datos?.tipo === 'granja' && (
        <ModalDatosGranja granja={datos.granja} onCerrar={() => setDatos(null)} onGuardado={recargar} />
      )}
      {datos?.tipo === 'lote' && (
        <ModalDatosLote
          lote={datos.lote}
          lineasGeneticas={lineasGeneticas}
          onCerrar={() => setDatos(null)}
          onGuardado={recargar}
        />
      )}
    </div>
  )
}

export default GranjasPropietario
